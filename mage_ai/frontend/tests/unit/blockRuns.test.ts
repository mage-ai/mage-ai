import { expect, test } from '@playwright/test';

import { RunStatus } from '@interfaces/BlockRunType';
import {
    buildBlockRunsRequestQuery,
    getSelectedPipelineUUID,
    getSingleStatusValue,
} from '@utils/blockRuns';

test('getSelectedPipelineUUID returns null when pipeline UUID is missing', () => {
    expect(getSelectedPipelineUUID({})).toBeNull();
});

test('getSelectedPipelineUUID returns single pipeline UUID', () => {
    expect(getSelectedPipelineUUID({ pipeline_uuid: 'pipeline_1' })).toEqual('pipeline_1');
    expect(getSelectedPipelineUUID({ pipeline_uuid: ['pipeline_1'] })).toEqual('pipeline_1');
});

test('getSelectedPipelineUUID returns null when multiple pipelines are selected', () => {
    expect(getSelectedPipelineUUID({ pipeline_uuid: ['pipeline_1', 'pipeline_2'] })).toBeNull();
});

test('getSingleStatusValue returns null for missing or multi-select status', () => {
    expect(getSingleStatusValue({})).toBeNull();
    expect(getSingleStatusValue({ status: [RunStatus.RUNNING, RunStatus.FAILED] })).toBeNull();
});

test('getSingleStatusValue returns scalar value for single-select status', () => {
    expect(getSingleStatusValue({ status: RunStatus.RUNNING })).toEqual(RunStatus.RUNNING);
    expect(getSingleStatusValue({ status: [RunStatus.RUNNING] })).toEqual(RunStatus.RUNNING);
});

test('buildBlockRunsRequestQuery applies pagination and preserves scalar status', () => {
    const result = buildBlockRunsRequestQuery(
        { pipeline_uuid: 'p1', status: RunStatus.RUNNING },
        3,
        25,
    );

    expect(result).toEqual({
        _limit: 25,
        _offset: 75,
        pipeline_uuid: 'p1',
        status: RunStatus.RUNNING,
    });
});

test('buildBlockRunsRequestQuery removes multi-select status from backend query', () => {
    const result = buildBlockRunsRequestQuery(
        { pipeline_uuid: 'p1', status: [RunStatus.RUNNING, RunStatus.FAILED] },
        0,
        50,
    );

    expect(result).toEqual({
        _limit: 50,
        _offset: 0,
        pipeline_uuid: 'p1',
    });
});
