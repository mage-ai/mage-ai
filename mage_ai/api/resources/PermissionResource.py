from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.oauth import Permission, Role, RolePermission
from mage_ai.shared.hash import ignore_keys, index_by, merge_dict


class PermissionResource(DatabaseResource):
    model_class = Permission

    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        only_entity_options = query_arg.get('only_entity_options', [False])
        if only_entity_options:
            only_entity_options = only_entity_options[0]

        if only_entity_options:
            return self.build_result_set(
                [Permission()],
                user,
                **kwargs,
            )

        return super().collection(
            query_arg,
            meta,
            user,
            **kwargs,
        ).order_by(
            Permission.entity_name.asc(),
            Permission.entity_type.asc(),
            Permission.entity_id.asc(),
        )

    @classmethod
    @safe_db_query
    def create(self, payload, user, **kwargs):
        if 'entity_name' not in payload:
            payload['entity_name'] = ''

        return super().create(merge_dict(payload, dict(
            user_id=user.id if user else None,
        )), user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        role_ids = [int(i) for i in payload.get('role_ids') or []]
        roles_mapping = index_by(lambda x: x.id, self.roles or [])

        role_ids_create = []
        role_ids_delete = []

        for role_id in role_ids:
            if role_id not in roles_mapping:
                role_ids_create.append(role_id)

        for role_id in roles_mapping.keys():
            if role_id not in role_ids:
                role_ids_delete.append(role_id)

        if role_ids_create:
            db_connection.session.bulk_save_objects(
                [RolePermission(
                    permission_id=self.model.id,
                    role_id=role_id,
                    user_id=self.current_user.id if self.current_user else None,
                ) for role_id in role_ids_create],
                return_defaults=True,
            )

        if role_ids_delete:
            delete_statement = RolePermission.__table__.delete().where(
                RolePermission.permission_id == self.id,
                RolePermission.role_id.in_(role_ids_delete),
            )
            db_connection.session.execute(delete_statement)

        return super().update(ignore_keys(payload, [
            'role_ids',
        ]), **kwargs)


PermissionResource.register_parent_model('role_id', Role)
