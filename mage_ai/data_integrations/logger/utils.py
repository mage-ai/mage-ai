import json


def print_logs_from_output(output: str):
    from mage_integrations.utils.logger.constants import (
        LOG_LEVEL_ERROR,
        LOG_LEVEL_EXCEPTION,
        TYPE_LOG,
    )

    for line in output.split('\n'):
        try:
            data = json.loads(line)
            if TYPE_LOG == data.get('type'):
                print(json.dumps(data))
            if data.get('level') in [LOG_LEVEL_ERROR, LOG_LEVEL_EXCEPTION]:
                message = data.get('message')
                tags = data.get('tags')
                if message:
                    if tags:
                        message = f'{message} {json.dumps(tags)}'
                else:
                    message = 'Exception raised, please check logs for more details.'

                raise Exception(message)
        except json.decoder.JSONDecodeError:
            pass
