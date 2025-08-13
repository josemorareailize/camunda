/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH under
 * one or more contributor license agreements. See the NOTICE file distributed
 * with this work for additional information regarding copyright ownership.
 * Licensed under the Camunda License 1.0. You may not use this file
 * except in compliance with the Camunda License 1.0.
 */
package io.camunda.zeebe.engine.processing.batchoperation.scheduler;

import com.google.common.collect.Lists;
import io.camunda.zeebe.engine.processing.batchoperation.itemprovider.ItemProvider.Item;
import io.camunda.zeebe.engine.processing.batchoperation.itemprovider.ItemProvider.ItemPage;
import io.camunda.zeebe.engine.state.batchoperation.PersistedBatchOperation;
import io.camunda.zeebe.protocol.impl.record.UnifiedRecordValue;
import io.camunda.zeebe.protocol.impl.record.value.batchoperation.BatchOperationChunkRecord;
import io.camunda.zeebe.protocol.impl.record.value.batchoperation.BatchOperationExecutionRecord;
import io.camunda.zeebe.protocol.impl.record.value.batchoperation.BatchOperationInitializationRecord;
import io.camunda.zeebe.protocol.impl.record.value.batchoperation.BatchOperationItem;
import io.camunda.zeebe.protocol.record.intent.BatchOperationChunkIntent;
import io.camunda.zeebe.stream.api.FollowUpCommandMetadata;
import io.camunda.zeebe.stream.api.scheduling.TaskResultBuilder;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.commons.lang3.RandomStringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class BatchOperationPageProcessor {
  private static final Logger LOG = LoggerFactory.getLogger(BatchOperationPageProcessor.class);
  private static final UnifiedRecordValue EMPTY_EXECUTION_RECORD =
      new BatchOperationExecutionRecord().setBatchOperationKey(-1L);
  private static final UnifiedRecordValue EMPTY_INITIALIZATION_RECORD =
      new BatchOperationInitializationRecord()
          .setBatchOperationKey(-1L)
          .setSearchQueryPageSize(0)
          .setSearchResultCursor(RandomStringUtils.insecure().next(1024));

  private final int chunkSize;

  public BatchOperationPageProcessor(final int chunkSize) {
    this.chunkSize = chunkSize;
  }

  public PageProcessingResult processPage(
      final ItemPage page,
      final PersistedBatchOperation operation,
      final TaskResultBuilder taskResultBuilder) {
    final boolean appendedChunks = appendChunks(operation, taskResultBuilder, page.items());
    return new PageProcessingResult(
        appendedChunks, page.endCursor(), page.items().size(), page.isLastPage());
  }

  private boolean appendChunks(
      final PersistedBatchOperation batchOperation,
      final TaskResultBuilder taskResultBuilder,
      final List<Item> items) {

    final var chunkRecords = createChunks(batchOperation, items);
    final FollowUpCommandMetadata metadata =
        FollowUpCommandMetadata.of(b -> b.batchOperationReference(batchOperation.getKey()));

    if (canAppendChunks(taskResultBuilder, chunkRecords, metadata)) {
      chunkRecords.forEach(
          command -> {
            LOG.trace(
                "Appending batch operation {} chunk with {} items.",
                batchOperation.getKey(),
                command.getItems().size());
            taskResultBuilder.appendCommandRecord(
                batchOperation.getKey(), BatchOperationChunkIntent.CREATE, command, metadata);
          });
      return true;
    }
    return false;
  }

  private List<BatchOperationChunkRecord> createChunks(
      final PersistedBatchOperation batchOperation, final List<Item> items) {
    return Lists.partition(items, chunkSize).stream()
        .map(chunkItems -> createChunkRecord(batchOperation, chunkItems))
        .toList();
  }

  private boolean canAppendChunks(
      final TaskResultBuilder taskResultBuilder,
      final List<BatchOperationChunkRecord> chunkRecords,
      final FollowUpCommandMetadata metadata) {
    final List<UnifiedRecordValue> sizeCheckRecords = new ArrayList<>(chunkRecords);
    sizeCheckRecords.add(EMPTY_EXECUTION_RECORD);
    sizeCheckRecords.add(EMPTY_INITIALIZATION_RECORD);
    return taskResultBuilder.canAppendRecords(sizeCheckRecords, metadata);
  }

  private static BatchOperationChunkRecord createChunkRecord(
      final PersistedBatchOperation batchOperation, final List<Item> chunkItems) {
    final var command = new BatchOperationChunkRecord();
    command.setBatchOperationKey(batchOperation.getKey());
    command.setItems(
        chunkItems.stream().map(BatchOperationPageProcessor::mapItem).collect(Collectors.toSet()));
    return command;
  }

  private static BatchOperationItem mapItem(final Item item) {
    return new BatchOperationItem()
        .setItemKey(item.itemKey())
        .setProcessInstanceKey(item.processInstanceKey());
  }

  public record PageProcessingResult(
      boolean chunksAppended, String endCursor, int itemsProcessed, boolean isLastPage) {}
}
