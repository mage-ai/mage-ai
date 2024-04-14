from logging import Logger
from typing import Dict, List

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.remote.models import RemoteBlock


class GlobalDataProductBlock(Block):
    def get_global_data_product(self):
        # Avoid circular dependency of Pipeline class
        from mage_ai.data_preparation.models.global_data_product import (
            GlobalDataProduct,
        )

        override_configuration = (self.configuration or {}).get('global_data_product', {})
        global_data_product = GlobalDataProduct.get(override_configuration.get('uuid'))

        for key in [
            'outdated_after',
            'outdated_starting_at',
            'settings',
        ]:
            value = override_configuration.get(key)
            if value and len(value) >= 1:
                setattr(global_data_product, key, value)

        return global_data_product

    def _execute_block(
        self,
        outputs_from_input_vars,
        from_notebook: bool = False,
        global_vars: Dict = None,
        logger: Logger = None,
        logging_tags: Dict = None,
        **kwargs,
    ) -> List:
        # Avoid circular dependency of Pipeline class
        from mage_ai.orchestration.triggers import global_data_product as trigger

        global_data_product = self.get_global_data_product()

        pipeline_run = trigger.trigger_and_check_status(
            global_data_product,
            block=self,
            from_notebook=from_notebook,
            logger=logger,
            logging_tags=logging_tags,
            poll_interval=30,
            remote_blocks=global_vars.get('remote_blocks'),
            variables=global_vars.get('variables') if global_vars else None,
        )

        if pipeline_run and pipeline_run.pipeline:
            pipeline = pipeline_run.pipeline

            arr = []

            for block in global_data_product.get_blocks():
                if block and block.uuid:
                    arr.append(RemoteBlock.load(
                        block_uuid=block.uuid,
                        execution_partition=pipeline_run.execution_partition,
                        pipeline_uuid=pipeline.uuid,
                        repo_path=pipeline.repo_path,
                    ))

            return [
                dict(remote_blocks=arr),
            ]

        return []
