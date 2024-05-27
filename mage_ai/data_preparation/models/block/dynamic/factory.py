from typing import Dict, List, Optional

from mage_ai.data_preparation.models.block.dynamic.counter import (
    DynamicBlockItemCounter,
    DynamicChildItemCounter,
    DynamicDuoItemCounter,
    DynamicItemCounter,
)
from mage_ai.data_preparation.models.block.dynamic.wrappers import (
    DynamicBlockWrapperBase,
)


class DynamicBlockFactory(DynamicBlockWrapperBase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._counters = None

    def is_complete(self) -> List:
        return False

    @property
    def counters(self) -> Dict[str, DynamicItemCounter]:
        if self._counters is None:
            self._counters = {}
            for upstream_block in self.block.upstream_blocks:
                counter_class = None
                is_dynamic_parent = upstream_block.should_dynamically_generate_block(self.block)
                if upstream_block.is_dynamic_child:
                    if is_dynamic_parent:
                        counter_class = DynamicDuoItemCounter
                    else:
                        counter_class = DynamicChildItemCounter
                else:
                    counter_class = DynamicBlockItemCounter

                if counter_class is not None:
                    self._counters[upstream_block.uuid] = counter_class(
                        upstream_block,
                        partition=self.execution_partition,
                    )

        return self._counters

    def execute_sync(
        self,
        execution_partition: Optional[str] = None,
        logging_tags: Optional[Dict] = None,
        **kwargs,
    ) -> List[Dict]:
        return []
