import os
import uuid

from mage_ai.settings.repo import get_repo_path, get_variables_dir

ABSOLUTE_PATH = os.path.abspath(os.path.dirname(__file__))


def build_path(repo_path: str, partition: str, filename: str = None) -> str:
    path = os.path.join(
        get_variables_dir(repo_path=repo_path),
        '.code_state_manager',
        partition,
    )
    if filename:
        path = os.path.join(path, filename)
    return path


def wrap_and_execute(client, code: str) -> str:
    partition = f'__temp_{uuid.uuid4().hex}__'

    with open(os.path.join(ABSOLUTE_PATH, 'pre')) as f:
        pre_code = f.read()
    with open(os.path.join(ABSOLUTE_PATH, 'post')) as f:
        post_code = f.read()

    code = '\n'.join([f'    {c}' for c in code.split('\n')])

    code = '\n'.join([
        pre_code.replace('__MSG_ID__', partition).strip(),
        """
error = None

try:
{}
except Exception as err:
    error = err
""".format(code),
        '\n' * 40,
        post_code.replace('__MSG_ID__', partition).strip(),
        """
if error:
    raise error
""",
    ])

    msg_id = client.execute(code)

    destination_path = build_path(get_repo_path(root_project=True), msg_id)
    os.makedirs(destination_path, exist_ok=True)

    with open(os.path.join(destination_path, 'msg_id_to_temp_uuid'), 'w') as f:
        f.write(partition)

    return msg_id
