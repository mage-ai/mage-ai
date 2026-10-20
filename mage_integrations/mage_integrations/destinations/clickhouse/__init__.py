import argparse
import sys

from clickhouse_sqlalchemy import make_session
from singer_sdk.helpers.capabilities import TargetLoadMethods
from sqlalchemy import create_engine

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.clickhouse.target_clickhouse.target import (
    TargetClickhouse,
)


class Clickhouse(Destination):
    def _process(self, input_buffer) -> None:
        self.config['state_path'] = self.state_file_path
        self.config['load_method'] = TargetLoadMethods.APPEND_ONLY
        TargetClickhouse(config=self.config, logger=self.logger).listen_override(
            file_input=open(self.input_file_path, 'r'))

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
