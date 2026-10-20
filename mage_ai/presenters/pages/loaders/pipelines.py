import asyncio
from typing import Any, Dict, List, Union

from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.presenters.pages.loaders.base import BaseLoader
from mage_ai.settings.repo import get_repo_path


async def get_pipeline(uuid: str, repo_path: str) -> Pipeline:
    try:
        return await Pipeline.get_async(uuid, repo_path=repo_path)
    except Exception as err:
        err_message = f'Error loading pipeline {uuid}: {err}.'
        if err.__class__.__name__ == 'OSError' and 'Too many open files' in err.strerror:
            raise Exception(err_message)
        else:
            print(err_message)
            return None


class Loader(BaseLoader):
    @classmethod
    async def load(self, ids: List[Union[int, str]], query: Dict = None, **kwargs) -> List[Any]:
        repo_path = get_repo_path()
        return await asyncio.gather(*[get_pipeline(uuid, repo_path) for uuid in ids])
