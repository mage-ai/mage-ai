from typing import List, Optional

from mage_ai.frameworks.execution.models.pipeline.base import PipelineExecutionFramework
from mage_ai.shared.array import find


async def get_all_frameworks(level: Optional[int] = None) -> List[PipelineExecutionFramework]:
    from mage_ai.frameworks.execution.constants import EXECUTION_FRAMEWORKS

    arr = []
    for framework in EXECUTION_FRAMEWORKS:
        arr.append(framework)
        if level is None or level >= 1:
            arr += framework.get_pipelines(level=level)
    return arr


async def get_framework(uuid: str, **kwargs) -> Optional[PipelineExecutionFramework]:
    arr = await get_all_frameworks(**kwargs)

    return find(
        lambda framework: framework.uuid == uuid,
        arr or [],
    )
