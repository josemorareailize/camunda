/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH under
 * one or more contributor license agreements. See the NOTICE file distributed
 * with this work for additional information regarding copyright ownership.
 * Licensed under the Camunda License 1.0. You may not use this file
 * except in compliance with the Camunda License 1.0.
 */
package io.camunda.zeebe.engine.processing.batchoperation.scheduler;

import com.google.common.base.Strings;
import io.camunda.zeebe.engine.EngineConfiguration;
import io.camunda.zeebe.engine.metrics.BatchOperationMetrics;
import io.camunda.zeebe.engine.processing.batchoperation.itemprovider.ItemProviderFactory;
import io.camunda.zeebe.engine.processing.batchoperation.scheduler.BatchOperationRetryHandler.RetryContext;
import io.camunda.zeebe.engine.processing.batchoperation.scheduler.BatchOperationRetryHandler.RetryResult.Failure;
import io.camunda.zeebe.engine.processing.batchoperation.scheduler.BatchOperationRetryHandler.RetryResult.Retry;
import io.camunda.zeebe.engine.processing.batchoperation.scheduler.BatchOperationRetryHandler.RetryResult.Success;
import io.camunda.zeebe.engine.state.batchoperation.PersistedBatchOperation;
import io.camunda.zeebe.engine.state.immutable.BatchOperationState;
import io.camunda.zeebe.engine.state.immutable.ScheduledTaskState;
import io.camunda.zeebe.protocol.record.value.BatchOperationErrorType;
import io.camunda.zeebe.stream.api.ReadonlyStreamProcessorContext;
import io.camunda.zeebe.stream.api.StreamProcessorLifecycleAware;
import io.camunda.zeebe.stream.api.scheduling.AsyncTaskGroup;
import io.camunda.zeebe.stream.api.scheduling.TaskResult;
import io.camunda.zeebe.stream.api.scheduling.TaskResultBuilder;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class BatchOperationExecutionScheduler implements StreamProcessorLifecycleAware {
  private static final Logger LOG = LoggerFactory.getLogger(BatchOperationExecutionScheduler.class);

  private final Duration initialPollingInterval;
  private final BatchOperationState batchOperationState;
  private final BatchOperationInitializer batchOperationInitializer;
  private final BatchOperationRetryHandler retryHandler;
  private final AtomicBoolean executing = new AtomicBoolean(false);
  private final AtomicReference<ExecutionLoopState> initializing = new AtomicReference<>();

  private ReadonlyStreamProcessorContext processingContext;

  public BatchOperationExecutionScheduler(
      final Supplier<ScheduledTaskState> scheduledTaskStateFactory,
      final ItemProviderFactory itemProviderFactory,
      final EngineConfiguration engineConfiguration,
      final int partitionId,
      final BatchOperationMetrics metrics) {

    batchOperationState = scheduledTaskStateFactory.get().getBatchOperationState();
    initialPollingInterval = engineConfiguration.getBatchOperationSchedulerInterval();
    batchOperationInitializer =
        new BatchOperationInitializer(
            itemProviderFactory,
            new BatchOperationPageProcessor(engineConfiguration.getBatchOperationChunkSize()),
            new BatchOperationCommandBuilder(partitionId),
            engineConfiguration.getBatchOperationQueryPageSize(),
            metrics);
    retryHandler =
        new BatchOperationRetryHandler(
            engineConfiguration.getBatchOperationQueryRetryInitialDelay(),
            engineConfiguration.getBatchOperationQueryRetryMaxDelay(),
            engineConfiguration.getBatchOperationQueryRetryMax(),
            engineConfiguration.getBatchOperationQueryRetryBackoffFactor());
  }

  @Override
  public void onRecovered(final ReadonlyStreamProcessorContext context) {
    processingContext = context;
    scheduleExecution(initialPollingInterval);
  }

  @Override
  public void onResumed() {
    scheduleExecution(initialPollingInterval);
  }

  private void scheduleExecution(final Duration nextDelay) {
    if (!executing.get()) {
      processingContext
          .getScheduleService()
          .runDelayedAsync(nextDelay, this::execute, AsyncTaskGroup.BATCH_OPERATIONS);
    } else {
      LOG.warn("Execution is already in progress, skipping scheduling.");
    }
  }

  private TaskResult execute(final TaskResultBuilder taskResultBuilder) {
    var nextDelay = initialPollingInterval;
    try {
      LOG.trace("Looking for the next pending batch operation to execute (scheduled).");
      executing.set(true);
      final var nextPendingOperation = batchOperationState.getNextPendingBatchOperation();
      if (nextPendingOperation.isPresent()) {
        nextDelay = executeRetrying(nextPendingOperation.get(), taskResultBuilder);
      }
    } finally {
      executing.set(false);
      scheduleExecution(nextDelay);
    }
    return taskResultBuilder.build();
  }

  private Duration executeRetrying(
      final PersistedBatchOperation batchOperation, final TaskResultBuilder taskResultBuilder) {

    if (!validateNoReInitialization(batchOperation)) {
      return initialPollingInterval;
    }

    final var context =
        new RetryContext(
            batchOperation.getKey(),
            Strings.nullToEmpty(initializing.get().searchResultCursor),
            initializing.get().numAttempts);

    final var retryResult =
        retryHandler.executeWithRetry(
            () ->
                batchOperationInitializer.initializeBatchOperation(
                    batchOperation, taskResultBuilder),
            context);

    return switch (retryResult) {
      case Success(final var key, final var cursor) -> {
        initializing.set(new ExecutionLoopState(key, cursor, 0));
        yield initialPollingInterval;
      }
      case Failure(final var exception) -> {
        batchOperationInitializer.appendFailedCommand(
            taskResultBuilder,
            batchOperation,
            ExceptionUtils.getStackTrace(exception),
            BatchOperationErrorType.QUERY_FAILED);
        yield initialPollingInterval;
      }
      case Retry(final var delay, final var retryContext) -> {
        LOG.warn(
            "Retryable operation failed, retries left: {}, retrying in {} ms",
            retryHandler.getMaxRetries() - retryContext.numAttempts(),
            delay.toMillis());
        initializing.set(
            new ExecutionLoopState(
                retryContext.batchOperationKey(),
                retryContext.searchResultCursor(),
                retryContext.numAttempts()));
        yield delay;
      }
    };
  }

  private boolean validateNoReInitialization(final PersistedBatchOperation batchOperation) {
    final var initializingBO = initializing.get();
    if (initializingBO != null
        && initializingBO.batchOperationKey == batchOperation.getKey()
        && !Objects.equals(
            initializingBO.searchResultCursor, batchOperation.getInitializationSearchCursor())
        && initializingBO.numAttempts == 0) {
      LOG.trace(
          "Batch operation {} is already being executed, skipping re-initialization.",
          batchOperation.getKey());
      return false;
    } else if (initializingBO == null) {
      initializing.set(new ExecutionLoopState(batchOperation));
    }
    return true;
  }

  record ExecutionLoopState(long batchOperationKey, String searchResultCursor, int numAttempts) {
    public ExecutionLoopState(final PersistedBatchOperation batchOperation) {
      this(
          batchOperation.getKey(),
          Strings.nullToEmpty(batchOperation.getInitializationSearchCursor()),
          0);
    }
  }
}
