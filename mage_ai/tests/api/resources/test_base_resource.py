import secrets
from unittest.mock import patch

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.BaseResource import BaseResource
from mage_ai.api.result_set import ResultSet
from mage_ai.orchestration.db.errors import DoesNotExistError
from mage_ai.orchestration.db.models.base import classproperty
from mage_ai.shared.hash import extract
from mage_ai.tests.api.operations.test_base import BaseApiTestCase


class GenericObject:
    def __init__(self, **kwargs):
        self.uuid = secrets.token_urlsafe()

    @classproperty
    def query(pk):
        return dict(model=1)

    def on_callback(resource):
        return resource

    def on_failure_callback():
        return

    def on_failure_callback_with_resource(resource):
        return resource

    @property
    def attribute_that_does_not_exist_on_resource(self) -> str:
        return self.uuid


class TestBaseResource(BaseResource):
    model_class = GenericObject

    @classmethod
    async def create(self, payload, user, **kwargs):
        self.on_create_callback = GenericObject.on_callback
        self.on_create_failure_callback = GenericObject.on_failure_callback

        super().create(payload, user, **kwargs)

    async def delete(self, **kwargs):
        self.on_delete_callback = GenericObject.on_callback
        self.on_delete_failure_callback = GenericObject.on_failure_callback_with_resource

        super().delete(**kwargs)

    async def update(self, payload, **kwargs):
        self.on_update_callback = GenericObject.on_callback
        self.on_update_failure_callback = GenericObject.on_failure_callback_with_resource

        super().update(payload, **kwargs)


class BaseResourceTest(BaseApiTestCase):
    def test_model_name(self):
        self.assertEqual(TestBaseResource.model_name(), 'TestBase')

    def test_resource_name(self):
        self.assertEqual(TestBaseResource.resource_name(), 'test_bases')

    def test_resource_name_singular(self):
        self.assertEqual(TestBaseResource.resource_name_singular(), 'test_base')

    def test_build_result_set(self):
        options = dict(fire=1, water=2)
        arr = [
            secrets.token_urlsafe(),
            secrets.token_urlsafe(),
        ]
        user = secrets.token_urlsafe()

        result_set = BaseResource.build_result_set(arr, user, **options)
        self.assertTrue(isinstance(result_set, ResultSet))

        self.assertEqual(result_set[0].model, arr[0])
        self.assertEqual(result_set[0].current_user, user)
        self.assertEqual(extract(result_set[0].model_options, options.keys()), options)

        self.assertEqual(result_set[1].model, arr[1])
        self.assertEqual(result_set[1].current_user, user)
        self.assertEqual(extract(result_set[1].model_options, options.keys()), options)

    async def test_process_create(self):
        payload = dict(fire=1, water=2)
        user = secrets.token_urlsafe()
        options = dict(fire=1, water=2)

        with patch.object(TestBaseResource, 'before_create') as mock_before_create:
            with patch.object(GenericObject, 'on_callback') as mock_on_callback:
                with patch.object(BaseResource, 'create') as mock_create:
                    await TestBaseResource.process_create(payload, user, **options)

                    self.assertIsNotNone(TestBaseResource.on_create_callback)
                    self.assertIsNotNone(TestBaseResource.on_create_failure_callback)
                    mock_before_create.assert_called_once()
                    mock_on_callback.assert_called_once()

                    mock_call = mock_create.mock_calls[0]
                    self.assertEqual(payload, mock_call[1][0])
                    self.assertEqual(user, mock_call[1][1])
                    self.assertEqual(options, extract(mock_call[2], options.keys()))

    async def test_process_create_failure(self):
        def _create(payload, user, **kwargs):
            raise Exception

        payload = dict(fire=1, water=2)
        user = secrets.token_urlsafe()
        options = dict(fire=1, water=2)

        with patch.object(TestBaseResource, 'before_create') as mock_before_create:
            with patch.object(GenericObject, 'on_failure_callback') as mock_on_failure_callback:
                with patch.object(BaseResource, 'create', _create):
                    try:
                        await TestBaseResource.process_create(payload, user, **options)
                    except Exception:
                        pass

                    self.assertIsNotNone(TestBaseResource.on_create_callback)
                    self.assertIsNotNone(TestBaseResource.on_create_failure_callback)
                    mock_before_create.assert_called_once()
                    mock_on_failure_callback.assert_called_once()

    async def test_process_collection(self):
        query = dict(fire=1, water=2)
        meta = dict(wind=3)
        user = secrets.token_urlsafe()
        options = dict(lightning=4, rock=5)

        with patch.object(TestBaseResource, 'collection') as mock_collection:
            await TestBaseResource.process_collection(query, meta, user, **options)
            mock_collection.assert_called_once_with(query, meta, user, **options)

    async def test_process_member(self):
        pk = secrets.token_urlsafe()
        user = secrets.token_urlsafe()
        options = dict(lightning=4, rock=5)

        with patch.object(TestBaseResource, 'member') as mock_member:
            await TestBaseResource.process_member(pk, user, **options)
            mock_member.assert_called_once_with(pk, user, **options)

    async def test_process_member_failure(self):
        def _member(_pk, _user, **_kwargs):
            raise DoesNotExistError

        pk = secrets.token_urlsafe()
        user = secrets.token_urlsafe()
        options = dict(lightning=4, rock=5)

        with patch.object(TestBaseResource, 'member', _member):
            error = False
            try:
                await TestBaseResource.process_member(pk, user, **options)
            except (ApiError, DoesNotExistError):
                error = True
            self.assertTrue(error)

    async def test_get_model(self):
        self.assertEqual(await TestBaseResource.get_model('model'), 1)

    def test_parent_model(self):
        model = secrets.token_urlsafe()
        self.assertEqual(TestBaseResource(None, None, parent_model=model).parent_model(), model)

    async def test_process_delete(self):
        options = dict(lightning=4, rock=5)
        resource = TestBaseResource(None, None, **options)

        with patch.object(GenericObject, 'on_callback') as mock_on_callback:
            await resource.process_delete(**options)

            self.assertIsNotNone(resource.on_delete_callback)
            self.assertIsNotNone(resource.on_delete_failure_callback)
            mock_on_callback.assert_called_once()

    async def test_process_delete_failure(self):
        def _delete(**kwargs):
            raise Exception

        options = dict(lightning=4, rock=5)
        resource = TestBaseResource(None, None, **options)

        with patch.object(
            GenericObject,
            'on_failure_callback_with_resource',
        ) as mock_on_failure_callback:
            with patch.object(BaseResource, 'delete', _delete):
                try:
                    await resource.process_delete(**options)
                except Exception:
                    pass

                self.assertIsNotNone(resource.on_delete_callback)
                self.assertIsNotNone(resource.on_delete_failure_callback)
                mock_on_failure_callback.assert_called_once_with(resource=resource)

    async def test_process_update(self):
        payload = dict(fire=1, water=2)
        options = dict(lightning=4, rock=5)
        resource = TestBaseResource(None, None, **options)

        with patch.object(GenericObject, 'on_callback') as mock_on_callback:
            with patch.object(BaseResource, 'update') as mock_update:
                await resource.process_update(payload, **options)

                self.assertIsNotNone(resource.on_update_callback)
                self.assertIsNotNone(resource.on_update_failure_callback)
                mock_on_callback.assert_called_once()

                mock_call = mock_update.mock_calls[0]
                self.assertEqual(payload, mock_call[1][0])
                self.assertEqual(options, extract(mock_call[2], options.keys()))

    async def test_process_update_failure(self):
        def _update(**kwargs):
            raise Exception

        payload = dict(fire=1, water=2)
        options = dict(lightning=4, rock=5)
        resource = TestBaseResource(None, None, **options)

        with patch.object(
            GenericObject,
            'on_failure_callback_with_resource',
        ) as mock_on_failure_callback:
            with patch.object(BaseResource, 'update', _update):
                try:
                    await resource.process_update(payload, **options)
                except Exception:
                    pass

                self.assertIsNotNone(resource.on_update_callback)
                self.assertIsNotNone(resource.on_update_failure_callback)
                mock_on_failure_callback.assert_called_once_with(resource=resource)

    def test_result_set_with_existing_result_set(self):
        value = secrets.token_urlsafe()
        result_sets = dict(TestBaseResource=value)
        resource = TestBaseResource(None, None, result_sets=result_sets)
        self.assertEqual(resource.result_set(), value)

    def test_result_set_with_result_set_from_external(self):
        result_set = ResultSet([])
        resource = TestBaseResource(
            None,
            None,
            result_set_from_external=result_set,
        )
        self.assertEqual(resource.result_set(), result_set)
        self.assertTrue(resource in result_set)

    def test_result_set(self):
        resource = TestBaseResource(
            None,
            None,
        )
        result_set = resource.result_set()
        self.assertIsNotNone(result_set)
        self.assertTrue(resource in result_set)

    def test_collective_load_for_attribute(self):
        key = 'power'
        models = [
            secrets.token_urlsafe(),
            secrets.token_urlsafe(),
            secrets.token_urlsafe(),
        ]

        class Generic:
            def _load(_resource, models=models):
                return models

            def _select(_resource, arr):
                return arr[:2] if arr else arr

        def _collective_loader(key=key):
            return {
                key: dict(
                    load=Generic._load,
                    select=Generic._select,
                ),
            }

        resource = TestBaseResource(None, None)

        with patch.object(TestBaseResource, 'collective_loader', _collective_loader):
            self.assertEqual(resource.power, models[:2])

            def __load(_resource):
                return None

            # Should not call load again.
            with patch.object(Generic, '_load', __load):
                self.assertEqual(resource.power, models[:2])

        self.assertEqual(
            resource.result_set().context.data['TestBaseResource'][key],
            models,
        )

    def test_missing(self):
        model = GenericObject()

        self.assertEqual(
            TestBaseResource(model, None).attribute_that_does_not_exist_on_resource,
            model.attribute_that_does_not_exist_on_resource,
        )
