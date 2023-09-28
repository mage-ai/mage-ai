from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.data_preparation.repo_manager import get_variables_dir
from mage_ai.data_preparation.variable_manager import (
    VariableManager,
    delete_global_variable,
    get_global_variables,
    set_global_variable,
)
from mage_ai.orchestration.db import safe_db_query


def get_variable_value(
    variable_manager: VariableManager,
    pipeline_uuid: str,
    block_uuid: str,
    variable_uuid: str,
) -> Dict:
    variable = variable_manager.get_variable_object(
        pipeline_uuid,
        block_uuid,
        variable_uuid,
    )
    if variable.variable_type in [VariableType.DATAFRAME, VariableType.GEO_DATAFRAME]:
        value = 'DataFrame'
        variable_type = 'pandas.DataFrame'
    else:
        value = variable.read_data(sample=True)
        variable_type = str(type(value))
    return dict(
        uuid=variable_uuid,
        type=variable_type,
        value=value,
    )


class VariableResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query, meta, user, **kwargs):
        pipeline_uuid = kwargs['parent_model'].uuid

        global_only = query.get('global_only', [False])
        if global_only:
            global_only = global_only[0]

        # Get global variables from project's path
        global_variables = [
            dict(
                uuid=uuid,
                type=str(type(value)),
                value=value
            )
            for uuid, value in get_global_variables(pipeline_uuid).items()
        ]
        global_variables_arr = [
            dict(
                block=dict(uuid='global'),
                pipeline=dict(uuid=pipeline_uuid),
                variables=global_variables,
            )
        ]
        variables = global_variables_arr
        if not global_only:
            variable_manager = VariableManager(variables_dir=get_variables_dir())
            variables_dict = variable_manager.get_variables_by_pipeline(pipeline_uuid)
            variables = [
                dict(
                    block=dict(uuid=uuid),
                    pipeline=dict(uuid=pipeline_uuid),
                    variables=[
                        get_variable_value(
                            variable_manager,
                            pipeline_uuid,
                            uuid,
                            var,
                        ) for var in arr
                        # Not return printed outputs
                        if var == 'df' or var.startswith('output')
                    ],
                )
                for uuid, arr in variables_dict.items() if uuid != 'global'
            ] + global_variables_arr

        return self.build_result_set(
            variables,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    def create(self, payload: Dict, user, **kwargs) -> 'VariableResource':
        pipeline_uuid = kwargs['parent_model'].uuid

        error = ApiError.RESOURCE_INVALID.copy()

        variable_uuid = payload.get('name')
        if not variable_uuid.isidentifier():
            error.update(message=f'Invalid variable name syntax for variable name {variable_uuid}.')
            raise ApiError(error)

        variable_value = payload.get('value')
        if variable_value is None:
            error.update(message=f'Value is empty for variable name {variable_uuid}.')
            raise ApiError(error)

        set_global_variable(
            pipeline_uuid,
            variable_uuid,
            variable_value,
        )

        global_variables = get_global_variables(pipeline_uuid)

        return self(dict(
            block=dict(uuid='global'),
            name=variable_uuid,
            pipeline=dict(uuid=pipeline_uuid),
            value=variable_value,
            variables=list(global_variables.keys()),
        ), user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        return self(dict(name=pk), user, **kwargs)

    @safe_db_query
    def update(self, payload, **kwargs):
        pipeline_uuid = kwargs['parent_model'].uuid

        error = ApiError.RESOURCE_INVALID.copy()

        variable_uuid = payload.get('name')
        if not variable_uuid.isidentifier():
            error.update(message=f'Invalid variable name syntax for variable name {self.name}.')
            raise ApiError(error)

        variable_value = payload.get('value')
        if variable_value is None:
            error.update(message=f'Value is empty for variable name {self.name}.')
            raise ApiError(error)

        set_global_variable(
            pipeline_uuid,
            variable_uuid,
            variable_value,
        )

        global_variables = get_global_variables(pipeline_uuid)

        self.model.update(dict(
            block=dict(uuid='global'),
            name=variable_uuid,
            pipeline=dict(uuid=pipeline_uuid),
            value=variable_value,
            variables=list(global_variables.keys()),
        ))

        return self

    @safe_db_query
    def delete(self, **kwargs):
        pipeline_uuid = kwargs['parent_model'].uuid
        delete_global_variable(pipeline_uuid, self.name)
        return self
