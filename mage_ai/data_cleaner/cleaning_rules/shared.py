def build_action_variables(columns, column_types):
    variable_set = {}
    for column_name in columns:
        variable_set[column_name] = {
            'feature': {
                'column_type': column_types[column_name],
                'uuid': column_name,
            },
            'type': 'feature',
        }
    return variable_set
