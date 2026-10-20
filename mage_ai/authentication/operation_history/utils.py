from typing import List

from mage_ai.api.operations.constants import OperationType
from mage_ai.authentication.operation_history.constants import ResourceType
from mage_ai.authentication.operation_history.models import (
    OperationHistory,
    OperationHistoryReader,
)


def record_create(
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
    reader.save(model)

    return model


def record_create_pipeline(resource_uuid: str, user: str = None) -> OperationHistory:
    return record_create(
        resource_type=ResourceType.PIPELINE.value,
        resource_uuid=resource_uuid,
        user=user,
    )


def record_detail(
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
    reader.save(model)

    return model


def record_detail_pipeline(resource_uuid: str, user: str = None) -> OperationHistory:
    return record_detail(
        resource_type=ResourceType.PIPELINE.value,
        resource_uuid=resource_uuid,
        user=user,
    )


def load_records(
    operation: OperationType = None,
    resource_type: ResourceType = None,
    timestamp_end: int = None,
    timestamp_start: int = None,
) -> List[OperationHistory]:
    reader = OperationHistoryReader()

    return reader.load_all_history(
        operation=operation,
        resource_type=resource_type,
        timestamp_end=timestamp_end,
        timestamp_start=timestamp_start,
    )


def load_pipelines(
    operation: OperationType = None,
    timestamp_end: int = None,
    timestamp_start: int = None,
) -> List[OperationHistory]:
    return load_records(
        operation=operation,
        resource_type=ResourceType.PIPELINE,
        timestamp_end=timestamp_end,
        timestamp_start=timestamp_start,
    )


def load_pipelines_detail(
    timestamp_end: int = None,
    timestamp_start: int = None,
) -> List[OperationHistory]:
    return load_pipelines(
        operation=OperationType.DETAIL,
        timestamp_end=timestamp_end,
        timestamp_start=timestamp_start,
    )
