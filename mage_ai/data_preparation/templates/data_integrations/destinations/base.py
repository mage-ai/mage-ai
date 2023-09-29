from typing import Dict, List


@data_integration_destination
def destination(*args, **kwargs) -> str:
    return {{ data_integration_uuid }}


@data_integration_config
def config(destination: str, *args, **kwargs) -> Dict:
{{ config }}


@data_integration_selected_streams
def selected_streams(config: Dict = None, source: str = None, *args, **kwargs) -> List[str]:
    return []


@data_integration_catalog
def catalog(
    config: Dict = None,
    selected_streams: List[str] = None,
    source: str = None,
    *args,
    **kwargs,
) -> Dict:
    return {
        'streams': [],
    }
