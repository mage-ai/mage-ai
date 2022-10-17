import json


def print_logs_from_output(output):
    from mage_integrations.utils.logger.constants import TYPE_LOG

    for line in output.split('\n'):
        try:
            data = json.loads(line)
            if TYPE_LOG == data.get('type'):
                print(json.dumps(data))
        except json.decoder.JSONDecodeError:
            pass
