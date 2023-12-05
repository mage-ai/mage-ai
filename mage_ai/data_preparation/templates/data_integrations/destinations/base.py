from typing import Dict, List


# Required
@data_integration_destination
def destination(*args, **kwargs) -> str:
    return {{ data_integration_uuid }}


# Required
@data_integration_config
def config(*args, **kwargs) -> Dict:
    destination: str = kwargs.get('destination', None)
{{ config }}


# @data_integration_selected_streams
# def selected_streams(*args, **kwargs) -> List[str]:
#     config: Dict = kwargs.get('config', None)
#     destination: str = kwargs.get('destination', None)

#     return []


# @data_integration_catalog
# def catalog(*args, **kwargs) -> Dict:
#     config: Dict = kwargs.get('config', None)
#     selected_streams: List[str] = kwargs.get('selected_streams', None)
#     destination: str = kwargs.get('destination', None)

#     return {
#         'streams': [],
#     }
