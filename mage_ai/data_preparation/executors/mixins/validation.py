from mage_ai.data_preparation.models.pipeline import Pipeline


class ValidateBlockMixin():
    def __init__(self, pipeline: Pipeline, **kwargs):
        super().__init__(pipeline, **kwargs)
        self.parse_and_validate_blocks()

    def parse_and_validate_blocks(self):
        raise Exception(
            f'{self.__class__.__name__} must implement the parse_and_validate_blocks method.',
        )
