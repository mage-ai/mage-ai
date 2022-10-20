import json


def parse_logs_and_json(input_string: str) -> str:
    logs = []
    lines = []

    for line in input_string.split('\n'):
        is_log = False
        try:
            data = json.loads(line)
            is_log = type(data) is dict and 'LOG' == data.get('type')
        except json.decoder.JSONDecodeError:
            pass
        if is_log:
            logs.append(line)
        else:
            lines.append(line)

    for log in logs:
        print(log)

    return ''.join(lines)
