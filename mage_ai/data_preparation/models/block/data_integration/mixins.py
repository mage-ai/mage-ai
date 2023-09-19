import os
from inspect import Parameter, signature
from typing import Any, Dict, List, Union

import yaml

from mage_ai.data_preparation.models.block.data_integration.utils import (
    discover,
    discover_streams,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.shared.hash import merge_dict


class SourceMixin:
    def execute_source_block_code(
        self,
        outputs_from_input_vars,
        custom_code: str = None,
        from_notebook: bool = False,
        global_vars: Dict = None,
        input_vars: List = None,
        **kwargs,
    ) -> Dict:
        decorated_functions_catalog = []
        decorated_functions_config = []
        decorated_functions_discover = []
        decorated_functions_selected_streams = []
        decorated_functions_source = []
        decorated_functions_sync = []
        test_functions = []

        results = merge_dict(dict(
            catalog=self._block_decorator(decorated_functions_catalog),
            config=self._block_decorator(decorated_functions_config),
            discover=self._block_decorator(decorated_functions_discover),
            selected_streams=self._block_decorator(decorated_functions_selected_streams),
            source=self._block_decorator(decorated_functions_source),
            sync=self._block_decorator(decorated_functions_sync),
            test=self._block_decorator(test_functions),
        ), outputs_from_input_vars)

        inputs_vars_use = list()
        if input_vars is not None:
            inputs_vars_use = input_vars

        if custom_code is not None and custom_code.strip():
            if BlockType.CHART != self.type:
                exec(custom_code, results)
        elif self.content is not None:
            exec(self.content, results)
        elif os.path.exists(self.file_path):
            with open(self.file_path) as file:
                exec(file.read(), results)

        mapping = {}

        if decorated_functions_source:
            mapping['source'] = self.execute_block_function(
                decorated_functions_source[0],
                inputs_vars_use,
                from_notebook=from_notebook,
                global_vars=global_vars,
            )

        if decorated_functions_config:
            mapping['config'] = self.execute_block_function(
                decorated_functions_config[0],
                inputs_vars_use,
                from_notebook=from_notebook,
                global_vars=merge_dict(dict(
                    source=mapping.get('source'),
                ), global_vars),
            )

        source = mapping.get('source')
        config = mapping.get('config')

        selected_streams = discover_streams(source, config)
        if decorated_functions_selected_streams:
            mapping['selected_streams'] = self.execute_block_function(
                decorated_functions_selected_streams[0],
                inputs_vars_use,
                from_notebook=from_notebook,
                global_vars=merge_dict(dict(
                    config=config,
                    selected_streams=selected_streams,
                    source=source,
                ), global_vars),
            )
        else:
            mapping['selected_streams'] = selected_streams

        catalog = discover(source, config, mapping['selected_streams'])
        if decorated_functions_catalog:
            mapping['catalog'] = self.execute_block_function(
                decorated_functions_catalog[0],
                inputs_vars_use,
                from_notebook=from_notebook,
                global_vars=merge_dict(dict(
                    catalog=catalog,
                    config=config,
                    selected_streams=mapping['selected_streams'],
                    source=source,
                ), global_vars),
            )
        else:
            mapping['catalog'] = catalog

        """
        catalog
        config
        selected_streams
        source
        """
        return mapping

    def get_source(
        self,
        dynamic_block_index: Union[int, None] = None,
        dynamic_upstream_block_uuids: Union[List[str], None] = None,
        fetch_input_variables: bool = False,
        from_notebook: bool = False,
        global_vars: Dict = None,
        input_args: List[Any] = None,
        partition: str = None,
        **kwargs,
    ) -> str:
        if BlockType.DATA_LOADER == self.type and \
                BlockLanguage.YAML == self.language and \
                self.content:

            config = yaml.safe_load(self.content)

            return config.get('source')

        if BlockLanguage.PYTHON != self.language:
            return None

        decorated_functions_source = []
        results = dict(source=self._block_decorator(decorated_functions_source))

        try:
            if self.content is not None:
                exec(self.content, results)
            elif os.path.exists(self.file_path):
                with open(self.file_path) as file:
                    exec(file.read(), results)
        except NameError:
            pass

        if len(decorated_functions_source) >= 1:
            input_vars_use = input_args

            block_function = decorated_functions_source[0]
            sig = signature(block_function)

            num_args = sum(
                arg.kind not in (Parameter.VAR_POSITIONAL, Parameter.VAR_KEYWORD)
                for arg in sig.parameters.values()
            )
            num_inputs = len(input_vars_use or [])

            if fetch_input_variables or num_args > num_inputs:
                input_vars, _kwargs_vars, _upstream_block_uuids = self.fetch_input_variables(
                    input_args,
                    partition,
                    global_vars,
                    dynamic_block_index=dynamic_block_index,
                    dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
                    from_notebook=from_notebook,
                )
                input_vars_use = input_vars

            return self.execute_block_function(
                block_function,
                input_vars_use,
                from_notebook=from_notebook,
                global_vars=global_vars,
            )
