from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Any, Dict, List, Union

from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.shared.models import BaseDataClass


@dataclass
class HookPredicate(BaseDataClass):
    resource: Dict = field(default_factory=dict)

    @classmethod
    def valid_predicates(
        self,
        predicates: List,
        operation_resource: Union[BaseResource, Block, Dict, List[BaseResource], Pipeline],
        hook=None,
        resource_id: Union[int, str] = None,
        resource_parent_id: Union[int, str] = None,
        user: Dict = None,
    ) -> List:
        return any([all([predicate.validate(
            hook=hook,
            operation_resource=operation_resource,
            resource_id=resource_id,
            resource_parent_id=resource_parent_id,
            user=user,
        ) for predicate in predicates]) for predicates in predicates])

    def validate(
        self,
        operation_resource: Union[BaseResource, Block, Dict, List[BaseResource], Pipeline],
        hook=None,
        resource_id: Union[int, str] = None,
        resource_parent_id: Union[int, str] = None,
        user: Dict = None,
    ) -> bool:
        if not self.resource or len(self.resource) == 0:
            return True

        def _validate_resource(
            resource: Union[BaseResource, Block, Dict, Pipeline],
            predicate=self,
        ) -> bool:
            model = resource
            if isinstance(resource, BaseResource):
                model = resource.model

            def _equals(
                key: str,
                value: Any,
                model=model,
            ) -> bool:
                if isinstance(model, dict):
                    return model.get(key) == value

                return hasattr(model, key) and getattr(model, key) == value

            check = all([_equals(key, value) for key, value in predicate.resource.items()])

            return check

        if isinstance(operation_resource, Iterable) and not isinstance(operation_resource, dict):
            return all([_validate_resource(res) for res in operation_resource])

        return _validate_resource(operation_resource)
