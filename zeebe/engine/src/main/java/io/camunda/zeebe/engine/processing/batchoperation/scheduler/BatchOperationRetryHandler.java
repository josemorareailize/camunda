/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH under
 * one or more contributor license agreements. See the NOTICE file distributed
 * with this work for additional information regarding copyright ownership.
 * Licensed under the Camunda License 1.0. You may not use this file
 * except in compliance with the Camunda License 1.0.
 */
package io.camunda.zeebe.engine.processing.batchoperation.scheduler;

import io.camunda.search.exception.CamundaSearchException;
import io.camunda.search.exception.CamundaSearchException.Reason;
import io.camunda.zeebe.engine.processing.batchoperation.scheduler.BatchOperationInitializer.BatchOperationInitializationException;
import io.camunda.zeebe.engine.processing.batchoperation.scheduler.BatchOperationInitializer.BatchOperationInitializationResult;
import java.time.Duration;
import java.util.Set;

public class BatchOperationRetryHandler {
  private static final Set<Reason> FAIL_IMMEDIATELY_REASONS =
      Set.of(
          Reason.NOT_FOUND, Reason.NOT_UNIQUE, Reason.SECONDARY_STORAGE_NOT_SET, Reason.FORBIDDEN);

  private final Duration initialRetryDelay;
  private final Duration maxRetryDelay;
  private final int maxRetries;
  private final int backoffFactor;

  public BatchOperationRetryHandler(
      final Duration initialRetryDelay,
      final Duration maxRetryDelay,
      final int maxRetries,
      final int backoffFactor) {
    this.initialRetryDelay = initialRetryDelay;
    this.maxRetryDelay = maxRetryDelay;
    this.maxRetries = maxRetries;
    this.backoffFactor = backoffFactor;
  }

  public RetryResult executeWithRetry(
      final RetryableOperation operation, final RetryContext context) {
    try {
      final var result = operation.execute();
      return RetryResult.success(result.batchOperationKey(), result.searchResultCursor());
    } catch (final BatchOperationInitializationException e) {
      if (shouldFailImmediately(e.getCause()) || context.numAttempts() >= maxRetries) {
        return RetryResult.failure(e);
      }
      final Duration nextDelay = calculateNextDelay(context.numAttempts());
      return RetryResult.retry(nextDelay, context.withIncrementedAttempts(e.getEndCursor()));
    }
  }

  private boolean shouldFailImmediately(final Throwable exception) {
    return exception instanceof CamundaSearchException
        && FAIL_IMMEDIATELY_REASONS.contains(((CamundaSearchException) exception).getReason());
  }

  private Duration calculateNextDelay(final int attemptNumber) {
    final var calculatedDelay =
        initialRetryDelay.multipliedBy((int) Math.pow(backoffFactor, attemptNumber));
    return maxRetryDelay.compareTo(calculatedDelay) < 0 ? maxRetryDelay : calculatedDelay;
  }

  public int getMaxRetries() {
    return maxRetries;
  }

  public record RetryContext(long batchOperationKey, String searchResultCursor, int numAttempts) {
    public RetryContext withIncrementedAttempts(final String searchResultCursor) {
      return new RetryContext(batchOperationKey, searchResultCursor, numAttempts + 1);
    }
  }

  public sealed interface RetryResult
      permits RetryResult.Success, RetryResult.Failure, RetryResult.Retry {
    static Success success(final long batchOperationKey, final String searchResultCursor) {
      return new Success(batchOperationKey, searchResultCursor);
    }

    static Failure failure(final Exception exception) {
      return new Failure(exception);
    }

    static Retry retry(final Duration delay, final RetryContext context) {
      return new Retry(delay, context);
    }

    record Success(long batchOperationKey, String searchResultCursor) implements RetryResult {}

    record Failure(Exception exception) implements RetryResult {}

    record Retry(Duration delay, RetryContext context) implements RetryResult {}
  }

  @FunctionalInterface
  public interface RetryableOperation {
    BatchOperationInitializationResult execute() throws BatchOperationInitializationException;
  }
}
