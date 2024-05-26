from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional, Sequence, Union


@dataclass
class PipelineInterface:
    get_block: Callable[[str], 'BlockInterface']
    uuid: str
    variable_manager: Any


@dataclass
class BlockInterface:
    configuration: Dict[str, bool]
    get_data_integration_settings: Callable[..., Dict[str, Optional[Dict[str, Union[str, Dict]]]]]
    get_spark_session: Callable[..., Any]
    get_spark_session_from_global_vars: Callable[..., Any]
    pipeline: PipelineInterface
    upstream_blocks: Sequence['BlockInterface']
    uuid: str
    variable_manager: Any


@dataclass
class VariableInterface:
    is_partial_data_readable: Callable[[], bool]
    items_count: Callable[..., Optional[int]]
    read_partial_data: Callable
    uuid: str
