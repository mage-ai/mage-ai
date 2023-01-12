import json
import yaml


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


class NoDatesSafeLoader(yaml.FullLoader):
    @classmethod
    def remove_implicit_resolver(cls, tag_to_remove):
        """
        Remove implicit resolvers for a particular tag

        Takes care not to modify resolvers in super classes.

        We want to load datetimes as strings, not dates, because we
        go on to serialise as json which doesn't have the advanced types
        of yaml, and leads to incompatibilities down the track.
        """
        if not 'yaml_implicit_resolvers' in cls.__dict__:
            cls.yaml_implicit_resolvers = cls.yaml_implicit_resolvers.copy()

        for first_letter, mappings in cls.yaml_implicit_resolvers.items():
            cls.yaml_implicit_resolvers[first_letter] = [(tag, regexp)
                                                         for tag, regexp in mappings
                                                         if tag != tag_to_remove]


NoDatesSafeLoader.remove_implicit_resolver('tag:yaml.org,2002:timestamp')
