from mage_ai.data_preparation.models.block import Block
from mage_ai.extensions.constants import (
    EXTENSION_UUIDS,
    EXTENSION_UUID_GREAT_EXPECTATIONS,
)
from mage_ai.data_preparation.models.block.extension.great_expectations import GreatExpectations
from typing import Dict, List


class ExtensionBlock(Block):
    def post_process_output(self, output: Dict) -> List:
        return output

    def _block_decorator(self, decorated_functions):
        def custom_code(extension_name: str, *args, **kwargs):
            if not extension_name or type(extension_name) is not str:
                raise Exception(
                    'No @extension decorator found with a valid extension name, ' +
                    "must be in the following format: @extension('extension_name')",
                )

            if extension_name not in EXTENSION_UUIDS:
                raise Exception(
                    f"Extension '{extension_name}' in @extension decorator must be 1 of: "
                    f"{', '.join(EXTENSION_UUIDS)}",
                )

            def inner(function):
                def func(*args, **kwargs):
                    if EXTENSION_UUID_GREAT_EXPECTATIONS == extension_name:
                        ge = GreatExpectations(self)
                        validators = ge.build_validators(*args, **kwargs)
                        function(*validators)

                        validation_results = []
                        for validator in validators:
                            validation_result = validator.validate()
                            for result in validation_result.results:
                                if not result.get('success', False):
                                    raise Exception(f'Expectation failed:\n{result}\n')

                            validation_results.append(validation_result)

                        return validation_results

                    return function(*args, **kwargs)
                decorated_functions.append(func)

            return inner

        return custom_code
