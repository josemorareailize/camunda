/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH under
 * one or more contributor license agreements. See the NOTICE file distributed
 * with this work for additional information regarding copyright ownership.
 * Licensed under the Camunda License 1.0. You may not use this file
 * except in compliance with the Camunda License 1.0.
 */
package io.camunda.zeebe.engine.processing.batchoperation.scheduler;

import com.google.common.base.Strings;
import io.camunda.zeebe.engine.metrics.BatchOperationMetrics;
import io.camunda.zeebe.engine.processing.batchoperation.itemprovider.ItemProviderFactory;
import io.camunda.zeebe.engine.state.batchoperation.PersistedBatchOperation;
import io.camunda.zeebe.protocol.record.value.BatchOperationErrorType;
import io.camunda.zeebe.stream.api.scheduling.TaskResultBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class BatchOperationInitializer {
  public static final String ERROR_MSG_FAILED_FIRST_CHUNK_APPEND =
      "Unable to append first chunk of batch operation items. Number of items: %d";
  private static final Logger LOG = LoggerFactory.getLogger(BatchOperationInitializer.class);

  private final ItemProviderFactory itemProviderFactory;
  private final BatchOperationMetrics metrics;
  private final BatchOperationCommandBuilder commandBuilder;
  private final BatchOperationPageProcessor pageProcessor;
  private final int queryPageSize;

  public BatchOperationInitializer(
      final ItemProviderFactory itemProviderFactory,
      final BatchOperationPageProcessor pageProcessor,
      final BatchOperationCommandBuilder commandBuilder,
      final int queryPageSize,
      final BatchOperationMetrics metrics) {
    this.itemProviderFactory = itemProviderFactory;
    this.commandBuilder = commandBuilder;
    this.pageProcessor = pageProcessor;
    this.queryPageSize = queryPageSize;
    this.metrics = metrics;
  }

  public BatchOperationInitializationResult initializeBatchOperation(
      final PersistedBatchOperation batchOperation, final TaskResultBuilder taskResultBuilder) {
    if (batchOperation.isSuspended()) {
      LOG.trace("Batch operation {} is suspended.", batchOperation.getKey());
      return new BatchOperationInitializationResult(
          batchOperation.getKey(), batchOperation.getInitializationSearchCursor());
    }

    final var itemProvider = itemProviderFactory.fromBatchOperation(batchOperation);
    var context = InitializationContext.fromBatchOperation(batchOperation, queryPageSize);

    while (true) {
      try {
        final var page = itemProvider.fetchItemPage(context.currentCursor(), context.pageSize());
        final var result = pageProcessor.processPage(page, batchOperation, taskResultBuilder);

        if (result.chunksAppended()) {
          context = context.withNextPage(result.endCursor(), result.itemsProcessed(), true);

          if (result.isLastPage()) {
            finishInitialization(batchOperation, taskResultBuilder);
            startExecutionPhase(taskResultBuilder, context);
            return new BatchOperationInitializationResult(batchOperation.getKey(), "finished");
          }
        } else {
          return handleFailedChunkAppend(taskResultBuilder, context, result.itemsProcessed());
        }
      } catch (final Exception e) {
        if (context.hasAppendedChunks()) {
          continueInitialization(taskResultBuilder, context);
        }
        throw new BatchOperationInitializationException(e, context.currentCursor());
      }
    }
  }

  private BatchOperationInitializationResult handleFailedChunkAppend(
      final TaskResultBuilder taskResultBuilder,
      final InitializationContext context,
      final int itemCount) {
    if (!context.hasAppendedChunks()) {
      if (context.pageSize() > 1) {
        final var reducedContext = context.withReducedPageSize();
        continueInitialization(taskResultBuilder, reducedContext);
      } else {
        commandBuilder.appendFailureCommand(
            taskResultBuilder,
            context.operation(),
            String.format(ERROR_MSG_FAILED_FIRST_CHUNK_APPEND, itemCount),
            BatchOperationErrorType.RESULT_BUFFER_SIZE_EXCEEDED);
      }
    } else {
      continueInitialization(taskResultBuilder, context);
    }
    return new BatchOperationInitializationResult(
        context.operation().getKey(), Strings.nullToEmpty(context.currentCursor()));
  }

  private void startExecutionPhase(
      final TaskResultBuilder resultBuilder, final InitializationContext context) {
    commandBuilder.appendExecutionCommand(resultBuilder, context.operation().getKey());

    metrics.recordItemsPerPartition(
        context.operation().getNumTotalItems() + context.itemsProcessed(),
        context.operation().getBatchOperationType());
    metrics.startStartExecuteLatencyMeasure(
        context.operation().getKey(), context.operation().getBatchOperationType());
    metrics.startTotalExecutionLatencyMeasure(
        context.operation().getKey(), context.operation().getBatchOperationType());
  }

  private void finishInitialization(
      final PersistedBatchOperation batchOperation, final TaskResultBuilder resultBuilder) {
    commandBuilder.appendFinishInitializationCommand(resultBuilder, batchOperation.getKey());
    metrics.recordInitialized(batchOperation.getBatchOperationType());
  }

  private void continueInitialization(
      final TaskResultBuilder taskResultBuilder, final InitializationContext context) {
    final var commandContext =
        new BatchOperationCommandBuilder.InitializationContext(
            context.operation().getKey(), context.currentCursor(), context.pageSize());
    commandBuilder.appendInitializationCommand(taskResultBuilder, commandContext);
  }

  public void appendFailedCommand(
      final TaskResultBuilder taskResultBuilder,
      final PersistedBatchOperation batchOperation,
      final String message,
      final BatchOperationErrorType errorType) {
    commandBuilder.appendFailureCommand(taskResultBuilder, batchOperation, message, errorType);
  }

  public record BatchOperationInitializationResult(
      long batchOperationKey, String searchResultCursor) {}

  public static class BatchOperationInitializationException extends RuntimeException {
    private final String endCursor;

    public BatchOperationInitializationException(final Throwable e, final String endCursor) {
      super("Failed to initialize batch operation with end cursor: " + endCursor, e);
      this.endCursor = endCursor;
    }

    public String getEndCursor() {
      return endCursor;
    }
  }
}
