import json


def print_logs_from_output(output):
    from mage_integrations.utils.logger.constants import LOG_LEVEL_EXCEPTION, TYPE_LOG

    for line in output.split('\n'):
        try:
            data = json.loads(line)
            if TYPE_LOG == data.get('type'):
                print(json.dumps(data))
            if LOG_LEVEL_EXCEPTION == data.get('level'):
                raise Exception(
                  data.get('message') or 'Exception raised, please check logs for more details.',
                )
        except json.decoder.JSONDecodeError:
            pass
