from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory

from mage_integrations.utils.logger.constants import (
    LOG_LEVEL_ERROR,
    LOG_LEVEL_EXCEPTION,
    TYPE_LOG,
)
import argparse
import io
import json
import sys


def parse_logs_and_print(input_buffer, logger):

    text_input = io.TextIOWrapper(input_buffer, encoding='utf-8')
    for line in text_input:
        try:
            data = json.loads(line)
            if TYPE_LOG == data.get('type'):
                logger.info(json.dumps(data))
            if data.get('level') in [LOG_LEVEL_ERROR, LOG_LEVEL_EXCEPTION]:
                message = data.get('message')
                tags = data.get('tags')
                if message:
                    if tags:
                        message = f'{message} {json.dumps(tags)}'
                else:
                    message = 'Exception raised, please check logs for more details.'

                raise Exception(message)
            else:
                print(line)
        except json.decoder.JSONDecodeError:
            print(line)


if __name__ == '__main__':
    argument_parser = argparse.ArgumentParser()
    argument_parser.add_argument('--pipeline_uuid', type=str, default=None)
    argument_parser.add_argument('--block_uuid', type=str, default=None)
    argument_parser.add_argument('--execution_partition', type=str, default=None)
    args, _ = argument_parser.parse_known_args()

    pipeline_uuid = args.pipeline_uuid
    block_uuid = args.block_uuid
    execution_partition = args.execution_partition

    logger_manager = LoggerManagerFactory.get_logger_manager(
        pipeline_uuid=pipeline_uuid,
        block_uuid=block_uuid,
        partition=execution_partition,
    )
    logger = DictLogger(logger_manager.logger)
    parse_logs_and_print(sys.stdin.buffer, logger)
