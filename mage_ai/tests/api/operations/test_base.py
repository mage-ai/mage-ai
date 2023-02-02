from mage_ai.api.operations import constants
from mage_ai.api.operations.base import BaseOperation
from mage_ai.orchestration.db.models import User
from mage_ai.tests.base_test import DBTestCase as TestCase
from faker import Faker


fake = Faker()


def build_operation(**kwargs) -> BaseOperation:
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
        user=kwargs.get('user', User(owner=True)),
    )


class BaseOperationTests(TestCase):
    def test_execute_create(self):
        operation = build_operation(
            action=constants.CREATE,
            payload=dict(user=dict(
                email='fire@mage.ai',
                password='water',
                password_confirmation='water',
            )),
            resource='users',
        )
        self.assertEqual(User.query.count(), 0)
        response = operation.execute()
        self.assertEqual(User.query.count(), 1)
        self.assertEqual(User.query.get(response['user']['id']).email, 'fire@mage.ai')

    # def test_execute_delete(self):
    #     group = Group(name='Omni')
    #     group.save()
    #     self.assertEqual(Group.objects.get(pk=group.pk).id, group.id)
    #     operation = build_operation(
    #         action=constants.DELETE,
    #         pk=group.id,
    #     )
    #     operation.execute()
    #     with self.assertRaisesMessage(
    #         Group.DoesNotExist,
    #         '',
    #     ):
    #         Group.objects.get(pk=group.pk)

    # This test fails on Travis with a SQL Lite syntax error but it doesn't happen locally.
    # def test_execute_detail(self):
    #     group = Group(name='Omni')
    #     group.save()
    #     operation = build_operation(
    #         action=constants.DETAIL,
    #         pk=group.id,
    #     )
    #     response = operation.execute()
    #     self.assertEqual(
    #         response,
    #         {
    #             'group': {
    #                 'entities_count': 0,
    #                 'features_count': 0,
    #                 'id': group.id,
    #                 'models_count': 0,
    #                 'name': group.name,
    #             },
    #         },
    #     )

    # def test_execute_list(self):
    #     group = Group(name=fake.name())
    #     group.save()
    #     user1 = User(username=fake.name())
    #     user1.save()
    #     membership1 = GroupMembership(group_id=group.id, role=GroupMembership.Role.OWNER, user_id=user1.id)
    #     membership1.save()
    #     user2 = User(username=fake.name())
    #     user2.save()
    #     membership2 = GroupMembership(group_id=group.id, user_id=user2.id)
    #     membership2.save()
    #     operation = build_operation(
    #         action=constants.LIST,
    #         resource='group_memberships',
    #         resource_parent='groups',
    #         resource_parent_id=group.id,
    #         user=user1,
    #     )
    #     response = operation.execute()
    #     self.assertEqual(
    #         response,
    #         {
    #             'group_memberships': [
    #                 {
    #                     'id': membership1.id,
    #                     'group_id': group.id,
    #                     'user': {
    #                         'email': user1.email,
    #                         'id': user1.id,
    #                         'first_name': user1.first_name,
    #                         'last_name': user1.last_name,
    #                     },
    #                     'role': membership1.role,
    #                 },
    #                 {
    #                     'id': membership2.id,
    #                     'group_id': group.id,
    #                     'user': {
    #                         'email': user2.email,
    #                         'id': user2.id,
    #                         'first_name': user2.first_name,
    #                         'last_name': user2.last_name,
    #                     },
    #                     'role': membership2.role,
    #                 },
    #             ],
    #             'metadata': {
    #                 'count': 2,
    #                 'next': False,
    #             },
    #         },
    #     )

    # def test_execute_update(self):
    #     group = Group(name='Omni')
    #     group.save()
    #     operation = build_operation(
    #         action=constants.UPDATE,
    #         pk=group.id,
    #         payload={
    #             'group': {
    #                 'name': 'Omni updated',
    #             },
    #         },
    #     )
    #     response = operation.execute()
    #     self.assertEqual(Group.objects.get(pk=group.pk).name, 'Omni updated')
