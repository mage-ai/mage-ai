from dataclasses import dataclass, field
from typing import Any, List, Optional

from mage_ai.shared.models import BaseDataClass


@dataclass
class DynamicRun(BaseDataClass):
    block: Any
    block_run: Optional[Any] = None
    clones: List[Any] = field(default_factory=list)

    def add(self, block_run):
        if block_run.block_uuid in [self.block.uuid_replicated, self.block.uuid]:
            self.block_run = block_run
        else:
            self.clones.append(block_run)
