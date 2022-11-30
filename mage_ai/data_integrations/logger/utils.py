from datetime import datetime
from mage_ai.shared.hash import merge_dict
import json


def print_logs_from_output(output: str, logger=None):
    from mage_integrations.utils.logger.constants import (
        LOG_LEVEL_ERROR,
        LOG_LEVEL_EXCEPTION,
        TYPE_LOG,
    )

    for line in output.split('\n'):
        try:
            data = json.loads(line)
            message = data.get('message')
            tags = data.get('tags')

            if 'timestamp' in data:
                message = datetime.fromtimestamp(data['timestamp']).strftime('%Y-%m-%dT%H:%M:%S') \
                            + ' ' + message

            if TYPE_LOG == data.get('type'):
                if logger:
                    data2 = data.copy()
                    if 'message' in data2:
                        del data2['message']
                    if 'tags' in data2:
                        del data2['tags']
                    logger.info(message, tags=merge_dict(tags, data2))
                else:
                    print(json.dumps(data))
            if data.get('level') in [LOG_LEVEL_ERROR, LOG_LEVEL_EXCEPTION]:
                if message:
                    if tags:
                        message = f'{message} {json.dumps(tags)}'
                else:
                    message = 'Exception raised, please check logs for more details.'

                raise Exception(message)
        except json.decoder.JSONDecodeError:
            pass
