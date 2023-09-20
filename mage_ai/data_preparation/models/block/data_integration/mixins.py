import json
import os
from datetime import datetime
from inspect import Parameter, signature
from typing import Any, Callable, Dict, List, Union

import aiofiles
import yaml
from jinja2 import Template

from mage_ai.data_preparation.models.block.data_integration.constants import (
    BLOCK_CATALOG_FILENAME,
)
from mage_ai.data_preparation.models.block.data_integration.utils import (
    discover as discover_func,
)
from mage_ai.data_preparation.models.block.data_integration.utils import (
    discover_streams as discover_streams_func,
)
from mage_ai.data_preparation.models.block.data_integration.utils import (
    extract_stream_ids_from_streams,
    select_streams_in_catalog,
)
from mage_ai.data_preparation.models.constants import (
    PIPELINES_FOLDER,
    BlockLanguage,
    BlockType,
)
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.shared.environments import is_debug
from mage_ai.shared.hash import merge_dict


class SourceMixin:
    def get_catalog_file_path(self) -> str:
        if not self.pipeline:
            return

        return os.path.join(
            self.pipeline.repo_path,
            PIPELINES_FOLDER,
            self.pipeline.uuid,
            self.uuid,
            BLOCK_CATALOG_FILENAME,
        )

    async def get_catalog_from_file_async(self) -> Dict:
        catalog_full_path = self.get_catalog_file_path()

        if os.path.exists(catalog_full_path):
            async with aiofiles.open(catalog_full_path, mode='r') as f:
                return json.loads(await f.read() or '')

    def update_catalog_file(self, catalog: Dict = None) -> Dict:
        catalog_full_path = self.get_catalog_file_path()

        os.makedirs(os.path.dirname(catalog_full_path), exist_ok=True)

        if catalog:
            with open(catalog_full_path, mode='w') as f:
                f.write(json.dumps(catalog))

    def get_data_integration_settings(
        self,
        dynamic_block_index: Union[int, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        input_vars: List[Any] = None,
        partition: str = None,
        **kwargs,
    ) -> Dict:
        if not self.pipeline or not \
                Project(self.pipeline.repo_config).is_feature_enabled(
                    FeatureUUID.DATA_INTEGRATION_IN_BATCH_PIPELINE,
                ):

            return

        if self._data_integration or self._data_integration_loaded:
            return self._data_integration

        catalog = None
        config = None
        destination_uuid = None
        selected_streams = None
        source_uuid = None

        if self.type in [BlockType.DATA_LOADER, BlockType.DATA_EXPORTER] and \
                BlockLanguage.YAML == self.language and \
                self.content:

            text = Template(self.content).render(
                variables=lambda x: global_vars.get(x) if global_vars else None,
                **get_template_vars(),
            )
            settings = yaml.safe_load(text)

            catalog = self.__get_catalog_from_file()
            config = settings.get('config')
            destination_uuid = settings.get('destination')
            source_uuid = settings.get('source')
        elif BlockLanguage.PYTHON == self.language:
            results_from_block_code = self.__execute_data_integration_block_code(
                dynamic_block_index=dynamic_block_index,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                from_notebook=from_notebook,
                global_vars=global_vars,
                input_vars=input_vars,
                partition=partition,
                **kwargs,
            )

            catalog = results_from_block_code.get('catalog')
            config = results_from_block_code.get('config')
            selected_streams = results_from_block_code.get('selected_streams')
            source_uuid = results_from_block_code.get('source')

        if destination_uuid or source_uuid:
            settings = dict(
                catalog=catalog,
                config=config,
                selected_streams=selected_streams,
            )

            if destination_uuid:
                settings['destination'] = destination_uuid
            if source_uuid:
                settings['source'] = source_uuid

            self._data_integration = settings

        # Only attempt this once
        self._data_integration_loaded = True

        return self._data_integration

    def __execute_data_integration_block_code(
        self,
        dynamic_block_index: Union[int, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        input_vars: List = None,
        partition: str = None,
        **kwargs,
    ) -> Dict:
        now = datetime.utcnow().timestamp()

        decorated_functions = []
        decorated_functions_catalog = []
        decorated_functions_config = []
        decorated_functions_selected_streams = []
        decorated_functions_source = []
        test_functions = []

        results = {
            'data_integration_catalog': self.__block_decorator_catalog(decorated_functions_catalog),
            'data_integration_config': self._block_decorator(decorated_functions_config),
            'data_integration_selected_streams': self.__block_decorator_selected_streams(
                decorated_functions_selected_streams,
            ),
            'data_integration_source': self._block_decorator(decorated_functions_source),
            'test': self._block_decorator(test_functions),
            self.type: self._block_decorator(decorated_functions),
        }

        input_vars_use = []
        if input_vars is not None:
            input_vars_use = input_vars

        if self.content is not None:
            exec(self.content, results)
        elif os.path.exists(self.file_path):
            with open(self.file_path) as file:
                exec(file.read(), results)

        if not self._data_integration:
            self._data_integration = {}

        if len(decorated_functions_source) >= 1:
            block_function = decorated_functions_source[0]
            sig = signature(block_function)

            num_args = sum(
                arg.kind not in (Parameter.VAR_POSITIONAL, Parameter.VAR_KEYWORD)
                for arg in sig.parameters.values()
            )
            num_inputs = len(input_vars_use or [])

            if num_args > num_inputs:
                input_vars_fetched, _kwargs_vars, _upstream_block_uuids = \
                        self.fetch_input_variables(
                            input_vars,
                            partition,
                            global_vars,
                            dynamic_block_index=dynamic_block_index,
                            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                            from_notebook=from_notebook,
                        )

                input_vars_use = input_vars_fetched

            self._data_integration['source'] = self.execute_block_function(
                block_function,
                input_vars_use,
                from_notebook=from_notebook,
                global_vars=global_vars,
                initialize_decorator_modules=False,
            )

        if decorated_functions_config:
            self._data_integration['config'] = self.execute_block_function(
                decorated_functions_config[0],
                input_vars_use,
                from_notebook=from_notebook,
                global_vars=merge_dict(dict(
                    source=self._data_integration.get('source'),
                ), global_vars),
                initialize_decorator_modules=False,
            )

        source = self._data_integration.get('source')
        config = self._data_integration.get('config')

        if source and config:
            if decorated_functions_selected_streams:
                self._data_integration['selected_streams'] = self.execute_block_function(
                    decorated_functions_selected_streams[0],
                    input_vars_use,
                    from_notebook=from_notebook,
                    global_vars=merge_dict(dict(
                        config=config,
                        source=source,
                    ), global_vars),
                    initialize_decorator_modules=False,
                )
            else:
                self._data_integration['selected_streams'] = []

            if decorated_functions_catalog:
                self._data_integration['catalog'] = self.execute_block_function(
                    decorated_functions_catalog[0],
                    input_vars_use,
                    from_notebook=from_notebook,
                    global_vars=merge_dict(dict(
                        config=config,
                        selected_streams=self._data_integration.get('selected_streams'),
                        source=source,
                    ), global_vars),
                    initialize_decorator_modules=False,
                )
            else:
                selected_streams = self._data_integration.get('selected_streams')
                catalog = discover_func(source, config, selected_streams)
                self._data_integration['catalog'] = select_streams_in_catalog(
                    catalog,
                    selected_streams,
                )

        seconds = round((datetime.utcnow().timestamp() - now) * 10000) / 10000
        if is_debug():
            print(f'[Block.__execute_data_integration_block_code]: {seconds} | {self.uuid}')

        return self._data_integration

    def __get_catalog_from_file(self) -> Dict:
        catalog_full_path = self.get_catalog_file_path()

        if os.path.exists(catalog_full_path):
            with open(catalog_full_path, mode='r') as f:
                return json.loads(f.read() or '')

    def __block_decorator_catalog(self, decorated_functions):
        def custom_code(
            function: Callable = None,
            **kwargs,
        ):
            if function:
                decorated_functions.append(function)
                return function

            def inner(function_inner: Callable):
                def func(*args, **kwargs_inner):
                    discover = False
                    if kwargs and kwargs.get('discover'):
                        discover = kwargs.get('discover')

                    selected_streams = self._data_integration.get('selected_streams')
                    catalog = None
                    if discover:
                        catalog = discover_func(
                            self._data_integration.get('source'),
                            self._data_integration.get('config'),
                            selected_streams,
                        )

                        if catalog and (not kwargs or kwargs.get('select_all', True)):
                            catalog = select_streams_in_catalog(catalog, selected_streams)

                    return function_inner(*args, **kwargs_inner, catalog=catalog)
                decorated_functions.append(func)

            return inner

        return custom_code

    def __block_decorator_selected_streams(self, decorated_functions):
        def custom_code(
            function: Callable = None,
            **kwargs,
        ):
            if function:
                decorated_functions.append(function)
                return function

            def inner(function_inner: Callable):
                def func(*args, **kwargs_inner):
                    discover_streams = False
                    if kwargs and kwargs.get('discover_streams'):
                        discover_streams = kwargs.get('discover_streams')

                    selected_streams = None
                    if discover_streams:
                        streams = discover_streams_func(
                            self._data_integration.get('source'),
                            self._data_integration.get('config'),
                        )
                        selected_streams = extract_stream_ids_from_streams(streams)

                    return function_inner(*args, **kwargs_inner, selected_streams=selected_streams)
                decorated_functions.append(func)

            return inner

        return custom_code
