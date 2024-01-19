import asyncio
import os
import shutil
from pathlib import Path
from typing import List, Tuple

import aiofiles
import simplejson

from mage_ai.server.websockets.state_manager.constants import (
    MAPPING_FILENAME,
    RESULTS_DIRECTORY_NAME,
    RESULTS_FILENAME,
    VARS_DIRECTORY_NAME,
)
from mage_ai.settings.repo import get_repo_path, get_variables_dir
from mage_ai.shared.files import get_all_files_up_to_depth_level
from mage_ai.shared.parsers import encode_complex

MAX_OUTPUTS = 500


def build_path(
    repo_path: str = None,
    partition: str = None,
    filename: str = None,
) -> str:
    """
    partition is typically the msg_id of the websocket output/message
    """
    return os.path.join(*[part for part in [
        get_variables_dir(repo_path=repo_path or get_repo_path(root_project=True)),
        VARS_DIRECTORY_NAME,
        partition,
        filename,
    ] if part and len(part) >= 1])


def get_paths_for_all_folder_types() -> Tuple[List, List]:
    paths = sorted(Path(build_path()).iterdir(), key=os.path.getmtime, reverse=True)
    reals = []
    temps = []

    for path in paths:
        if path.name.startswith('.'):
            continue
        if path.name.startswith('__') and path.name.endswith('__'):
            temps.append(path)
        else:
            reals.append(path)

    return reals, temps


def clean_up_directories():
    reals, temps = get_paths_for_all_folder_types()
    for full_path in (reals[MAX_OUTPUTS:] + temps[MAX_OUTPUTS:]):
        try:
            shutil.rmtree(full_path)
        except Exception as err:
            print(f'[CodeStateManager] clean_up_directories: {err}')


async def move_files_from_temp_folders():
    # 1. Get the temp folder name from the mapping files
    # 2. Merge both directories into the folder named after the msg_id
    # 3. Delete the temp folder

    paths = get_all_files_up_to_depth_level(
        build_path(),
        2,
    )
    paths = [path for path in paths if Path(path).parts[-1] == MAPPING_FILENAME]

    async def read_content_async(file_path: str) -> Tuple[str, str]:
        temp_folder_name = None
        if os.path.exists(file_path):

            async with aiofiles.open(file_path, mode='r') as f:
                temp_folder_name = await f.read()
                temp_folder_name = temp_folder_name.strip()

        return (file_path, temp_folder_name)

    pairs = await asyncio.gather(*[read_content_async(path) for path in paths])

    for file_path, temp_folder_name in pairs:
        if not temp_folder_name:
            continue

        dst_dir_path = os.path.dirname(file_path)
        temp_folder_path = build_path(partition=temp_folder_name)

        if os.path.exists(temp_folder_path):
            shutil.copytree(temp_folder_path, dst_dir_path, dirs_exist_ok=True)
            shutil.rmtree(temp_folder_path)


async def save_message_output(message):
    full_path = build_path(partition=message.msg_id, filename=RESULTS_FILENAME)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    async with aiofiles.open(full_path, 'w') as fp:
        await fp.write(simplejson.dumps(
            message.to_dict(),
            default=encode_complex,
            ignore_nan=True,
        ))


async def save_child_message_output(message):
    full_path = os.path.join(
        build_path(partition=message.parent_message.msg_id),
        RESULTS_DIRECTORY_NAME,
        f'{message.msg_id}.json',
    )
    os.makedirs(os.path.dirname(full_path), exist_ok=True)

    async with aiofiles.open(full_path, 'w') as fp:
        await fp.write(simplejson.dumps(
            message.to_dict(),
            default=encode_complex,
            ignore_nan=True,
        ))
