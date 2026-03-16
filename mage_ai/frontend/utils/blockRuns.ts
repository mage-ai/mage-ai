import { BlockRunReqQueryParamsType, RunStatus } from '@interfaces/BlockRunType';

type BlockRunsFilterQueryType = Omit<BlockRunReqQueryParamsType, 'pipeline_uuid' | 'status'> & {
    pipeline_uuid?: string | string[];
    status?: RunStatus | RunStatus[];
};

export function getSelectedPipelineUUID(query: BlockRunsFilterQueryType): string | null {
    const pipelineUUID = query?.pipeline_uuid;

    if (!pipelineUUID) {
        return null;
    }

    if (Array.isArray(pipelineUUID)) {
        return pipelineUUID.length === 1 ? pipelineUUID[0] : null;
    }

    return pipelineUUID;
}

export function getSingleStatusValue(query: BlockRunsFilterQueryType): RunStatus | null {
    const status = query?.status;

    if (!status) {
        return null;
    }

    if (Array.isArray(status)) {
        return status.length === 1 ? status[0] : null;
    }

    return status;
}

export function buildBlockRunsRequestQuery(
    query: BlockRunsFilterQueryType,
    page: number,
    rowLimit: number,
): BlockRunReqQueryParamsType {
    const {
        pipeline_uuid: pipelineUUIDFilter,
        status: statusFilter,
        ...restQuery
    } = query || {};

    const requestQuery: BlockRunReqQueryParamsType = {
        ...restQuery,
        _limit: rowLimit,
        _offset: page * rowLimit,
    };

    const pipelineUUID = getSelectedPipelineUUID({ pipeline_uuid: pipelineUUIDFilter });
    if (pipelineUUID) {
        requestQuery.pipeline_uuid = pipelineUUID;
    }

    const status = getSingleStatusValue({ status: statusFilter });
    if (status) {
        requestQuery.status = status;
    }

    return requestQuery;
}
