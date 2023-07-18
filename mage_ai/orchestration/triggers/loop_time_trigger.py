import asyncio
import time

from mage_ai.orchestration.triggers.time_trigger import TimeTrigger


class LoopTimeTrigger(TimeTrigger):
    async def start(self) -> None:
        task = asyncio.current_task()
        while not task.done():
            self.last_run_time = int(time.time())
            self.run()
            current_time = int(time.time())
            sleep_time = self.trigger_interval - (current_time - self.last_run_time)
            await asyncio.sleep(sleep_time)
