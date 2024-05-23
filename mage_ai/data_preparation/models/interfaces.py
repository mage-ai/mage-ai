from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional, Union


@dataclass
class PipelineInterface:
    get_block: Callable[[str], 'BlockInterface']
    uuid: str
    variable_manager: Any


@dataclass
class BlockInterface:
    get_data_integration_settings: Callable[..., Dict[str, Optional[Dict[str, Union[str, Dict]]]]]
    get_spark_session: Callable[..., Any]
    get_spark_session_from_global_vars: Callable[..., Any]
    pipeline: PipelineInterface
    uuid: str
