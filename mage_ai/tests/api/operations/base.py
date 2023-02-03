from faker import Faker
from mage_ai.api.operations import constants
from mage_ai.api.operations.base import BaseOperation
from mage_ai.orchestration.db.models import User
from mage_ai.shared.array import find
from mage_ai.tests.base_test import DBTestCase as TestCase
from typing import Dict, List, Union
import inflection


class BaseApiTestCase(TestCase):
    model_class = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.faker = Faker()

    @property
    def model_class_name(self) -> str:
        return self.model_class.__name__.lower()

    @property
    def model_class_name_plural(self) -> str:
        return inflection.pluralize(self.model_class_name)

    def build_operation(self, **kwargs) -> BaseOperation:
        user = None
        if 'user' in kwargs:
            user = kwargs['user']
        else:
            user = User(owner=True)

        return BaseOperation(
            action=kwargs.get('action'),
            meta=kwargs.get('meta', {}),
            options=kwargs.get('options', {}),
            payload=kwargs.get('payload', {}),
            pk=kwargs.get('pk'),
            query=kwargs.get('query', {}),
            resource=kwargs.get('resource'),
            resource_parent=kwargs.get('resource_parent'),
            resource_parent_id=kwargs.get('resource_parent_id'),
            user=user,
        )

    def build_create_operation(self, payload: Dict, **kwargs) -> BaseOperation:
        return self.build_operation(
            action=constants.CREATE,
            payload={
                self.model_class_name: payload,
            },
            resource=self.model_class_name_plural,
            **kwargs,
        )

    def build_delete_operation(self, pk: Union[int, str], **kwargs) -> BaseOperation:
        return self.build_operation(
            action=constants.DELETE,
            pk=pk,
            resource=self.model_class_name_plural,
            **kwargs,
        )

    def build_detail_operation(self, pk: Union[int, str], **kwargs) -> BaseOperation:
        return self.build_operation(
            action=constants.DETAIL,
            pk=pk,
            resource=self.model_class_name_plural,
            **kwargs,
        )

    def build_list_operation(self, **kwargs) -> BaseOperation:
        return self.build_operation(
            action=constants.LIST,
            resource=self.model_class_name_plural,
            **kwargs,
        )

    def build_update_operation(self, pk: Union[int, str], payload: Dict, **kwargs) -> BaseOperation:
        return self.build_operation(
            action=constants.UPDATE,
            payload=payload,
            pk=pk,
            resource=self.model_class_name_plural,
            **kwargs,
        )

    def base_test_execute_create(
        self,
        payload: Dict,
        after_create_count: int = 1,
        before_create_count: int = 0,
        **kwargs,
    ) -> Dict:
        self.assertEqual(self.model_class.query.count(), before_create_count)

        operation = self.build_create_operation(payload, **kwargs)
        response = operation.execute()

        if 'error' in response:
            raise Exception(response['error'])

        self.assertEqual(self.model_class.query.count(), after_create_count)

        return response

    def base_test_execute_delete(
        self,
        pk,
        **kwargs,
    ) -> Dict:
        operation = self.build_delete_operation(pk, **kwargs)
        response = operation.execute()

        if 'error' in response:
            raise Exception(response['error'])

        self.assertIsNone(self.model_class.query.get(pk))

        return response

    def base_test_execute_detail(
        self,
        pk,
        model_dict: Dict,
        **kwargs,
    ) -> Dict:
        operation = self.build_detail_operation(pk, **kwargs)
        response = operation.execute()

        if 'error' in response:
            raise Exception(response['error'])

        for key, value in model_dict.items():
            self.assertEqual(response[self.model_class_name][key], value)

        return response

    def base_test_execute_list(
        self,
        create_payloads: List[Dict] = [{}],
        model_fields_to_check: List[str] = [],
        **kwargs,
    ) -> Dict:
        models = []
        for payload in create_payloads:
            response = self.build_create_operation(payload, **kwargs).execute()
            if 'error' in response:
                raise Exception(response['error'])
            models.append(response[self.model_class_name])

        operation = self.build_list_operation(**kwargs)
        response = operation.execute()

        if 'error' in response:
            raise Exception(response['error'])

        models = response[self.model_class_name_plural]
        for model in models:
            match = find(
                lambda m: all([m[field] == model[field] for field in model_fields_to_check]),
                models,
            )
            self.assertEqual(match, model)

        return response

    def base_test_execute_update(
        self,
        pk,
        payload: Dict,
        key_values_to_check: Dict,
        **kwargs,
    ):
        operation = self.build_update_operation(
            pk,
            {
                self.model_class_name: payload,
            },
            **kwargs,
        )
        response = operation.execute()

        if 'error' in response:
            raise Exception(response['error'])

        model = response[self.model_class_name]
        for key, value in key_values_to_check.items():
            self.assertEqual(model[key], value)

        return response
