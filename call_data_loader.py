from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db import db_connection
from mage_ai.shared.array import find
import datetime
import pandas as pd

db_connection.start_session()

def execute_custom_code():
    block_uuid='bold_bush'
    run_upstream=False
    pipeline = Pipeline(
        uuid='chotot_v2',
        config={'blocks': [{'all_upstream_blocks_executed': True, 'configuration': {'data_provider': 'postgres', 'data_provider_profile': 'default', 'data_provider_schema': 'public', 'export_write_policy': 'append'}, 'downstream_blocks': ['damp_bird'], 'executor_config': None, 'executor_type': 'local_python', 'language': 'sql', 'name': 'bold bush', 'status': 'executed', 'type': 'data_loader', 'upstream_blocks': [], 'uuid': 'bold_bush'}, {'all_upstream_blocks_executed': True, 'configuration': {'data_provider': 'postgres', 'data_provider_profile': 'default', 'data_provider_schema': 'public', 'export_write_policy': 'append'}, 'downstream_blocks': [], 'executor_config': None, 'executor_type': 'local_python', 'language': 'python', 'name': 'damp bird', 'status': 'executed', 'type': 'transformer', 'upstream_blocks': ['bold_bush'], 'uuid': 'damp_bird'}], 'name': 'chotot_v2', 'type': 'python', 'uuid': 'chotot_v2', 'widgets': []},
        repo_config={'ecs_config': None, 'emr_config': {'master_instance_type': 'r5.4xlarge', 'slave_instance_type': 'r5.4xlarge'}, 'notification_config': {'slack_config': {'webhook_url': 'None'}}, 'repo_path': '/home/src/mage_ai/server/default_repo', 'variables_dir': '/home/src/mage_ai/server/default_repo', 'remote_variables_dir': 's3://bucket/path_prefix'},
    )
    block = pipeline.get_block(block_uuid, widget=False)

    code = r'''
select * from dev_chotot_autumn_snowflake_v1 LIMIT 2
    '''

    if run_upstream:
        block.run_upstream_blocks()

    global_vars = {'env': 'dev', 'execution_date': datetime.datetime(2022, 11, 30, 6, 3, 23, 432818), 'event': {}} or dict()


    block_output = block.execute_sync(
        custom_code=code,
        global_vars=global_vars,
        analyze_outputs=True,
        update_status=True,
        test_execution=True,
    )
    if False:
        block.run_tests(custom_code=code, update_tests=False)
    output = block_output['output']

    if False:
        return output
    else:
        return find(lambda val: val is not None, output)

df = execute_custom_code()

# Post processing code below (source: output_display.py)


def __custom_output():
    from datetime import datetime
    from mage_ai.shared.parsers import encode_complex
    from pandas.core.common import SettingWithCopyWarning
    import json
    import pandas as pd
    import simplejson
    import warnings


    warnings.simplefilter(action='ignore', category=SettingWithCopyWarning)


    _internal_output_return = df

    if isinstance(_internal_output_return, pd.DataFrame) and (
        type(_internal_output_return).__module__ != 'geopandas.geodataframe'
    ):
        _sample = _internal_output_return.iloc[:10]
        _columns = _sample.columns.tolist()[:30]
        _rows = json.loads(_sample.to_json(orient='split'))['data']
        _shape = _internal_output_return.shape
        _index = _sample.index.tolist()

        _json_string = simplejson.dumps(
            dict(
                data=dict(
                    columns=_columns,
                    index=_index,
                    rows=_rows,
                    shape=_shape,
                ),
                type='table',
            ),
            default=encode_complex,
            ignore_nan=True,
        )
        return print(f'[__internal_output__]{_json_string}')
    elif type(_internal_output_return).__module__ == 'pyspark.sql.dataframe':
        _sample = _internal_output_return.limit(10).toPandas()
        _columns = _sample.columns.tolist()[:40]
        _rows = _sample.to_numpy().tolist()
        _shape = [_internal_output_return.count(), len(_sample.columns.tolist())]
        _index = _sample.index.tolist()

        _json_string = simplejson.dumps(
            dict(
                data=dict(
                    columns=_columns,
                    index=_index,
                    rows=_rows,
                    shape=_shape,
                ),
                type='table',
            ),
            default=encode_complex,
            ignore_nan=True,
        )
        return print(f'[__internal_output__]{_json_string}')
    elif not False:
        return encode_complex(_internal_output_return)

    return

__custom_output()