import json
from mage_integrations.utils.logger.constants import TYPE_LOG


def print_logs_from_output(output):
    for line in output.split('\n'):
        try:
            data = json.loads(line)
            if TYPE_LOG == data.get('type'):
                print(json.dumps(data))
        except json.decoder.JSONDecodeError:
            pass

