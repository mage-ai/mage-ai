from typing import Dict
import json


def print_logs_from_output(output) -> Dict:
    from mage_integrations.utils.logger.constants import (
        LOG_LEVEL_ERROR,
        LOG_LEVEL_EXCEPTION,
        TYPE_LOG,
    )

    tags_final = dict()

    for line in output.split('\n'):
        try:
            data = json.loads(line)
            tags = data.get('tags')
            if tags:
                tags_final = tags
            if TYPE_LOG == data.get('type'):
                print(json.dumps(data))
            if data.get('level') in [LOG_LEVEL_ERROR, LOG_LEVEL_EXCEPTION]:
                message = data.get('message')
                if message:
                    if tags:
                        message = f'{message} {json.dumps(tags)}'
                else:
                    message = 'Exception raised, please check logs for more details.'

                raise Exception(message)
        except json.decoder.JSONDecodeError:
            pass

    return tags_final
