import inspect
from uuid import uuid4

import pandas as pd
import simplejson

from mage_ai.server.websockets.code.state_manager import CodeStateManager
from mage_ai.server.websockets.uuids import generalize_msg_id
from mage_ai.shared.parsers import encode_complex


def preprocess_execution(msg_id):
    # 1. Clear variables
    # 2. Store current variable names to file
    try:
        exec(r'%reset -f')
    except Exception as err:
        print(f'[CodeProcessor] preprocess_execution: {err}')

    keys = dir()
    CodeStateManager().save_variables(msg_id, keys)


def postprocess_execution(msg_id):
    # 1. Remove variables that start or end with an underscore
    # 2. Loop through remaining and get its value
    # 3. Attempt to serialize the value
    # 4. If it can’t be done, then move to the next
    # 5. For functions, use inspect.getsource(foo)
    manager = CodeStateManager()
    variables = manager.get_variables(msg_id)

    keys = [k for k in dir() if not k.startswith(
        '__',
    ) and not k.endswith('__') and k not in variables]

    outputs = {}
    outputs_to_pickle = {}

    for key in keys:
        value = globals().get(key)
        if value is None:
            outputs[key] = dict(
                value=None,
                value_type=None,
            )
            continue
        # function
        # method
        # module
        # pd.DataFrame
        value_serialized = value
        value_type = type(value)
        if value_type in [
            type(lambda: 1),  # function
            type(manager.get_variables),  # method
            type(inspect),  # module
        ]:
            outputs[key] = dict(
                value=inspect.getsource(value),
                value_type=str(value_type),
            )
        elif isinstance(value, pd.DataFrame):
            outputs[key] = dict(
                value=value.to_dict('split'),
                value_type=str(value_type),
            )
        else:
            try:
                value_serialized = simplejson.dumps(
                    value,
                    default=encode_complex,
                    ignore_nan=True,
                )
                outputs[key] = dict(
                    value=value_serialized,
                    value_type=str(value_type),
                )
            except Exception as err:
                print(f'[CodeProcessor] serialization: {err}')
                outputs_to_pickle[key] = value

        manager.save_outputs(msg_id, outputs, outputs_to_pickle)


def preprocess(client):
    partition_temp = uuid4().hex
    command = '\n'.join([
        'from mage_ai.server.websockets.code.processor import preprocess_execution',
        f"preprocess_execution('{partition_temp}')"
    ])
    msg_id = client.execute(command)
    CodeStateManager().move_variables(partition_temp, generalize_msg_id(msg_id))


def postprocess(client, msg_id: str):
    command = '\n'.join([
        'from mage_ai.server.websockets.code.processor import preprocess_execution',
        f"postprocess_execution('{generalize_msg_id(msg_id)}')"
    ])
    client.execute(command)
