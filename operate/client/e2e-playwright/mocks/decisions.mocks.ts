/*
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH under
 * one or more contributor license agreements. See the NOTICE file distributed
 * with this work for additional information regarding copyright ownership.
 * Licensed under the Camunda License 1.0. You may not use this file
 * except in compliance with the Camunda License 1.0.
 */

import type {Route} from '@playwright/test';
import type {BatchOperation} from '@vzeta/camunda-api-zod-schemas/8.8';
import type {
  DecisionDto,
  DecisionInstancesDto,
  BatchOperationDto,
} from '@/types';

function mockResponses({
  batchOperations,
  groupedDecisions,
  decisionInstances,
  decisionXml,
  deleteDecision,
}: {
  batchOperations?: BatchOperation[];
  groupedDecisions?: DecisionDto[];
  decisionInstances?: DecisionInstancesDto;
  decisionXml?: string;
  deleteDecision?: BatchOperationDto;
}) {
  return (route: Route) => {
    if (route.request().url().includes('/v2/authentication/me')) {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          displayName: 'demo',
          canLogout: true,
          roles: null,
          salesPlanType: null,
          c8Links: {},
          username: 'demo',
        }),
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    if (route.request().url().includes('/v2/batch-operations/search')) {
      return route.fulfill({
        status: batchOperations === undefined ? 400 : 200,
        body: JSON.stringify({
          items: batchOperations || [],
          page: {
            totalItems: batchOperations?.length || 0,
          },
        }),
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    if (route.request().url().includes('/api/decisions/grouped')) {
      return route.fulfill({
        status: groupedDecisions === undefined ? 400 : 200,
        body: JSON.stringify(groupedDecisions),
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    if (route.request().url().includes('/api/decision-instances')) {
      return route.fulfill({
        status: decisionInstances === undefined ? 400 : 200,
        body: JSON.stringify(decisionInstances),
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    if (
      route
        .request()
        .url()
        .match(/\/v2\/decision-definitions\/\d+\/xml/)
    ) {
      return route.fulfill({
        status: decisionXml === undefined ? 400 : 200,
        body: decisionXml,
        headers: {
          'content-type': 'application/text',
        },
      });
    }

    if (
      route.request().url().includes('/api/decisions') &&
      route.request().method() === 'DELETE'
    ) {
      return route.fulfill({
        status: deleteDecision === undefined ? 400 : 200,
        body: JSON.stringify(deleteDecision),
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    route.continue();
  };
}

const mockGroupedDecisions: DecisionDto[] = [
  {
    decisionId: 'invoiceAssignApprover',
    tenantId: '<default>',
    name: 'Assign Approver Group',
    permissions: [],
    decisions: [
      {
        id: '2251799813687885',
        version: 2,
        decisionId: 'invoiceAssignApprover',
      },
      {
        id: '2251799813687195',
        version: 1,
        decisionId: 'invoiceAssignApprover',
      },
    ],
  },
  {
    decisionId: 'amountToString',
    tenantId: '<default>',
    name: 'Convert amount to string',
    permissions: [],
    decisions: [
      {
        id: '2251799813687887',
        version: 1,
        decisionId: 'amountToString',
      },
    ],
  },
  {
    decisionId: 'invoiceClassification',
    tenantId: '<default>',
    name: 'Invoice Classification',
    permissions: [],
    decisions: [
      {
        id: '2251799813687886',
        version: 2,
        decisionId: 'invoiceClassification',
      },
      {
        id: '2251799813687196',
        version: 1,
        decisionId: 'invoiceClassification',
      },
    ],
  },
];

const mockBatchOperations: BatchOperation[] = [
  {
    batchOperationKey: 'a1b2c3d4-5e6f-7890-abcd-ef1234567890',
    batchOperationType: 'CANCEL_PROCESS_INSTANCE',
    startDate: '2023-08-25T12:41:49+0300',
    endDate: '2023-08-25T12:41:49+0300',
    state: 'COMPLETED',
    operationsTotalCount: 3,
    operationsCompletedCount: 3,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: 'bf547ac3-9a35-45b9-ab06-b80b43785154',
    batchOperationType: 'MODIFY_PROCESS_INSTANCE',
    startDate: '2023-08-24T08:24:27+0300',
    endDate: '2023-08-24T08:24:27+0300',
    state: 'COMPLETED_WITH_ERRORS',
    operationsTotalCount: 5,
    operationsCompletedCount: 3,
    operationsFailedCount: 2,
  },
  {
    batchOperationKey: '5dd91cae-5f0c-4e35-a698-5a7887c4fbbd',
    batchOperationType: 'CANCEL_PROCESS_INSTANCE',
    startDate: '2023-08-18T10:19:23+0300',
    endDate: '2023-08-18T10:19:23+0300',
    state: 'COMPLETED_WITH_ERRORS',
    operationsTotalCount: 3,
    operationsCompletedCount: 0,
    operationsFailedCount: 3,
  },
  {
    batchOperationKey: 'b1454600-5f13-4365-bb45-960e8372136b',
    batchOperationType: 'CANCEL_PROCESS_INSTANCE',
    startDate: '2023-08-18T10:14:37+0300',
    endDate: '2023-08-18T10:14:37+0300',
    state: 'COMPLETED_WITH_ERRORS',
    operationsTotalCount: 1,
    operationsCompletedCount: 0,
    operationsFailedCount: 1,
  },
  {
    batchOperationKey: '653ed5e6-49ed-4675-85bf-2c54a94d8180',
    batchOperationType: 'RESOLVE_INCIDENT',
    startDate: '2023-08-25T12:41:49+0300',
    endDate: '2023-08-25T12:41:49+0300',
    state: 'COMPLETED',
    operationsTotalCount: 3,
    operationsCompletedCount: 3,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: '5dd91cae-5f0c-4e35-a698-5a7887c4fbbd',
    batchOperationType: 'RESOLVE_INCIDENT',
    startDate: '2023-08-18T10:19:23+0300',
    endDate: '2023-08-18T10:19:23+0300',
    state: 'COMPLETED_WITH_ERRORS',
    operationsTotalCount: 3,
    operationsCompletedCount: 0,
    operationsFailedCount: 3,
  },
  {
    batchOperationKey: 'b1454600-5f13-4365-bb45-960e8372136b',
    batchOperationType: 'RESOLVE_INCIDENT',
    startDate: '2023-08-18T10:14:37+0300',
    endDate: '2023-08-18T10:14:37+0300',
    state: 'COMPLETED_WITH_ERRORS',
    operationsTotalCount: 1,
    operationsCompletedCount: 0,
    operationsFailedCount: 1,
  },
  {
    batchOperationKey: 'c4e125da-2b5c-42f5-badc-9a78ebd8f006',
    batchOperationType: 'RESOLVE_INCIDENT',
    startDate: '2023-08-15T10:47:33+0300',
    endDate: '2023-08-15T10:47:33+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: 'c5e97ca8-bdf9-434f-934f-506a6960d1e3',
    batchOperationType: 'RESOLVE_INCIDENT',
    startDate: '2023-08-15T13:17:32+0300',
    endDate: '2023-08-15T13:17:36+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: '35ccdcfc-aeac-4ec8-ac6c-db67e581b22e',
    batchOperationType: 'MODIFY_PROCESS_INSTANCE',
    startDate: '2023-08-15T10:42:17+0300',
    endDate: '2023-08-15T10:42:18+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: '0f004110-547d-4aa3-b9c4-39d277d41f97',
    batchOperationType: 'RESOLVE_INCIDENT',
    startDate: '2023-08-14T10:46:29.261+0300',
    endDate: '2023-08-14T10:46:34.983+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: 'fb7cfeb0-abaa-4323-8910-9d44fe031c08',
    batchOperationType: 'CANCEL_PROCESS_INSTANCE',
    startDate: '2023-08-14T08:46:05.677+0300',
    endDate: '2023-08-14T08:46:25.020+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: 'c1331a55-3f6f-4884-837f-dfa268f7ef0c',
    batchOperationType: 'CANCEL_PROCESS_INSTANCE',
    startDate: '2023-08-14T08:46:05.459+0300',
    endDate: '2023-08-14T08:46:25.010+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: 'af9be740-adb8-4c2b-b5b6-d14731c4a74f',
    batchOperationType: 'CANCEL_PROCESS_INSTANCE',
    startDate: '2023-08-14T08:46:06.369+0300',
    endDate: '2023-08-14T08:46:24.990+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: 'f9ddd801-ff34-44da-8d7c-366036b6d8d8',
    batchOperationType: 'CANCEL_PROCESS_INSTANCE',
    startDate: '2023-08-14T08:46:06.344+0300',
    endDate: '2023-08-14T08:46:14.987+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: 'dc824c36-d075-49c6-8a7e-b45eebba815f',
    batchOperationType: 'CANCEL_PROCESS_INSTANCE',
    startDate: '2023-08-14T08:46:06.439+0300',
    endDate: '2023-08-14T08:46:14.981+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: 'cfdf3baa-e6a6-48bc-8763-487d09be2467',
    batchOperationType: 'CANCEL_PROCESS_INSTANCE',
    startDate: '2023-08-14T08:46:05.738+0300',
    endDate: '2023-08-14T08:46:14.974+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: 'a74db3d1-4588-41a5-9e10-42cea80213a6',
    batchOperationType: 'CANCEL_PROCESS_INSTANCE',
    startDate: '2023-08-14T08:46:06.164+0300',
    endDate: '2023-08-14T08:46:14.965+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
  {
    batchOperationKey: '9961d35a-261f-4b29-b506-8b14cc6e7992',
    batchOperationType: 'CANCEL_PROCESS_INSTANCE',
    startDate: '2023-08-14T08:46:05.569+0300',
    endDate: '2023-08-14T08:46:14.942+0300',
    state: 'COMPLETED',
    operationsTotalCount: 1,
    operationsCompletedCount: 1,
    operationsFailedCount: 0,
  },
];

const mockDecisionInstances: DecisionInstancesDto = {
  decisionInstances: [
    {
      id: '2251799813830820-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:07.123+0000',
      processInstanceId: '2251799813830813',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '9007199254748932-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.801+0000',
      processInstanceId: '9007199254748925',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '6755399441062312-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.793+0000',
      processInstanceId: '6755399441062307',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '4503599627375963-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.787+0000',
      processInstanceId: '4503599627375958',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '2251799813830805-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.779+0000',
      processInstanceId: '2251799813830798',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '9007199254748918-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.620+0000',
      processInstanceId: '9007199254748911',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '6755399441062304-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.608+0000',
      processInstanceId: '6755399441062299',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '4503599627375956-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.599+0000',
      processInstanceId: '4503599627375951',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '2251799813828076-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.594+0000',
      processInstanceId: '2251799813828071',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '9007199254748904-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.584+0000',
      processInstanceId: '9007199254748897',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '6755399441062296-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.575+0000',
      processInstanceId: '6755399441062291',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '4503599627375944-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.567+0000',
      processInstanceId: '4503599627375937',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '2251799813826769-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.558+0000',
      processInstanceId: '2251799813826762',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '9007199254748889-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.539+0000',
      processInstanceId: '9007199254748882',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '6755399441062283-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.529+0000',
      processInstanceId: '6755399441062276',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '4503599627375933-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.522+0000',
      processInstanceId: '4503599627375928',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '2251799813826743-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.513+0000',
      processInstanceId: '2251799813826738',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '9007199254748878-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:47:06.502+0000',
      processInstanceId: '9007199254748873',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '2251799813687953-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.694+0000',
      processInstanceId: '2251799813687946',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '9007199254742973-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.686+0000',
      processInstanceId: '9007199254742966',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '6755399441057764-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.678+0000',
      processInstanceId: '6755399441057757',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '4503599627372771-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.671+0000',
      processInstanceId: '4503599627372764',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '2251799813687944-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.663+0000',
      processInstanceId: '2251799813687939',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '9007199254742960-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.651+0000',
      processInstanceId: '9007199254742953',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '6755399441057755-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.642+0000',
      processInstanceId: '6755399441057750',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '4503599627372758-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.633+0000',
      processInstanceId: '4503599627372751',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '2251799813687933-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.624+0000',
      processInstanceId: '2251799813687926',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '9007199254742947-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.617+0000',
      processInstanceId: '9007199254742940',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '6755399441057744-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.609+0000',
      processInstanceId: '6755399441057737',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '4503599627372745-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.601+0000',
      processInstanceId: '4503599627372738',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '2251799813687924-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.595+0000',
      processInstanceId: '2251799813687919',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '9007199254742938-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.586+0000',
      processInstanceId: '9007199254742933',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '6755399441057731-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.571+0000',
      processInstanceId: '6755399441057724',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '4503599627372732-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.559+0000',
      processInstanceId: '4503599627372725',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '2251799813687913-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.535+0000',
      processInstanceId: '2251799813687906',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '9007199254742927-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.525+0000',
      processInstanceId: '9007199254742920',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '6755399441057718-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.515+0000',
      processInstanceId: '6755399441057711',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '4503599627372723-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.506+0000',
      processInstanceId: '4503599627372718',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '2251799813687900-1',
      state: 'EVALUATED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.494+0000',
      processInstanceId: '2251799813687893',
      sortValues: ['', ''],
      tenantId: '',
    },
    {
      id: '9007199254742918-1',
      state: 'FAILED',
      decisionName: 'Invoice Classification',
      decisionVersion: 2,
      evaluationDate: '2023-08-14T05:46:04.481+0000',
      processInstanceId: '9007199254742913',
      sortValues: ['', ''],
      tenantId: '',
    },
  ],
  totalCount: 40,
};

const mockDecisionXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/" xmlns:camunda="http://camunda.org/schema/1.0/dmn" id="invoiceBusinessDecisions" name="Invoice Business Decisions" namespace="http://camunda.org/schema/1.0/dmn" exporter="Camunda Modeler" exporterVersion="4.12.0">
  <decision id="invoiceClassification" name="Invoice Classification">
    <decisionTable id="decisionTable">
      <input id="clause1" label="Invoice Amount" camunda:inputVariable="">
        <inputExpression id="inputExpression1" typeRef="double">
          <text>amount</text>
        </inputExpression>
      </input>
      <input id="InputClause_15qmk0v" label="Invoice Category" camunda:inputVariable="">
        <inputExpression id="LiteralExpression_1oi86cw" typeRef="string">
          <text>invoiceCategory</text>
        </inputExpression>
        <inputValues id="UnaryTests_0kisa67">
          <text>"Travel Expenses","Misc","Software License Costs"</text>
        </inputValues>
      </input>
      <output id="clause3" label="Classification" name="invoiceClassification" typeRef="string">
        <outputValues id="UnaryTests_08dl8wf">
          <text>"day-to-day expense","budget","exceptional"</text>
        </outputValues>
      </output>
      <rule id="DecisionRule_1of5a87">
        <inputEntry id="LiteralExpression_0yrqmtg">
          <text>&lt; 250</text>
        </inputEntry>
        <inputEntry id="UnaryTests_06edsin">
          <text>"Misc"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_046antl">
          <text>"day-to-day expense"</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_1ak4z14">
        <inputEntry id="LiteralExpression_0qmsef6">
          <text>[250..1000]</text>
        </inputEntry>
        <inputEntry id="UnaryTests_09b743h">
          <text>"Misc"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_05xxvip">
          <text>"budget"</text>
        </outputEntry>
      </rule>
      <rule id="row-49839158-4">
        <inputEntry id="UnaryTests_0le0gl8">
          <text>&gt; 1000</text>
        </inputEntry>
        <inputEntry id="UnaryTests_0pukamj">
          <text>"Misc"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_1e76ugx">
          <text>"exceptional"</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_0cuxolz">
        <inputEntry id="LiteralExpression_05lyjk7">
          <text></text>
        </inputEntry>
        <inputEntry id="UnaryTests_0ve4z34">
          <text>"Travel Expenses"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_1bq8m03">
          <text>"day-to-day expense"</text>
        </outputEntry>
      </rule>
      <rule id="row-49839158-2">
        <inputEntry id="UnaryTests_1nssdlk">
          <text></text>
        </inputEntry>
        <inputEntry id="UnaryTests_01ppb4l">
          <text>"Software License Costs"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_0y00iih">
          <text>"budget"</text>
        </outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <decision id="invoiceAssignApprover" name="Assign Approver Group">
    <informationRequirement id="InformationRequirement_1kkeocv">
      <requiredDecision href="#invoiceClassification" />
    </informationRequirement>
    <informationRequirement id="InformationRequirement_0uzhmkt">
      <requiredDecision href="#amountToString" />
    </informationRequirement>
    <decisionTable id="DecisionTable_16o85h8" hitPolicy="COLLECT">
      <input id="InputClause_0og2hn3" label="Invoice Classification" camunda:inputVariable="">
        <inputExpression id="LiteralExpression_1vywt5q" typeRef="string">
          <text>invoiceClassification</text>
        </inputExpression>
        <inputValues id="UnaryTests_0by7qiy">
          <text>"day-to-day expense","budget","exceptional"</text>
        </inputValues>
      </input>
      <output id="OutputClause_1cthd0w" label="Approver Group" name="result" typeRef="string">
        <outputValues id="UnaryTests_1ulmk9p">
          <text>"management","accounting","sales"</text>
        </outputValues>
      </output>
      <rule id="row-49839158-1">
        <inputEntry id="UnaryTests_18ifczd">
          <text>"day-to-day expense"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_0sgxulk">
          <text>"accounting"</text>
        </outputEntry>
      </rule>
      <rule id="row-49839158-6">
        <inputEntry id="UnaryTests_0kfae8g">
          <text>"day-to-day expense"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_1iksrro">
          <text>"sales"</text>
        </outputEntry>
      </rule>
      <rule id="row-49839158-5">
        <inputEntry id="UnaryTests_08cevwi">
          <text>"budget", "exceptional"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_0c7hz8g">
          <text>"management"</text>
        </outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <decision id="amountToString" name="Convert amount to string">
    <variable id="InformationItem_1qw1dn9" name="amountStr" typeRef="string" />
    <literalExpression id="LiteralExpression_0gfbl7s">
      <text>"$" + string(amount)</text>
    </literalExpression>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram id="DMNDiagram_1cuuevk">
      <dmndi:DMNShape id="DMNShape_1abvt5s" dmnElementRef="invoiceClassification">
        <dc:Bounds height="55" width="100" x="153" y="215" />
      </dmndi:DMNShape>
      <dmndi:DMNShape id="DMNShape_1ay7af5" dmnElementRef="invoiceAssignApprover">
        <dc:Bounds height="55" width="100" x="224" y="84" />
      </dmndi:DMNShape>
      <dmndi:DMNEdge id="DMNEdge_1wn1950" dmnElementRef="InformationRequirement_1kkeocv">
        <di:waypoint x="203" y="215" />
        <di:waypoint x="257" y="159" />
        <di:waypoint x="257" y="139" />
      </dmndi:DMNEdge>
      <dmndi:DMNShape id="DMNShape_0kgcvw6" dmnElementRef="amountToString">
        <dc:Bounds height="80" width="180" x="320" y="203" />
      </dmndi:DMNShape>
      <dmndi:DMNEdge id="DMNEdge_1sucp5a" dmnElementRef="InformationRequirement_0uzhmkt">
        <di:waypoint x="410" y="203" />
        <di:waypoint x="291" y="159" />
        <di:waypoint x="291" y="139" />
      </dmndi:DMNEdge>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>
`;

const mockDeleteDecision = {
  id: '5a1bd516-a594-423c-be18-ea53a15d61d3',
  name: 'Invoice Classification - Version 2',
  type: 'DELETE_DECISION_DEFINITION',
  startDate: '2023-10-13T11:15:28.433+0200',
  endDate: null,
  username: 'demo',
  instancesCount: 0,
  operationsTotalCount: 1,
  operationsFinishedCount: 0,
} as const;

export {
  mockGroupedDecisions,
  mockBatchOperations,
  mockDecisionInstances,
  mockDecisionXml,
  mockDeleteDecision,
  mockResponses,
};
