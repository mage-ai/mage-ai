from typing import Callable, Dict, List


# Required
@data_integration_source
def source(*args, **kwargs) -> str:
    return {{ data_integration_uuid }}


# Required
@data_integration_config
def config(*args, **kwargs) -> Dict:
    source: str = kwargs.get('source', None)
{{ config }}


# @data_integration_selected_streams(discover_streams: bool = False)
# def selected_streams(*args, **kwargs) -> List[str]:
#     config: Dict = kwargs.get('config', None)
#     discover_streams_func: Callable = kwargs.get('discover_streams_func', None)
#     source: str = kwargs.get('source', None)

#     return []


# @data_integration_catalog(discover: bool = False, select_all: bool = True)
# def catalog(*args, **kwargs) -> Dict:
#     config: Dict = kwargs.get('config', None)
#     selected_streams: List[str] = kwargs.get('selected_streams', None)
#     source: str = kwargs.get('source', None)

#     # catalog_from_discover is None unless discover=True
#     catalog_from_discover: Dict = kwargs.get('catalog', None)

#     # Executing this function will fetch and return the catalog
#     discover_func: Callable = kwargs.get('discover_func', None)

#     return {
#         'streams': [],
#     }
