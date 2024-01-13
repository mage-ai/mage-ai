import os
from dataclasses import dataclass, field
from functools import reduce
from typing import Dict, List, Tuple, Union

import yaml

from mage_ai.data_preparation.models.constants import (
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
    BlockLanguage,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.presenters.interactions.constants import (
    INTERACTIONS_DIRECTORY_NAME,
    InteractionInputStyleInputType,
    InteractionInputType,
    InteractionVariableType,
)
from mage_ai.presenters.interactions.utils import interpolate_content
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.models import BaseDataClass


@dataclass
class InteractionInputOption(BaseDataClass):
    label: str = None
    value: Union[bool, float, int, str] = None

    def to_dict(self, **kwargs) -> Dict:
        return dict(
            label=self.label,
            value=self.value,
        )


@dataclass
class InteractionInputStyle:
    input_type: InteractionInputStyleInputType = None
    language: str = None
    multiline: bool = None

    def __post_init__(self):
        if self.input_type and isinstance(self.input_type, str):
            self.input_type = InteractionInputStyleInputType(self.input_type)

    def to_dict(self) -> Dict:
        return dict(
            input_type=self.input_type.value if self.input_type else None,
            multiline=self.multiline,
        )


@dataclass
class InteractionInput:
    options: List[InteractionInputOption] = field(default_factory=list)
    style: InteractionInputStyle = None
    type: InteractionInputType = None

    def __post_init__(self):
        if self.options and isinstance(self.options, list):
            self.options = [InteractionInputOption(**i) for i in self.options]

        if self.style and isinstance(self.style, dict):
            self.style = InteractionInputStyle(**self.style)

        if self.type and isinstance(self.type, str):
            self.type = InteractionInputType(self.type)

    def to_dict(self, **kwargs) -> Dict:
        return dict(
            options=[i.to_dict(**kwargs) for i in self.options],
            style=self.style.to_dict(**kwargs) if self.style else None,
            type=self.type.value if self.type else None,
        )


@dataclass
class InteractionLayoutItem:
    variable: str = None
    width: int = None

    def to_dict(self) -> Dict:
        return dict(
            variable=self.variable,
            width=self.width,
        )


@dataclass
class InteractionVariable:
    description: str = None
    input: str = None
    name: str = None
    required: bool = None
    types: List[InteractionVariableType] = field(default_factory=list)
    uuid: str = None

    def __post_init__(self):
        if self.types and isinstance(self.types, list):
            self.types = [InteractionVariableType(t) for t in self.types]

    def to_dict(self) -> Dict:
        return dict(
            description=self.description,
            input=self.input,
            name=self.name,
            required=self.required,
            types=[i.value for i in self.types],
            uuid=self.uuid,
        )


class Interaction:
    def __init__(
        self,
        uuid: str,
        content: str = None,
        inputs: Dict = None,
        layout: List = None,
        pipeline=None,
        variables: Dict = None,
    ) -> None:
        self.pipeline = pipeline
        self.uuid = uuid

        self._content = content
        self._content_parsed = None

    @property
    def content(self) -> str:
        if self._content is None:
            self._content = self.file.content()
        return self._content

    @property
    def language(self) -> BlockLanguage:
        _filename, file_extension = os.path.splitext(self.uuid)
        return FILE_EXTENSION_TO_BLOCK_LANGUAGE.get(file_extension.replace('.', ''))

    async def content_async(self) -> str:
        if self._content is None:
            self._content = await self.file.content_async()
        return self._content

    async def content_parsed(self, interpolate_variables: bool = False) -> Dict:
        if self._content_parsed is not None or \
                BlockLanguage.YAML != self.language:

            return self._content_parsed

        text = await self.content_async()
        self._content_parsed = yaml.safe_load(
            interpolate_content(text, self.__pipeline_variables) if interpolate_variables else text,
        )

        return self._content_parsed

    def delete(self) -> None:
        self.file.delete()

    def exists(self) -> bool:
        return self.file.exists()

    async def inputs(self) -> Dict:
        mapping = {}
        settings = await self.content_parsed() or {}
        for uuid, item in (settings.get('inputs') or {}).items():
            mapping[uuid] = InteractionInput(**item)

        return mapping

    async def layout(self) -> Dict:
        settings = await self.content_parsed() or {}
        rows = []
        for row in (settings.get('layout') or []):
            items = []
            for item in row:
                items.append(InteractionLayoutItem(**item))
            rows.append(items)

        return rows

    async def variables(self) -> Dict:
        mapping = {}
        settings = await self.content_parsed() or {}
        for uuid, item in (settings.get('variables') or {}).items():
            mapping[uuid] = InteractionVariable(**item)

        return mapping

    async def validate(
        self,
        content: str = None,
        content_parsed: Dict = None,
    ) -> None:
        settings = content_parsed or yaml.safe_load(content)

        for _uuid, item in (settings.get('inputs') or {}).items():
            InteractionInput(**item)

        for row in (settings.get('layout') or []):
            for item in row:
                InteractionLayoutItem(**item)

        for _uuid, item in (settings.get('variables') or {}).items():
            InteractionVariable(**item)

    async def update(
        self,
        commit: bool = True,
        content: str = None,
        content_parsed: Dict = None,
    ) -> None:
        if content or content_parsed:
            await self.validate(content=content, content_parsed=content_parsed)

        if content:
            self._content = content
        elif content_parsed:
            self._content = yaml.safe_dump(content_parsed)
            self._content_parsed = content_parsed

        if not commit:
            return

        await self.save()

    async def save(self) -> None:
        await self.file.update_content_async(self._content or '')

    async def to_dict_base(self) -> Dict:
        if BlockLanguage.PYTHON == self.language:
            return

        def _convert(item_tuple: Tuple) -> Dict:
            uuid, item = item_tuple

            return {
                uuid: item.to_dict(),
            }

        items_inputs = await self.inputs()
        items_layout = await self.layout()
        items_variables = await self.variables()

        return dict(
            inputs=reduce(
                lambda acc, tup: merge_dict(acc, _convert(tup)),
                items_inputs.items(),
                {},
            ),
            layout=[[item.to_dict() for item in row] for row in items_layout],
            variables=reduce(
                lambda acc, tup: merge_dict(acc, _convert(tup)),
                items_variables.items(),
                {},
            ),
        )

    async def to_dict(self, include_content: bool = False) -> Dict:
        data = dict(
            language=self.language,
            uuid=self.uuid,
        )

        if include_content:
            data['content'] = await self.content_async()

        return merge_dict(await self.to_dict_base(), data)

    @property
    def file(self) -> File:
        return File.from_path(self.file_path)

    @property
    def file_path(self) -> str:
        return os.path.join(
            self.__repo_path or os.getcwd(),
            INTERACTIONS_DIRECTORY_NAME,
            self.uuid,
        )

    @property
    def __pipeline_variables(self) -> Dict:
        return self.pipeline.variables if self.pipeline else None

    @property
    def __repo_path(self) -> str:
        return self.pipeline.repo_path if self.pipeline is not None else get_repo_path()
