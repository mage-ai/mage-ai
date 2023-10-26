from typing import List

from mage_ai.api.operations.constants import OperationType
from mage_ai.authentication.operation_history.constants import ResourceType
from mage_ai.authentication.operation_history.models import (
    OperationHistory,
    OperationHistoryReader,
)


async def record_create_async(
    resource_type: ResourceType,
    resource_uuid: str,
    user: str = None,
) -> OperationHistory:
    reader = OperationHistoryReader()
    model = reader.create(
        operation=OperationType.CREATE.value,
        resource_type=resource_type,
        resource_uuid=resource_uuid,
        user=user,
    )
    await reader.save_async(model)

    return model


async def record_create_pipeline_async(resource_uuid: str, user: str = None) -> OperationHistory:
    return await record_create_async(
        resource_type=ResourceType.PIPELINE.value,
        resource_uuid=resource_uuid,
        user=user,
    )


async def record_detail_async(
    resource_type: ResourceType,
    resource_uuid: str,
    user: str = None,
) -> OperationHistory:
    reader = OperationHistoryReader()
    model = reader.create(
        operation=OperationType.DETAIL.value,
        resource_type=resource_type,
        resource_uuid=resource_uuid,
        user=user,
    )
    await reader.save_async(model)

    return model


async def record_detail_pipeline_async(resource_uuid: str, user: str = None) -> OperationHistory:
    return await record_detail_async(
        resource_type=ResourceType.PIPELINE.value,
        resource_uuid=resource_uuid,
        user=user,
    )


async def load_records_async(
    operation: OperationType = None,
    resource_type: ResourceType = None,
    timestamp_end: int = None,
    timestamp_start: int = None,
) -> List[OperationHistory]:
    reader = OperationHistoryReader()

    return await reader.load_all_history_async(
        operation=operation,
        resource_type=resource_type,
        timestamp_end=timestamp_end,
        timestamp_start=timestamp_start,
    )


async def load_pipelines_async(
    operation: OperationType = None,
    timestamp_end: int = None,
    timestamp_start: int = None,
) -> List[OperationHistory]:
    return await load_records_async(
        operation=operation,
        resource_type=ResourceType.PIPELINE,
        timestamp_end=timestamp_end,
        timestamp_start=timestamp_start,
    )


async def load_pipelines_detail_async(
    timestamp_end: int = None,
    timestamp_start: int = None,
) -> List[OperationHistory]:
    return await load_pipelines_async(
        operation=OperationType.DETAIL,
        timestamp_end=timestamp_end,
        timestamp_start=timestamp_start,
    )
