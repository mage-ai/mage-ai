import json
import os
from datetime import datetime
from inspect import Parameter, signature
from typing import Any, Callable, Dict, List, Tuple, Union

import aiofiles
import pandas as pd
import yaml
from jinja2 import Template

from mage_ai.data_preparation.models.block.data_integration.constants import (
    BLOCK_CATALOG_FILENAME,
    KEY_METADATA,
)
from mage_ai.data_preparation.models.block.data_integration.schema import build_schema
from mage_ai.data_preparation.models.block.data_integration.utils import (
    discover as discover_func,
)
from mage_ai.data_preparation.models.block.data_integration.utils import (
    discover_streams as discover_streams_func,
)
from mage_ai.data_preparation.models.block.data_integration.utils import (
    extract_stream_ids_from_streams,
    get_streams_from_catalog,
    select_streams_in_catalog,
)
from mage_ai.data_preparation.models.constants import (
    PIPELINES_FOLDER,
    BlockLanguage,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.data_preparation.templates.utils import get_variable_for_template
from mage_ai.shared.array import find
from mage_ai.shared.environments import is_debug
from mage_ai.shared.hash import merge_dict


class DataIntegrationMixin:
    @property
    def controller_uuid(self) -> str:
        return f'{self.uuid}:controller'

    @property
    def configuration_data_integration(self) -> Dict:
        if self.configuration:
            return self.configuration.get('data_integration') or {}

        return {}

    @property
    def inputs_only_uuids(self) -> List[str]:
        """
        Get a list of UUIDs of input streams that are marked as 'input_only'.

        Returns:
            List[str]: List of UUIDs.
        """
        arr = []

        for stream_id, settings in self.data_integration_inputs.items():
            if settings.get('input_only'):
                arr.append(stream_id)

        return arr

    @property
    def data_integration_inputs(self) -> Dict:
        """
        Get the data integration inputs configuration for this block.

        Returns:
            Dict: Data integration inputs configuration.
        """
        mapping = {}

        if self.configuration_data_integration:
            inputs = self.configuration_data_integration.get('inputs')
            if isinstance(inputs, list):
                for stream_id in inputs:
                    mapping[stream_id] = dict(streams=[stream_id])
            elif isinstance(inputs, dict):
                mapping.update(inputs)

        return mapping

    @property
    def uuids_for_inputs(self) -> List[str]:
        """
        Get a list of UUIDs associated with data integration inputs.

        Returns:
            List[str]: List of UUIDs.
        """
        arr = []

        for stream_id, settings in self.data_integration_inputs.items():
            if settings.get('streams'):
                arr.append(stream_id)

        return arr

    @property
    def upstream_block_uuids_for_inputs(self) -> List[str]:
        """
        Get a list of upstream block UUIDs associated with data integration inputs.

        Returns:
            List[str]: List of upstream block UUIDs.
        """
        if self.configuration_data_integration:
            inputs_combined = self.uuids_for_inputs + self.inputs_only_uuids

            return [up_uuid for up_uuid in self.upstream_block_uuids if up_uuid in inputs_combined]

    def get_block_data_integration_settings_directory_path(self, block_uuid: str = None) -> str:
        """
        Get the directory path for storing data integration settings associated with a block.

        Args:
            block_uuid (str, optional): UUID of the block. Defaults to None.

        Returns:
            str: Directory path for data integration settings.
        """
        if not self.pipeline:
            return

        return os.path.join(
            self.pipeline.repo_path,
            PIPELINES_FOLDER,
            self.pipeline.uuid,
            block_uuid or self.uuid,
        )

    def get_catalog_file_path(self, block_uuid: str = None) -> str:
        """
        Get the file path for the data integration catalog file associated with a block.

        Args:
            block_uuid (str, optional): UUID of the block. Defaults to None.

        Returns:
            str: File path for the catalog file.
        """
        return os.path.join(
            self.get_block_data_integration_settings_directory_path(block_uuid),
            BLOCK_CATALOG_FILENAME,
        )

    def get_catalog_from_file(self) -> Dict:
        """
        Read and return the data integration catalog from a file.

        Returns:
            Dict: Data integration catalog.
        """
        catalog_full_path = self.get_catalog_file_path()

        if os.path.exists(catalog_full_path):
            with open(catalog_full_path, mode='r') as f:
                t = f.read()
                if t:
                    try:
                        return json.loads(t)
                    except json.decoder.JSONDecodeError:
                        return

    async def get_catalog_from_file_async(self) -> Dict:
        """
        Asynchronously read and return the data integration catalog from a file.

        Returns:
            Dict: Data integration catalog.
        """
        catalog_full_path = self.get_catalog_file_path()

        if os.path.exists(catalog_full_path):
            async with aiofiles.open(catalog_full_path, mode='r') as f:
                t = await f.read()
                if t:
                    try:
                        return json.loads(t)
                    except json.decoder.JSONDecodeError:
                        return

    def update_catalog_file(self, catalog: Dict = None) -> None:
        """
        Update the data integration catalog file with the provided catalog.

        Args:
            catalog (Dict, optional): Data integration catalog to be saved. Defaults to None.
        """
        catalog_full_path = self.get_catalog_file_path()

        os.makedirs(os.path.dirname(catalog_full_path), exist_ok=True)

        if catalog:
            with open(catalog_full_path, mode='w') as f:
                f.write(json.dumps(catalog))

    def is_data_integration(self, pipeline_project: Project = None) -> bool:
        """
        Check if the block is a data integration block.
        If the data_integration_in_batch_pipeline feature is not enabled, return False.

        Args:
            pipeline_project (Project, optional): A cached Project value to avoid
                looking it up many times when called inside loops. Defaults to None.

        Returns:
            bool: True if it's a data integration block, False otherwise.
        """
        if not self.pipeline:
            return False

        actual_project: Project = pipeline_project
        if not actual_project:
            actual_project = self.pipeline.project

        if not actual_project.is_feature_enabled(
                        FeatureUUID.DATA_INTEGRATION_IN_BATCH_PIPELINE,
                    ):

            return False

        if self.type in [BlockType.DATA_LOADER, BlockType.DATA_EXPORTER] and \
                BlockLanguage.YAML == self.language and \
                self.pipeline.type != PipelineType.STREAMING:

            return True

        if BlockLanguage.PYTHON == self.language:
            configuration = self.configuration or {}
            if configuration and 'data_integration' in configuration:
                return True

        return False

    def is_destination(self) -> bool:
        if not self.is_data_integration():
            return False

        return BlockType.DATA_EXPORTER == self.type

    def is_source(self) -> bool:
        if not self.is_data_integration():
            return False

        return BlockType.DATA_LOADER == self.type

    def get_data_integration_settings(
        self,
        data_integration_uuid_only: bool = False,
        dynamic_block_index: Union[int, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        input_vars: List[Any] = None,
        partition: str = None,
        **kwargs,
    ) -> Dict:
        """
        Retrieve data integration settings for the current block.

        Args:
            data_integration_uuid_only (bool, optional): If True, retrieve only the data integration
                UUID. Defaults to False.
            dynamic_block_index (Union[int, None], optional): The index of the dynamic block, if
                applicable. Defaults to None.
            dynamic_upstream_block_uuids (Union[List[str], None], optional): List of upstream block
                UUIDs, if applicable. Defaults to None.
            from_notebook (bool, optional): Whether the request is made from a notebook context.
                Defaults to False.
            global_vars (Dict, optional): Global variables to be used in template rendering.
                Defaults to None.
            input_vars (List[Any], optional): Input variables for the block. Defaults to None.
            partition (str, optional): Partition identifier, if applicable.
                Defaults to None.
            **kwargs: Additional keyword arguments.

        Returns:
            Dict: A dictionary containing the data integration settings, including catalog, config,
            data_integration_uuid, selected_streams, and the appropriate key
            (source or destination).
        """
        if not self.is_data_integration():
            return

        if self._data_integration or self._data_integration_loaded:
            return self._data_integration

        catalog = None
        config = None
        query = None
        selected_streams = None

        key = 'source' if self.is_source() else 'destination'
        data_integration_uuid = None

        catalog_from_file = self.get_catalog_from_file()

        if self.type in [BlockType.DATA_LOADER, BlockType.DATA_EXPORTER] and \
                BlockLanguage.YAML == self.language and \
                self.content:

            def _block_output(
                block_uuid: str,
                parse: str = None,
                current_block=self,
                dynamic_block_index=dynamic_block_index,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                from_notebook=from_notebook,
                global_vars=global_vars,
                input_vars=input_vars,
                partition=partition,
            ) -> Any:
                data = None

                if not self.fetched_inputs_from_blocks:
                    input_vars_fetched, _kwargs_vars, _upstream_block_uuids = \
                        self.fetch_input_variables_and_catalog(
                            input_vars,
                            partition,
                            global_vars,
                            dynamic_block_index=dynamic_block_index,
                            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                            from_notebook=from_notebook,
                        )
                    self.fetched_inputs_from_blocks = input_vars_fetched

                if block_uuid in self.upstream_block_uuids and \
                        self.data_integration_inputs and \
                        block_uuid in self.data_integration_inputs:

                    up_uuids = [i for i in
                                self.upstream_block_uuids if i in
                                self.data_integration_inputs]

                    index = up_uuids.index(block_uuid)
                    data = self.fetched_inputs_from_blocks[index]

                if parse:
                    results = {}
                    exec(f'_parse_func = {parse}', results)
                    return results['_parse_func'](data)

                return data

            text = Template(self.content).render(
                block_output=_block_output,
                variables=lambda x, p=None, v=global_vars: get_variable_for_template(
                    x,
                    parse=p,
                    variables=v,
                ),
                **get_template_vars(),
            )

            settings = yaml.full_load(text)

            catalog = catalog_from_file
            config = settings.get('config')
            if config:
                for k, v in config.items():
                    if v and isinstance(v, str):
                        config[k] = v.strip()
            query = settings.get('query')

            data_integration_uuid = settings.get(key)
        elif BlockLanguage.PYTHON == self.language:
            results_from_block_code = self.__execute_data_integration_block_code(
                catalog_from_file=catalog_from_file,
                data_integration_uuid_only=data_integration_uuid_only,
                dynamic_block_index=dynamic_block_index,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                from_notebook=from_notebook,
                global_vars=global_vars,
                input_vars=input_vars,
                partition=partition,
                **kwargs,
            )

            config = results_from_block_code.get('config')
            data_integration_uuid = results_from_block_code.get(key)

            catalog = results_from_block_code.get('catalog')
            query = results_from_block_code.get('query')
            selected_streams = results_from_block_code.get('selected_streams')

            if not selected_streams and catalog and catalog.get('streams'):
                selected_streams = []
                for stream_dict in (catalog.get('streams') or []):
                    metadata1 = stream_dict.get(KEY_METADATA) or []
                    if metadata1:
                        metadata_for_stream = find(
                            lambda x: not x.get('breadcrumb'),
                            metadata1,
                        )

                        if not metadata_for_stream or \
                                not metadata_for_stream.get('metadata') or \
                                (metadata_for_stream.get('metadata') or {}).get('selected'):

                            selected_streams.append(
                                stream_dict.get('stream') or stream_dict.get('tap_stream_id'),
                            )

        if data_integration_uuid:
            self._data_integration = {
                'catalog': catalog,
                'config': config,
                'data_integration_uuid': data_integration_uuid,
                'query': query,
                'selected_streams': selected_streams,
                key: data_integration_uuid,
            }

        # Only attempt this once
        self._data_integration_loaded = True

        return self._data_integration

    def fetch_input_variables_and_catalog(
        self,
        input_vars,
        execution_partition: str = None,
        global_vars: Dict = None,
        dynamic_block_index: int = None,
        dynamic_upstream_block_uuids: List[str] = None,
        from_notebook: bool = False,
        upstream_block_uuids: List[str] = None,
        all_catalogs: bool = False,
        all_streams: bool = False,
        **kwargs,
    ) -> Tuple[List, List, List]:
        block_uuids_to_fetch = upstream_block_uuids or self.upstream_block_uuids_for_inputs

        catalog_by_upstream_block_uuid = {}
        data_integration_settings_mapping = {}

        for up_uuid in (upstream_block_uuids or self.data_integration_inputs.keys()):
            settings = self.data_integration_inputs.get(up_uuid) or {}
            input_catalog = all_catalogs or settings.get('catalog', False)

            upstream_block = self.pipeline.get_block(up_uuid)
            if input_catalog and upstream_block.is_source():
                di_settings = upstream_block.get_data_integration_settings(
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    from_notebook=from_notebook,
                    global_vars=input_vars,
                    input_vars=input_vars,
                    partition=execution_partition,
                )

                catalog = di_settings.get('catalog') or {}

                if BlockLanguage.YAML == upstream_block.language:
                    streams = settings.get('streams')
                    if streams and not all_streams:
                        catalog['streams'] = get_streams_from_catalog(catalog, streams)

                catalog_by_upstream_block_uuid[up_uuid] = catalog
                data_integration_settings_mapping[up_uuid] = di_settings

        # Get the output as inputs for this block
        input_vars_fetched, kwargs_vars, up_block_uuids = self.fetch_input_variables(
            input_vars,
            data_integration_settings_mapping=data_integration_settings_mapping,
            dynamic_block_index=dynamic_block_index,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            execution_partition=execution_partition,
            from_notebook=from_notebook,
            global_vars=global_vars,
            upstream_block_uuids=block_uuids_to_fetch,
        )

        if block_uuids_to_fetch and is_debug():
            uuids = ', '.join(block_uuids_to_fetch)
            inputs_count = len(input_vars_fetched) if input_vars_fetched else 0
            print(
                '[Block.__execute_data_integration_block_code]: Inputs fetched from '
                f'block UUIDS {uuids}: {inputs_count} inputs fetched.',
            )

        if upstream_block_uuids or self.data_integration_inputs:
            input_vars_updated = []
            kwargs_vars_updated = []
            up_block_uuids_updated = []

            for up_uuid in self.upstream_block_uuids:
                if upstream_block_uuids and up_uuid not in upstream_block_uuids:
                    continue

                if not upstream_block_uuids and up_uuid not in self.data_integration_inputs:
                    continue

                upstream_block = self.pipeline.get_block(up_uuid)
                is_source = upstream_block.is_source()

                settings = self.data_integration_inputs.get(up_uuid)
                input_catalog = all_catalogs or settings.get('catalog', False)
                input_streams = all_streams or settings.get('streams')

                input_var_to_add = []
                kwargs_var_to_add = None

                idx = None
                if up_uuid in up_block_uuids:
                    idx = up_block_uuids.index(up_uuid)

                if idx is not None and idx < len(kwargs_vars):
                    kwargs_var_to_add = kwargs_vars[idx]

                input_data = None
                if input_streams:
                    if idx is not None:
                        input_data = input_vars_fetched[idx]
                    # This has to come first before catalog.
                    input_var_to_add.append(input_data)

                if input_catalog:
                    catalog = None
                    if is_source:
                        catalog = catalog_by_upstream_block_uuid.get(up_uuid)
                    elif input_data is None:
                        input_vars_inner, \
                            kwargs_vars_inner, \
                            _up_block_uuids = self.fetch_input_variables(
                                None,
                                data_integration_settings_mapping=data_integration_settings_mapping,
                                dynamic_block_index=dynamic_block_index,
                                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                                execution_partition=execution_partition,
                                from_notebook=from_notebook,
                                global_vars=global_vars,
                                upstream_block_uuids=[up_uuid],
                            )

                        if input_vars_inner:
                            input_data = input_vars_inner[0]

                        if kwargs_vars_inner and not kwargs_var_to_add:
                            kwargs_var_to_add = kwargs_vars_inner[0]

                    if not catalog and \
                            input_data is not None and \
                            isinstance(input_data, pd.DataFrame):

                        catalog = dict(streams=[build_schema(input_data, up_uuid)])

                    input_var_to_add.append(catalog)

                if len(input_var_to_add) == 1:
                    input_var_to_add = input_var_to_add[0]
                input_vars_updated.append(input_var_to_add)
                kwargs_vars_updated.append(kwargs_var_to_add)
                up_block_uuids_updated.append(up_uuid)

            return input_vars_updated, kwargs_vars_updated, up_block_uuids_updated

        return input_vars_fetched, kwargs_vars, up_block_uuids

    def __conditionally_fetch_inputs_for_decorated_functions(
        self,
        decorated_functions_arr: List[Callable],
        input_vars_use: List,
        dynamic_block_index: Union[int, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
        fetched: bool = False,
        from_notebook: bool = False,
        global_vars: Dict = None,
        input_vars: List = None,
        partition: str = None,
    ) -> [List, bool]:
        if fetched:
            return input_vars_use, fetched

        fetched_already = False

        block_function = decorated_functions_arr[0]
        sig = signature(block_function)

        num_args = sum(
            arg.kind not in (Parameter.VAR_POSITIONAL, Parameter.VAR_KEYWORD)
            for arg in sig.parameters.values()
        )
        num_inputs = len(input_vars_use or [])

        if num_args > num_inputs:
            input_vars_fetched, _kwargs_vars, _upstream_block_uuids = \
                self.fetch_input_variables_and_catalog(
                    input_vars,
                    partition,
                    global_vars,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    from_notebook=from_notebook,
                )

            fetched_already = True
            input_vars_use = input_vars_fetched

        return input_vars_use, fetched_already

    def __execute_data_integration_block_code(
        self,
        catalog_from_file: Dict = None,
        data_integration_uuid_only: bool = False,
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
        decorated_functions_destination = []
        decorated_functions_query = []
        decorated_functions_selected_streams = []
        decorated_functions_source = []
        test_functions = []

        results = {
            'data_integration_catalog': self.__block_decorator_catalog(decorated_functions_catalog),
            'data_integration_config': self._block_decorator(decorated_functions_config),
            'data_integration_destination': self._block_decorator(decorated_functions_destination),
            'data_integration_query': self._block_decorator(decorated_functions_query),
            'data_integration_selected_streams': self.__block_decorator_selected_streams(
                decorated_functions_selected_streams,
            ),
            'data_integration_source': self._block_decorator(decorated_functions_source),
            'test': self._block_decorator(test_functions),
            self.type: self._block_decorator(decorated_functions),
        }

        fetched = False
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

        is_source = self.is_source()
        if is_source:
            key = 'source'
            decorated_functions_arr = decorated_functions_source
        else:
            key = 'destination'
            decorated_functions_arr = decorated_functions_destination

        if len(decorated_functions_arr) >= 1:
            input_vars_use, fetched = self.__conditionally_fetch_inputs_for_decorated_functions(
                decorated_functions_arr,
                input_vars_use,
                dynamic_block_index=dynamic_block_index,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                fetched=fetched,
                from_notebook=from_notebook,
                global_vars=global_vars,
                input_vars=input_vars,
                partition=partition,
            )

            self._data_integration[key] = self.execute_block_function(
                decorated_functions_arr[0],
                input_vars_use,
                from_notebook=from_notebook,
                global_vars=global_vars,
                initialize_decorator_modules=False,
            )

        def _print_time(block=self, now=now):
            if is_debug():
                seconds = round((datetime.utcnow().timestamp() - now) * 10000) / 10000
                print(f'[Block.__execute_data_integration_block_code]: {seconds} | {block.uuid}')

        if data_integration_uuid_only:
            _print_time()
            return self._data_integration

        if decorated_functions_config:
            input_vars_use, fetched = self.__conditionally_fetch_inputs_for_decorated_functions(
                decorated_functions_config,
                input_vars_use,
                dynamic_block_index=dynamic_block_index,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                fetched=fetched,
                from_notebook=from_notebook,
                global_vars=global_vars,
                input_vars=input_vars,
                partition=partition,
            )

            self._data_integration['config'] = self.execute_block_function(
                decorated_functions_config[0],
                input_vars_use,
                from_notebook=from_notebook,
                global_vars=merge_dict({
                    key: self._data_integration.get(key),
                }, global_vars),
                initialize_decorator_modules=False,
            )

        data_integration_uuid = self._data_integration.get(key)
        config = self._data_integration.get('config')

        if data_integration_uuid and config:
            if decorated_functions_selected_streams:
                input_vars_use, fetched = self.__conditionally_fetch_inputs_for_decorated_functions(
                    decorated_functions_selected_streams,
                    input_vars_use,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    fetched=fetched,
                    from_notebook=from_notebook,
                    global_vars=global_vars,
                    input_vars=input_vars,
                    partition=partition,
                )

                self._data_integration['selected_streams'] = self.execute_block_function(
                    decorated_functions_selected_streams[0],
                    input_vars_use,
                    from_notebook=from_notebook,
                    global_vars=merge_dict({
                        'config': config,
                        key: data_integration_uuid,
                    }, global_vars),
                    initialize_decorator_modules=False,
                )
            else:
                self._data_integration['selected_streams'] = []

            if decorated_functions_catalog:
                input_vars_use, fetched = self.__conditionally_fetch_inputs_for_decorated_functions(
                    decorated_functions_catalog,
                    input_vars_use,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    fetched=fetched,
                    from_notebook=from_notebook,
                    global_vars=global_vars,
                    input_vars=input_vars,
                    partition=partition,
                )

                self._data_integration['catalog'] = self.execute_block_function(
                    decorated_functions_catalog[0],
                    input_vars_use,
                    from_notebook=from_notebook,
                    global_vars=merge_dict({
                        'config': config,
                        'selected_streams': self._data_integration.get('selected_streams'),
                        key: data_integration_uuid,
                    }, global_vars),
                    initialize_decorator_modules=False,
                )
            elif is_source:
                selected_streams = self._data_integration.get('selected_streams')

                if catalog_from_file:
                    self._data_integration['catalog'] = catalog_from_file
                else:
                    catalog = discover_func(data_integration_uuid, config, selected_streams)
                    self._data_integration['catalog'] = select_streams_in_catalog(
                        catalog,
                        selected_streams,
                    )
            elif catalog_from_file:
                self._data_integration['catalog'] = catalog_from_file

            if decorated_functions_query:
                self._data_integration['query'] = {}
                for decorated_function in decorated_functions_query:
                    self._data_integration['query'].update(
                        self.execute_block_function(
                            decorated_function,
                            input_vars_use,
                            from_notebook=from_notebook,
                            global_vars=merge_dict({
                                'config': config,
                                'selected_streams': self._data_integration.get('selected_streams'),
                                key: data_integration_uuid,
                            }, global_vars),
                            initialize_decorator_modules=False,
                        ),
                    )

        _print_time()

        return self._data_integration

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

                    select_all = not kwargs or kwargs.get('select_all', True)
                    selected_streams = self._data_integration.get('selected_streams')

                    def __discover_func(
                        source: str = None,
                        config: Dict = None,
                        streams: List[str] = None,
                    ):
                        selected_streams_use = streams or selected_streams

                        catalog = discover_func(
                            source or self._data_integration.get('source'),
                            config or self._data_integration.get('config'),
                            selected_streams_use,
                        )

                        if catalog and select_all:
                            catalog = select_streams_in_catalog(catalog, selected_streams_use)

                        return catalog

                    kwargs_extra = dict(
                        discover_func=__discover_func,
                    )

                    if discover:
                        kwargs_extra['catalog'] = __discover_func()

                    return function_inner(
                        *args,
                        **kwargs_inner,
                        **kwargs_extra,
                    )
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

                    def __discover_streams_func(source: str = None, config: Dict = None):
                        streams = discover_streams_func(
                            source or self._data_integration.get('source'),
                            config or self._data_integration.get('config'),
                        )

                        return extract_stream_ids_from_streams(streams)

                    kwargs_extra = dict(
                        discover_streams_func=__discover_streams_func,
                    )

                    if discover_streams:
                        kwargs_extra['selected_streams'] = __discover_streams_func()

                    return function_inner(
                        *args,
                        **kwargs_inner,
                        **kwargs_extra,
                    )
                decorated_functions.append(func)

            return inner

        return custom_code
