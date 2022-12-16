from datetime import datetime
from mage_ai.shared.hash import merge_dict
from typing import Dict
import json


def print_logs_from_output(
    output: str,
    logger=None,
    tags: Dict = {},
):
    from mage_integrations.utils.logger.constants import (
        LOG_LEVEL_ERROR,
        LOG_LEVEL_EXCEPTION,
        TYPE_LOG,
    )

    for line in output.split('\n'):
        try:
            data = json.loads(line)

            if type(data) is not dict:
                if type(data) is list and len(data) >= 1:
                    print(json.dumps(data))
                continue

            message = data.get('message')
            tags1 = data.get('tags')

            if 'timestamp' in data:
                message = datetime.fromtimestamp(data['timestamp']).strftime('%Y-%m-%dT%H:%M:%S') \
                            + ' ' + str(message)

            if TYPE_LOG == data.get('type'):
                if logger:
                    data2 = data.copy()
                    if 'message' in data2:
                        del data2['message']
                    if 'tags' in data2:
                        del data2['tags']

                    updated_tags = tags1
                    try:
                        updated_tags.update(data2)
                    except Exception:
                        pass

                    logger.info(message, tags=merge_dict(tags, updated_tags))
                else:
                    print(json.dumps(data))
            if data.get('level') in [LOG_LEVEL_ERROR, LOG_LEVEL_EXCEPTION]:
                if message:
                    if tags1:
                        message = f'{message} {json.dumps(tags1)}'
                else:
                    message = 'Exception raised, please check logs for more details.'

                raise Exception(message)
        except json.decoder.JSONDecodeError:
            pass
