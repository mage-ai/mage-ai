from typing import Dict, List


@data_integration_destination
def destination(*args, **kwargs) -> str:
    return {{ data_integration_uuid }}


@data_integration_config
def config(*args, **kwargs) -> Dict:
{{ config }}


@data_integration_catalog
def catalog(*args, **kwargs) -> Dict:
    return {
        'streams': [],
    }
