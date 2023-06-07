from io import StringIO
from typing import Dict

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.salesforce.target_salesforce.sinks import (
    SalesforceSink,
)
from mage_integrations.destinations.salesforce.target_salesforce.target import (
    TargetSalesforce,
)
from mage_integrations.destinations.sql.base import main


class Salesforce(Destination):
    def __init__(self, argument_parser=False,
                 batch_processing: bool = False,
                 config: Dict = None,
                 config_file_path: str = None,
                 debug: bool = False,
                 input_file_path: str = None,
                 log_to_stdout: bool = False,
                 settings: Dict = None,
                 settings_file_path: str = None,
                 state_file_path: str = None,
                 test_connection: bool = False):

        super().__init__(argument_parser,
                         batch_processing,
                         config,
                         config_file_path,
                         debug,
                         input_file_path,
                         log_to_stdout,
                         settings,
                         settings_file_path,
                         state_file_path,
                         test_connection)

    def process(self, input_buffer) -> None:
        target = TargetSalesforce(config=self.config)
        target.get_sink(SalesforceSink(stream_name='Account'))
        target.listen(file_input=StringIO.readlines(open(self.input_file_path)))


if __name__ == '__main__':
    main(Salesforce)
