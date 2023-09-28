from great_expectations.core import ExpectationSuite
from great_expectations.core.batch import RuntimeBatchRequest
from mage_ai.data_preparation.models.constants import BlockLanguage
from typing import Any, Dict, List, Tuple
import great_expectations as gx
import pandas as pd


class GreatExpectations():
    def __init__(self, block, expectations: List[Dict] = None):
        self.block = block
        self.expectations = expectations

    def build_validators(
        self,
        *args,
        **kwargs,
    ) -> List[Tuple[Any, str]]:
        validators = []

        for idx, df in enumerate(args):
            if idx >= len(self.block.upstream_block_uuids):
                continue

            uuid = self.block.upstream_block_uuids[idx]
            expectation_suite_name = f'expectation_suite_for_block_{uuid}'

            context = gx.get_context()
            batch_request = None
            datasource_config = None

            if type(df) is list:
                df = pd.DataFrame(df)
            elif type(df) is dict:
                df = pd.DataFrame([df])

            if BlockLanguage.PYTHON == self.block.language:
                data_connector_name = f'data_connector_name_{uuid}'
                datasource_name = f'datasource_name_{uuid}'

                batch_request = RuntimeBatchRequest(
                    batch_identifiers=dict(
                        default_identifier_name='default_identifier',
                    ),
                    data_asset_name=f'data_asset_{uuid}',
                    data_connector_name=data_connector_name,
                    datasource_name=datasource_name,
                    runtime_parameters=dict(
                        batch_data=df,
                    ),
                )

                datasource_config = dict(
                    class_name='Datasource',
                    data_connectors={
                        data_connector_name: dict(
                            batch_identifiers=[
                                'default_identifier_name',
                            ],
                            class_name='RuntimeDataConnector',
                            module_name='great_expectations.datasource.data_connector',
                        ),
                    },
                    execution_engine=dict(
                        class_name='PandasExecutionEngine',
                        module_name='great_expectations.execution_engine',
                    ),
                    module_name='great_expectations.datasource',
                    name=datasource_name,
                )

            elif BlockLanguage.SQL == self.block.language:
                pass

            context.add_datasource(**datasource_config)

            validator_options = dict(batch_request=batch_request)

            if self.expectations and len(self.expectations) >= 1:
                validator_options['expectation_suite'] = ExpectationSuite(
                    expectation_suite_name=expectation_suite_name,
                    expectations=self.expectations,
                )
            else:
                context.add_or_update_expectation_suite(
                    expectation_suite_name=expectation_suite_name,
                )
                validator_options['expectation_suite_name'] = expectation_suite_name

            validator = context.get_validator(**validator_options)

            validators.append((validator, uuid))

        return validators
