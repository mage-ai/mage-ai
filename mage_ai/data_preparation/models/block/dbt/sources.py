import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import yaml

from mage_ai.data_preparation.models.block.dbt.project import Project
from mage_ai.errors.base import MageBaseException

SOURCES_FILE_NAME = 'mage_sources.yml'


class SourcesError(MageBaseException):
    """
    Error while handling mage_sources.yml
    """
    pass


class Sources(object):
    """
    Interface for dbt sources.yml
    - Provide mage_sources.yml as dictionary
    - Adds/cleans/resets sources for pipelines
    """

    def __init__(
        self,
        project_dir: Union[str, os.PathLike],
    ) -> None:
        """
        Interface with a dbt sources.yml.
        It manages a mage_sources.yml in the configured model-path.

        Args:
            project_dir (Union[str, os.PathLike]): path of the dbt project
        """
        self.__project_dir: Union[str, os.PathLike] = project_dir
        self.__model_path: Union[str, os.PathLike] = str(
            Path(self.__project_dir) /
            Project(project_dir).project.get('model-paths', ['models'])[0]
        )
        self.__sources_full_path: Union[str, os.PathLike] = str(
            Path(self.__model_path) / SOURCES_FILE_NAME
        )
        self.__sources = None

    @property
    def sources(self) -> Dict[str, Any]:
        """
        Gets the mage_sources.yml as dictionary.

        Raises:
            SourcesError: Error while handling mage_sources.yml

        Returns:
            Dict: mage_sources.yml as dictionary
        """
        if self.__sources:
            return self.__sources
        # create path if not exists
        if not Path(self.__model_path).exists():
            Path(self.__model_path).mkdir(parents=True)
        # use empty sources if file not exist
        if not Path(self.__sources_full_path).exists():
            self.__sources = {
                'version': 2,
                'sources': []
            }
            return self.__sources
        try:
            with Path(self.__sources_full_path).open('r') as f:
                sources = yaml.safe_load(f.read())
        except Exception as e:
            raise SourcesError(
                f'Failed to load `{SOURCES_FILE_NAME}` in `{self.__model_path}`: {e}'
            )
        # In yaml `key:` is short for `key:None`
        # therefore an empty `sources:` is not a list
        # lazyly just bool testing, as it doesnt matter if empty or None
        if not sources.get('sources'):
            sources.update({'sources': []})
        self.__sources = sources
        return self.__sources

    def add_blocks(
        self,
        project_name: str,
        pipeline_uuid: str,
        block_uuids: List[str],
        schema: Optional[str] = 'public',
        database: Optional[str] = None
    ) -> None:
        """
        Adds block_uuids to the mage_sources.yml pipeline sources.
        Also upserts schema and database.

        Args:
            pipeline_uuid (str):
                the uuid of the pipeline of which sources should be resetted
            block_uuids (List[str]):
                list of blocks to keep as sources in the pipeline
            schema (Optional[str], optional):
                the schema in which the table located. Defaults to 'mage'.
            database (Optional[str], optional):
                the database in which the table located. Defaults to None.
        """
        # get the sources defined for the pipeline
        project_sources = self.__get_project(project_name, schema, database)

        # add each block_uuid
        for block_uuid in block_uuids:
            block_source_new = {
                'name': f'{pipeline_uuid}_{block_uuid}',
                'identifier': f'mage_{pipeline_uuid}_{block_uuid}',
                'meta': {
                    'pipeline_uuid': pipeline_uuid,
                    'block_uuid': block_uuid
                },
                'description':
                    f'Dataframe for block `{block_uuid}` of the `{pipeline_uuid}` mage pipeline.',
            }
            block_source = next(
                (
                    s
                    for s in project_sources['tables']
                    if s.get('name') == f'{pipeline_uuid}_{block_uuid}'
                ),
                None
            )
            if block_source:
                block_source.update(block_source_new)
            else:
                project_sources['tables'].append(block_source_new)

        self.__write()

    def cleanup_pipeline(
        self,
        project_name: str,
        pipeline_uuid: str,
        block_uuids: List[str]
    ) -> None:
        """
        Remove all blocks that are not part of the passed block_uuids from the pipeline
        source mage_sources.yml.

        Args:
            pipeline_uuid (str): the uuid of the pipeline of which sources should be resetted
            block_uuids (List[str]): list of blocks to keep as sources in the pipeline
        """
        sources = self.sources

        # get the sources defined for the pipeline
        project_sources = next(
            (s for s in sources['sources'] if s.get('name') == f'mage_{project_name}'),
            None
        )
        if project_sources:
            project_sources['tables'] = [
                block
                for block in project_sources['tables']
                if block.get('meta', {}).get('pipeline_uuid') != pipeline_uuid or (
                    block.get('meta', {}).get('pipeline_uuid') == pipeline_uuid and
                    block.get('meta', {}).get('block_uuid') in block_uuids
                )
            ]

            # if tables list is empty, then remove the whole pipeline sources dict
            # from mage_sources.yml
            if not project_sources['tables']:
                sources['sources'].remove(project_sources)

        self.__write()

    def reset_pipeline(
        self,
        project_name: str,
        pipeline_uuid: str,
        block_uuids: List[str],
        schema: Optional[str] = 'mage',
        database: Optional[str] = None
    ) -> None:
        """
        Resets the mage_sources.yml pipeline source to the given block_uuids.
        Also upserts schema and database.

        Args:
            pipeline_uuid (str):
                the uuid of the pipeline of which sources should be resetted
            block_uuids (List[str]):
                list of blocks to keep as sources in the pipeline
            schema (Optional[str], optional):
                the schema in which the table located. Defaults to 'mage'.
            database (Optional[str], optional):
                the database in which the table located. Defaults to None.
        """
        self.add_blocks(project_name, pipeline_uuid, block_uuids, schema, database)
        self.cleanup_pipeline(project_name, pipeline_uuid, block_uuids)

    def __get_project(
        self,
        project_name: str,
        schema: Optional[str] = None,
        database: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Gets the pipeline specific sources definition.
        Also upserts schema and database.

        The pipeline name is set as `mage_{pipeline_uuid}`.

        Args:
            pipeline_uuid (str):
                the uuid of the pipeline of which sources should be loaded
            schema (Optional[str], optional):
                the schema in which the table located. Defaults to 'mage'.
            database (Optional[str], optional):
                the database in which the table located. Defaults to None.

        Returns:
            Dict: pipeline specific sources definition
        """
        # read the sources from disk or new empty sources
        sources = self.sources

        # get the sources defined for the pipeline
        project_sources = next(
            (s for s in sources['sources'] if s.get('name') == f'mage_{project_name}'),
            None
        )

        # create pipeline source if not exists
        project_sources_exist = bool(project_sources)
        if not project_sources_exist:
            project_sources = {
                'name': f'mage_{project_name}',
                'description': 'Dataframes Mage upstream blocks',
                'loader': 'mage',
                'tables': []
            }
        if schema:
            project_sources.update({'schema': schema})
        if database:
            project_sources.update({'database': database})

        # as we are using references only in the case of a newly generated dict we need to append it
        # otherwise the reference is already in place and there is nothing to do
        if not project_sources_exist:
            sources['sources'].append(project_sources)

        return project_sources

    def __write(self) -> None:
        """
        Writes the sources to disk.

        Raises:
            SourcesError: Error while handling mage_sources.yml
        """
        try:
            with Path(self.__sources_full_path).open('w') as f:
                yaml.safe_dump(self.__sources, f)
        except Exception as e:
            raise SourcesError(
                f'Failed to write `{SOURCES_FILE_NAME}` in `{self.__model_path}`: {e}'
            )
