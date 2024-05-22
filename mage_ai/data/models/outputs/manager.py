from typing import List, Optional

from mage_ai.data.models.outputs.models import BaseOutput


class OutputManager:
    def __init__(self, outputs: Optional[List[BaseOutput]] = None):
        self.output = outputs or []

    def append(self, output: BaseOutput):
        self.output.append(output)

    def render(self):
        pass

    async def render_async(self):
        pass
