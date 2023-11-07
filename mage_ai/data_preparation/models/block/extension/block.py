from typing import Callable, Dict, List

from mage_ai.data_preparation.models.block import Block
from mage_ai.extensions.constants import (
    EXTENSION_UUID_GREAT_EXPECTATIONS,
    EXTENSION_UUIDS,
)


class ExtensionBlock(Block):
    def post_process_output(self, output: Dict) -> List:
        return output

    def _block_decorator(self, decorated_functions: List[Callable]):
        def custom_code(
            extension_name: str,
            expectations: List[Dict] = None,
            *args,
            **kwargs,
        ):
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

            def inner(function: Callable):
                def func(*args, **kwargs):
                    if EXTENSION_UUID_GREAT_EXPECTATIONS == extension_name:
                        import mage_ai.data_preparation.models.block.extension.great_expectations

                        ge = (
                                mage_ai.
                                data_preparation.
                                models.
                                block.
                                extension.
                                great_expectations.
                                GreatExpectations(
                                    self,
                                    expectations=expectations,
                                )
                            )
                        validators_and_uuids = ge.build_validators(*args, **kwargs)
                        validators = [t[0] for t in validators_and_uuids]
                        function(*validators, **kwargs)

                        validation_results = []
                        for validator, uuid in validators_and_uuids:
                            validation_result = validator.validate()
                            for result in validation_result.results:
                                if result.get('success', False):
                                    print(
                                        f'Expectations from extension {self.uuid} for ' +
                                        f'block {uuid} succeeded.',
                                    )
                                else:
                                    raise Exception(
                                        f'Expectations from extension {self.uuid} for ' +
                                        f'block {uuid} failed:\n{result}\n',
                                    )

                            validation_results.append(validation_result)

                        return validation_results

                    return function(*args, **kwargs)
                decorated_functions.append(func)

            return inner

        return custom_code
