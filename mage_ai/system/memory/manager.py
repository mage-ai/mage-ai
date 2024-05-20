import os
from datetime import datetime
from typing import Dict, Optional

import aiofiles

from mage_ai.data.constants import SUPPORTED_VARIABLE_TYPES
from mage_ai.settings.repo import get_variables_dir
from mage_ai.settings.server import (
    MEMORY_MANAGER_PANDAS_VERSION,
    MEMORY_MANAGER_POLARS_VERSION,
    MEMORY_MANAGER_VERSION,
    SYSTEM_LOGS_PARTITIONS,
    SYSTEM_LOGS_POLL_INTERVAL,
)
from mage_ai.shared.files import makedirs_async, makedirs_sync
from mage_ai.system.constants import LOGS_DIRECTORY, SYSTEM_DIRECTORY, LogType
from mage_ai.system.memory.constants import MEMORY_LOGS_DIRECTORY
from mage_ai.system.memory.utils import (
    current_memory_usage,
    format_log_message,
    monitor_memory_usage,
    monitor_memory_usage_async,
)


class MemoryManager:
    def __init__(
        self,
        scope_uuid: str,
        process_uuid: str,
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
        self.monitor_thread = None
        self.poll_interval = poll_interval or SYSTEM_LOGS_POLL_INTERVAL
        self.process_uuid = process_uuid
        self.scope_uuid = scope_uuid
        self.stop_event = None
        self.variables_dir = get_variables_dir(repo_path=repo_path, root_project=False)
        self._log_path = None
        self._metadata = metadata or {}

    @property
    def log_path(self) -> str:
        """
        /root/.mage_data/[project]
            /system/logs
                /[pipeline_uuid]/[block_uuid]/[date]/[hour]
                /[metric]/[process_uuid].log
        """
        if not self._log_path:
            now = datetime.utcnow()

            datetime_partitions = []
            for partition_name in SYSTEM_LOGS_PARTITIONS:
                if 'ds' == partition_name:
                    datetime_partitions.append(now.strftime('%Y-%m-%d'))
                elif 'hr' == partition_name:
                    datetime_partitions.append(now.strftime('%H'))

            self._log_path = os.path.join(
                self.variables_dir,
                SYSTEM_DIRECTORY,
                LOGS_DIRECTORY,
                self.scope_uuid,  # [pipeline_uuid]/[block_uuid]
                *datetime_partitions,
                MEMORY_LOGS_DIRECTORY,
                f'{self.process_uuid}.log',
            )
        return self._log_path

    @property
    def metadata(self) -> Dict:
        supported_variable_types = [v.value for v in SUPPORTED_VARIABLE_TYPES]

        self._metadata.update(
            dict(
                memory_manager_version=MEMORY_MANAGER_VERSION,
                memory_manager_pandas_version=MEMORY_MANAGER_PANDAS_VERSION,
                memory_manager_polars_version=MEMORY_MANAGER_POLARS_VERSION,
                supported_variable_types=supported_variable_types,
            ),
        )
        return self._metadata

    def __enter__(self):
        makedirs_sync(os.path.dirname(self.log_path))

        self.stop()
        self.stop_event, self.monitor_thread = monitor_memory_usage(
            callback=self.__write_sync,
            interval_seconds=self.poll_interval,
        )

        with open(self.log_path, 'a') as f:
            f.write(format_log_message(log_type=LogType.START, metadata=self.metadata))
            f.write(format_log_message(message=current_memory_usage()))
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        try:
            with open(self.log_path, 'a') as f:
                f.write(format_log_message(message=current_memory_usage()))
                f.write(format_log_message(log_type=LogType.END, metadata=self.metadata))
        finally:
            self.stop()

    async def __aenter__(self):
        await makedirs_async(os.path.dirname(self.log_path))

        self.stop()
        self.stop_event, self.monitor_thread = await monitor_memory_usage_async(
            callback=self.__write_async,
            interval_seconds=self.poll_interval,
        )

        async with aiofiles.open(self.log_path, mode='a', encoding='utf-8') as fp:
            await fp.write(format_log_message(log_type=LogType.START, metadata=self.metadata))
            await fp.write(format_log_message(message=current_memory_usage()))
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        try:
            async with aiofiles.open(self.log_path, mode='a', encoding='utf-8') as fp:
                await fp.write(format_log_message(message=current_memory_usage()))
                await fp.write(format_log_message(log_type=LogType.END, metadata=self.metadata))
        finally:
            self.stop()

    def __write_sync(self, memory: float) -> None:
        with open(self.log_path, 'a') as f:
            f.write(format_log_message(message=memory))

    async def __write_async(self, memory: float) -> None:
        async with aiofiles.open(self.log_path, mode='a', encoding='utf-8') as fp:
            await fp.write(format_log_message(message=memory))

    def stop(self) -> None:
        if self.stop_event:
            self.stop_event.set()
            self.stop_event = None
        if self.monitor_thread:
            self.monitor_thread.join()
            self.monitor_thread = None
