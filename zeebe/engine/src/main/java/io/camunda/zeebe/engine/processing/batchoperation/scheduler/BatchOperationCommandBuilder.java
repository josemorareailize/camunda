/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH under
 * one or more contributor license agreements. See the NOTICE file distributed
 * with this work for additional information regarding copyright ownership.
 * Licensed under the Camunda License 1.0. You may not use this file
 * except in compliance with the Camunda License 1.0.
 */
package io.camunda.zeebe.engine.processing.batchoperation.scheduler;

import io.camunda.zeebe.engine.state.batchoperation.PersistedBatchOperation;
import io.camunda.zeebe.msgpack.value.StringValue;
import io.camunda.zeebe.protocol.impl.record.value.batchoperation.BatchOperationError;
import io.camunda.zeebe.protocol.impl.record.value.batchoperation.BatchOperationExecutionRecord;
import io.camunda.zeebe.protocol.impl.record.value.batchoperation.BatchOperationInitializationRecord;
import io.camunda.zeebe.protocol.impl.record.value.batchoperation.BatchOperationPartitionLifecycleRecord;
import io.camunda.zeebe.protocol.record.intent.BatchOperationExecutionIntent;
import io.camunda.zeebe.protocol.record.intent.BatchOperationIntent;
import io.camunda.zeebe.protocol.record.value.BatchOperationErrorType;
import io.camunda.zeebe.stream.api.FollowUpCommandMetadata;
import io.camunda.zeebe.stream.api.scheduling.TaskResultBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class BatchOperationCommandBuilder {
  private static final Logger LOG = LoggerFactory.getLogger(BatchOperationCommandBuilder.class);
  private final int partitionId;

  public BatchOperationCommandBuilder(final int partitionId) {
    this.partitionId = partitionId;
  }

  public void appendInitializationCommand(
      final TaskResultBuilder builder, final InitializationContext context) {
    final var command =
        new BatchOperationInitializationRecord()
            .setBatchOperationKey(context.batchOperationKey())
            .setSearchResultCursor(
                context.searchResultCursor() == null
                    ? StringValue.EMPTY_STRING
                    : context.searchResultCursor())
            .setSearchQueryPageSize(context.pageSize());

    LOG.trace("Appending batch operation {} initializing command", context.batchOperationKey());
    builder.appendCommandRecord(
        context.batchOperationKey(),
        BatchOperationIntent.INITIALIZE,
        command,
        FollowUpCommandMetadata.of(b -> b.batchOperationReference(context.batchOperationKey())));
  }

  public void appendFinishInitializationCommand(
      final TaskResultBuilder builder, final long batchOperationKey) {
    final var command =
        new BatchOperationInitializationRecord().setBatchOperationKey(batchOperationKey);
    LOG.trace("Appending batch operation {} initializing finished command", batchOperationKey);

    builder.appendCommandRecord(
        batchOperationKey,
        BatchOperationIntent.FINISH_INITIALIZATION,
        command,
        FollowUpCommandMetadata.of(b -> b.batchOperationReference(batchOperationKey)));
  }

  public void appendExecutionCommand(
      final TaskResultBuilder builder, final long batchOperationKey) {
    final var command = new BatchOperationExecutionRecord();
    command.setBatchOperationKey(batchOperationKey);

    LOG.trace("Appending batch operation execution {}", batchOperationKey);
    builder.appendCommandRecord(
        batchOperationKey,
        BatchOperationExecutionIntent.EXECUTE,
        command,
        FollowUpCommandMetadata.of(b -> b.batchOperationReference(batchOperationKey)));
  }

  public void appendFailureCommand(
      final TaskResultBuilder builder,
      final PersistedBatchOperation operation,
      final String message,
      final BatchOperationErrorType errorType) {
    final var batchOperationKey = operation.getKey();
    final var command = new BatchOperationPartitionLifecycleRecord();
    command.setBatchOperationKey(batchOperationKey);

    final var error = new BatchOperationError();
    error.setType(errorType);
    error.setPartitionId(partitionId);
    error.setMessage(message);
    command.setError(error);

    LOG.trace("Appending batch operation {} failed event", batchOperationKey);
    builder.appendCommandRecord(
        batchOperationKey,
        BatchOperationIntent.FAIL,
        command,
        FollowUpCommandMetadata.of(b -> b.batchOperationReference(batchOperationKey)));
  }

  public record InitializationContext(
      long batchOperationKey, String searchResultCursor, int pageSize) {}
}
