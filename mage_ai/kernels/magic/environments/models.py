from __future__ import annotations

import asyncio
import json
import os
import pickle
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import joblib

from mage_ai.kernels.magic.environments.enums import EnvironmentType, EnvironmentUUID
from mage_ai.kernels.magic.environments.utils import decrypt_secret, encrypt_secret
from mage_ai.settings.repo import get_repo_path, get_variables_dir
from mage_ai.shared.array import flatten
from mage_ai.shared.dates import now
from mage_ai.shared.files import (
    exists_async,
    getsize_async,
    makedirs_async,
    read_async,
    safe_delete_dir_async,
    write_async,
)
from mage_ai.shared.models import BaseDataClass
from mage_ai.shared.path_fixer import remove_base_repo_directory_name

MESSAGES_FILENAME = 'messages'
LOCALS_FILENAME = 'locals.pkl'
OUTPUT_FILENAME = 'output.pkl'
OUTPUT_FILENAME = 'output.pkl'
VARIABLES_FILENAME = 'variables.joblib'
ENVIRONMENT_VARIABLES_FILENAME = 'environment_variables.joblib'


@dataclass
class Environment(BaseDataClass):
    type: EnvironmentType
    uuid: str
    environment_variables: Optional[Dict] = field(default_factory=dict)
    variables: Optional[Dict] = field(default_factory=dict)

    @classmethod
    def get_default(cls) -> Environment:
        return cls(
            uuid=EnvironmentUUID.EXECUTION,
            type=EnvironmentType.CODE,
        )

    @property
    def namespace(self) -> str:
        return os.path.join(self.type, self.uuid)

    def run_process(
        self,
        kernel: Any,
        message: str,
        message_request_uuid: Optional[str] = None,
        output_path: Optional[str] = None,
        process_options: Optional[Dict] = None,
    ) -> Any:
        output_manager = OutputManager.load(
            namespace=self.namespace,
            path=remove_base_repo_directory_name(output_path or get_repo_path()),
            uuid=(message_request_uuid or str(now(True))),
        )

        process = kernel.run(
            message,
            message_request_uuid=message_request_uuid,
            output_manager=output_manager,
            **(process_options or {}),
        )

        return process


@dataclass
class OutputManager(BaseDataClass):
    namespace: str
    path: str
    uuid: str

    @classmethod
    async def get_all_messages(
        cls, namespace: str, path: str, limit: Optional[int] = 10
    ) -> List[Dict]:
        absolute_path = os.path.join(get_variables_dir(), namespace, path)
        paths = sorted(os.listdir(absolute_path), key=lambda x: x.lower())[:limit]
        list_of_messages = await asyncio.gather(*[
            cls.deserialize_output(os.path.join(absolute_path, fpath)) for fpath in paths
        ])
        return flatten(list_of_messages)

    @classmethod
    async def deserialize_output(cls, path: str) -> List[Dict]:
        path = os.path.join(path, MESSAGES_FILENAME)
        if await exists_async(path):
            text = await read_async(path)
            if text:
                return [json.loads(line) for line in text.split('\n') if line.strip()]
        return []

    @property
    def absolute_path(self) -> str:
        return os.path.join(get_variables_dir(), self.namespace, self.path, self.uuid)

    async def get_messages(self, limit: Optional[int] = 10) -> List[Dict]:
        return await self.deserialize_output(os.path.join(self.absolute_path, MESSAGES_FILENAME))

    async def delete(self, if_empty: Optional[bool] = None) -> None:
        if await exists_async(self.absolute_path) and (
            not if_empty or not await getsize_async(self.absolute_path)
        ):
            await safe_delete_dir_async(self.absolute_path)

    async def append_message(self, data: str, filename: Optional[str] = None) -> None:
        await self.__write(filename or MESSAGES_FILENAME, data, flush=True, mode='a')

    async def store_local_variables(self, data: Any, filename: Optional[str] = None) -> None:
        await self.__store_object(filename or LOCALS_FILENAME, data)

    async def store_output(self, data: Any, filename: Optional[str] = None) -> None:
        await self.__store_object(filename or OUTPUT_FILENAME, data)

    async def store_variables(self, data: Dict, filename: Optional[str] = None) -> None:
        await self.__store_object(filename or VARIABLES_FILENAME, data)

    async def store_environment_variables(
        self, data: Dict, filename: Optional[str] = None
    ) -> None:
        await self.__store_object(filename or ENVIRONMENT_VARIABLES_FILENAME, data)

    async def read_encrypted_dictionary(self, filename: str, ckey: Optional[str] = None) -> Dict:
        text = await read_async(os.path.join(self.absolute_path, filename))
        data = {}
        for key, value in json.loads(text):
            data[key] = decrypt_secret(value.encode(), ckey) if isinstance(value, str) else value
        return data

    async def __store_object(self, filename: str, data: Any) -> None:
        await makedirs_async(self.absolute_path)
        with open(os.path.join(self.absolute_path, filename), 'wb') as file:
            pickle.dump(data, file)

    async def __store_encrypted_dictionary(
        self, filename: str, data: Dict, ckey: Optional[str] = None
    ) -> None:
        await makedirs_async(self.absolute_path)
        data_encrypted = {}
        for key, value in data.items():
            data_encrypted[key] = encrypt_secret(value, ckey) if isinstance(value, str) else value

        joblib.dump(
            data_encrypted,
            os.path.join(self.absolute_path, filename),
        )

    async def __write(
        self, filename: str, data: str, flush: Optional[bool] = None, mode: str = 'w'
    ) -> None:
        await makedirs_async(os.path.dirname(self.absolute_path))
        await write_async(
            os.path.join(self.absolute_path, filename),
            data,
            flush=flush,
            mode=mode,
            overwrite=True,
        )
