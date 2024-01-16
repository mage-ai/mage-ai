import inspect
import json
import os
import pickle

import pandas as pd
import simplejson

from mage_ai.settings.repo import get_repo_path, get_variables_dir
from mage_ai.shared.parsers import encode_complex

# 1. Remove variables that start or end with an underscore
# 2. Loop through remaining and get its value
# 3. Attempt to serialize the value
# 4. If it can’t be done, then move to the next
# 5. For functions, use inspect.getsource(foo)


def build_path(repo_path: str, partition: str, filename: str = None) -> str:
    path = os.path.join(
        get_variables_dir(repo_path=repo_path),
        '.code_state_manager',
        partition,
    )
    if filename:
        path = os.path.join(path, filename)
    return path


msg_id = 'test'

with open(build_path(get_repo_path(root_project=True), msg_id, 'variables.json'), 'r') as f:
    variables = json.loads(f.read())


class Test:
    def test(self):
        pass


keys = [k for k in locals() if not k.startswith(
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
        type(Test().test),  # method
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

repo_path = get_repo_path(root_project=True)
file_path = os.path.join(repo_path, msg_id, 'outputs.json')
os.makedirs(os.path.join(repo_path, msg_id), exist_ok=True)
pickle_path = os.makedirs(os.path.join(repo_path, msg_id, 'outputs'), exist_ok=True)

for key, value in outputs_to_pickle.items():
    if not value:
        continue
    with open(os.path.join(pickle_path, key), 'wb') as f:
        pickle.dump(value, f)

with open(file_path, 'w') as f:
    f.write(json.dumps(outputs))
