import json
import os
import uuid
from datetime import datetime

from mage_ai.server.constants import VERSION
from mage_ai.server.websockets.state_manager.constants import (
    CODE_FILENAME,
    MAPPING_FILENAME,
)
from mage_ai.server.websockets.state_manager.utils import build_path
from mage_ai.settings.repo import get_repo_path

ABSOLUTE_PATH = os.path.abspath(os.path.dirname(__file__))


def wrap_and_execute(client, code: str) -> str:
    code_original = code
    partition = f'__temp_{uuid.uuid4().hex}__'

    with open(os.path.join(ABSOLUTE_PATH, 'pre')) as f:
        pre_code = f.read()
    with open(os.path.join(ABSOLUTE_PATH, 'post')) as f:
        post_code = f.read()

    now = datetime.utcnow().timestamp()
    code = '\n'.join([f'    {c}' for c in code.split('\n')])

    code = '\n'.join([
        pre_code.replace('__MSG_ID__', partition).strip(),
        """
error = None

try:
{}
except Exception as err:
    error = err""".format(code),
        post_code.replace('__MSG_ID__', partition).strip(),
        """if error:
    raise error

vars().get('_')
""",
    ])

    msg_id = client.execute(code)

    destination_path = build_path(get_repo_path(root_project=True), msg_id)
    os.makedirs(destination_path, exist_ok=True)

    with open(os.path.join(destination_path, MAPPING_FILENAME), 'w') as f:
        f.write(partition)

    with open(os.path.join(destination_path, CODE_FILENAME), 'w') as f:
        f.write(json.dumps(dict(
            code=code_original,
            mage_version=VERSION,
            timestamp_end=datetime.utcnow().timestamp(),
            timestamp_start=now,
        )))

    return msg_id
