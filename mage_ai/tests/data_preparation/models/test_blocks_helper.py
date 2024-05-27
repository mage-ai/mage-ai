import inspect
from typing import Callable, Optional

from mage_ai.data.models.generator import DataGenerator
from mage_ai.data.tabular.mocks import create_dataframe
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline


def load_dynamic_block_child_data(*args, **kwargs):
    arr = [i + 10 for i in range(0, 2)]
    return [
        arr,
        [dict(block_uuid=f'child_{i}') for i in arr],
    ]


def load(*args, **kwargs):
    buckets = 10

    for i in DataGenerator(range(buckets)):
        n_rows = (i + 1) * 100
        yield create_dataframe(
            n_rows=n_rows,
            use_pandas=False,
        )


def transform_data(generator, *args, **kwargs):
    for batch in generator:
        yield batch


def load_generators(*args, **kwargs):
    def load_data(index):
        return create_dataframe(n_rows=(1 + index) * 100, use_pandas=False)

    def measure_data(**kwargs) -> int:
        return 12

    data_generator = DataGenerator(
        load_data=load_data,
        measure_data=lambda _: measure_data(**kwargs),
    )

    for data in data_generator:
        yield data


def load_dataframes_for_dynamic_children(*args, **kwargs):
    from mage_ai.data.tabular.mocks import create_dataframe

    return [
        [
            create_dataframe(n_rows=100, use_pandas=True),
            create_dataframe(n_rows=100, use_pandas=True),
            create_dataframe(n_rows=100, use_pandas=True),
        ],
    ]


def load_dataframe(*args, **kwargs):
    from mage_ai.data.tabular.mocks import create_dataframe

    return create_dataframe(n_rows=1200, use_pandas=False)


def process_generator(generator, **kwargs):
    for batch in generator:
        gen = batch.generator(batch_size=75)
        for sub in gen:
            df = sub.deserialize()
            yield df


def passthrough(data, **kwargs):
    return data


class BlockHelperTest(BaseApiTestCase):
    def setUp(self):
        super().setUp()
        self.pipeline = create_pipeline(self.faker.unique.name(), self.repo_path)

    def create_block(
        self,
        name: Optional[str] = None,
        content: Optional[str] = None,
        func: Optional[Callable] = None,
        **kwargs,
    ):
        block = Block.create(
            name or self.faker.unique.name(),
            BlockType.TRANSFORMER,
            self.pipeline.repo_path,
            language=BlockLanguage.PYTHON,
            **kwargs,
        )

        if func:
            content = inspect.getsource(func)

        if content:
            block.update_content(
                '\n'.join([
                    'from mage_ai.data.models.generator import DataGenerator',
                    'from mage_ai.data.tabular.mocks import create_dataframe',
                    f'@{block.type}\n{content}',
                ])
            )

        return block
