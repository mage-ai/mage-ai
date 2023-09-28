from typing import Dict, List


@data_integration_source
def source(*args, **kwargs) -> str:
    return {{ data_integration_uuid }}


@data_integration_config
def config(*args, **kwargs) -> Dict:
{{ config }}


@data_integration_selected_streams(discover_streams=False)
def selected_streams(*args, **kwargs) -> List[str]:
    return []


@data_integration_catalog(discover=False, select_all=True)
def catalog(*args, **kwargs) -> Dict:
    return {
        'streams': [],
    }
