TEST_ACTION = dict(
    action_type='filter',
    axis='row',
    action_code='%{1}.%{1_1} == True and (%{1}.%{1_2} == \"The Quant\" or '
                '%{1}.%{1_2} == \"Yield\")',
    action_arguments=[
        '%{1}.%{1_1}',
        '%{2}.%{2_1}',
    ],
    action_options=dict(
        condition='%{1}.%{1_3} >= %{2}.%{2_2} and %{2}.%{2_2} >= %{1}.%{1_3} - 2592000',
        default=0,
        timestamp_feature_a='%{1}.%{1_2}',
        timestamp_feature_b='%{1}.%{1_3}',
        window=2592000,
    ),
    action_variables={
        '1': dict(type='feature_set_version', feature_set_version=dict(
            feature_set=dict(column_type='category', uuid='omni'),
        )),
        '1_1': dict(type='feature', feature=dict(column_type='number', uuid='deposited')),
        '1_2': dict(type='feature', feature=dict(column_type='category', uuid='fund')),
        '1_3': dict(type='feature', feature=dict(column_type='category', uuid='delivered_at')),
        '1_4': dict(type='feature', feature=dict(column_type='number_with_decimals',
                    uuid='amount')),
        '2': dict(type='feature_set_version', feature_set_version=dict(
            feature_set=dict(column_type='category', uuid='magic'),
        )),
        '2_1': dict(type='feature', feature=dict(column_type='category', uuid='spell')),
        '2_2': dict(type='feature', feature=dict(column_type='category', uuid='booked_at')),
        '3_1': dict(type='feature', feature=dict(column_type='number', uuid='age')),
    },
)
