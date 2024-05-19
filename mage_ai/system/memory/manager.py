import os
from datetime import datetime
from typing import Dict, Optional

import aiofiles

from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.settings.repo import get_variables_dir
from mage_ai.shared.files import makedirs_async, makedirs_sync
from mage_ai.system.constants import LOGS_DIRECTORY, SYSTEM_DIRECTORY, LogType
from mage_ai.system.memory.constants import MEMORY_LOGS_FILENAME
from mage_ai.system.memory.utils import (
    current_memory_usage,
    format_log_message,
    monitor_memory_usage,
    monitor_memory_usage_async,
)


class MemoryManager:
    def __init__(
        self,
        uuid: str,
        poll_interval: Optional[float] = None,
        repo_path: Optional[str] = None,
        metadata: Optional[Dict] = None,
    ):
        """
        Usage example with EnhancedMemoryUsage class for enhanced memory usage tracking:

        def run_operations():
            # Simulating memory usage scenario
            a = [1] * (10**6)
            time.sleep(1)  # Simulate time delay
            b = [2] * (10**6)
            del a  # Manual deletion to potentially influence memory usage metrics

        with EnhancedMemoryUsage() as emu:
            result = emu.profile_memory(run_operations)
        print(emu.report())
        """
        self.monitor = None
        self.poll_interval = poll_interval or 1.0
        self.uuid = uuid
        self.variables_dir = get_variables_dir(repo_path=repo_path, root_project=False)
        self._log_path = None
        self._metadata = metadata or {}
        self.monitor_thread = None
        self.stop_event = None

    @property
    def log_path(self) -> str:
        if not self._log_path:
            now = datetime.utcnow()
            self._log_path = os.path.join(
                self.variables_dir,
                SYSTEM_DIRECTORY,
                LOGS_DIRECTORY,
                self.uuid or '',
                now.strftime('%Y-%m-%d'),
                now.strftime('%H'),
                MEMORY_LOGS_FILENAME,
            )
        return self._log_path

    @property
    def metadata(self) -> Dict:
        if not self._metadata:
            project = Project()
            self._metadata = dict(
                memory_v2=project.is_feature_enabled(FeatureUUID.MEMORY_V2),
                memory_v2_pandas=project.is_feature_enabled(FeatureUUID.MEMORY_V2_PANDAS),
                memory_v2_polars=project.is_feature_enabled(FeatureUUID.MEMORY_V2_POLARS),
            )
        return self._metadata

    def __enter__(self):
        makedirs_sync(os.path.dirname(self.log_path))

        self.stop()
        self.stop_event, self.monitor_thread = monitor_memory_usage(
            callback=self.__write_sync,
            interval_seconds=self.poll_interval,
        )

        if self.metadata:
            with open(self.log_path, 'a') as f:
                f.write(format_log_message(log_type=LogType.INITIAL, metadata=self.metadata))
        self.__write_sync(current_memory_usage())
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        try:
            self.__write_sync(current_memory_usage())
        finally:
            self.stop()

    async def __aenter__(self):
        await makedirs_async(os.path.dirname(self.log_path))

        self.stop()
        self.stop_event, self.monitor_thread = await monitor_memory_usage_async(
            callback=self.__write_async,
            interval_seconds=self.poll_interval,
        )

        if self.metadata:
            async with aiofiles.open(self.log_path, mode='a', encoding='utf-8') as fp:
                await fp.write(format_log_message(log_type=LogType.INITIAL, metadata=self.metadata))
        await self.__write_async(current_memory_usage())
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        try:
            await self.__write_async(current_memory_usage())
        finally:
            self.stop()

    def __write_sync(self, memory: float) -> None:
        with open(self.log_path, 'a') as f:
            f.write(format_log_message(metadata=dict(memory=memory, unit='mb')))

    async def __write_async(self, memory: float) -> None:
        async with aiofiles.open(self.log_path, mode='a', encoding='utf-8') as fp:
            await fp.write(format_log_message(metadata=dict(memory=memory, unit='mb')))

    def stop(self) -> None:
        if self.stop_event:
            self.stop_event.set()
            self.stop_event = None
        if self.monitor_thread:
            self.monitor_thread.join()
            self.monitor_thread = None
