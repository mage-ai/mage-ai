import json
import re
from datetime import datetime
from typing import Dict

from mage_ai.shared.hash import merge_dict
from mage_ai.shared.security import filter_out_config_values


def print_log_from_line(
    line: str,
    config: Dict = None,
    logger=None,
    logging_tags: Dict = None,
    tags: Dict = None,
):
    from mage_integrations.utils.logger.constants import (
        LOG_LEVEL_ERROR,
        LOG_LEVEL_EXCEPTION,
        TYPE_LOG,
    )

    if logging_tags is None:
        logging_tags = dict()
    if tags is None:
        tags = {}

    log_to_print = None
    try:
        data = json.loads(line)

        if type(data) is not dict:
            if type(data) is list and len(data) >= 1:
                log_to_print = json.dumps(data)
        else:
            message = data.get('message')
            tags1 = data.get('tags')

            if 'timestamp' in data:
                message = datetime.fromtimestamp(data['timestamp']).strftime('%Y-%m-%dT%H:%M:%S') \
                            + ' ' + str(message)

            if message and (
                re.match(
                    '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2} Unable to parse:',
                    message,
                ) or
                re.match('Unable to parse:', message)
            ):
                return

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
                        message = filter_out_config_values(message, config)
                        logger.info(
                            message,
                            **merge_dict(
                                logging_tags,
                                dict(tags=merge_dict(tags, updated_tags)),
                            )
                        )
                    except Exception:
                        pass
                else:
                    log_to_print = json.dumps(data)
            if data.get('level') in [LOG_LEVEL_ERROR, LOG_LEVEL_EXCEPTION]:
                if message:
                    if tags1:
                        message = f'{message} {json.dumps(tags1)}'
                else:
                    message = 'Exception raised, please check logs for more details.'

                message = filter_out_config_values(message, config)
                raise Exception(message)

        if log_to_print:
            print(filter_out_config_values(log_to_print, config))
    except json.decoder.JSONDecodeError:
        pass


def print_logs_from_output(
    output: str,
    config: Dict = None,
    logger=None,
    logging_tags: Dict = None,
    tags: Dict = None,
):
    for line in output.split('\n'):
        print_log_from_line(
            line,
            config=config,
            logger=logger,
            logging_tags=logging_tags,
            tags=tags,
        )
