import argparse
import traceback
import sys
from sqlalchemy import create_engine
from clickhouse_sqlalchemy import make_session
from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.clickhouse.target_clickhouse.target import (
    TargetClickhouse,
)


class Clickhouse(Destination):
    def process(self, input_buffer) -> None:
        self.config['state_path'] = self.state_file_path
        class_name = self.__class__.__name__
        try:
            if self.should_test_connection:
                self.logger.info('Testing connection...')
                self.test_connection()
            else:
                TargetClickhouse(config=self.config, logger=self.logger).listen_override(
                    file_input=open(self.input_file_path, 'r'))
        except Exception as err:
            message = f'{class_name} process failed with error {err}.'
            self.logger.exception(message, tags=dict(
                error=str(err),
                errors=traceback.format_stack(),
                message=traceback.format_exc(),
            ))
            raise Exception(message)

    def test_connection(self) -> None:
        engine = create_engine(self.config['sqlalchemy_url'])
        session = make_session(engine)
        session.connection()


if __name__ == '__main__':
    destination = Clickhouse(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
