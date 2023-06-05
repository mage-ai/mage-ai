from mage_integrations.destinations.base import Destination

from mage_integrations.destinations.salesforce.target_salesforce.sinks import SalesforceSink
from mage_integrations.destinations.salesforce.target_salesforce.target import TargetSalesforce
from typing import Dict
import sys
from io import StringIO



class salesforce_Test(Destination):
    def __init__(self, argument_parser=None, 
                batch_processing: bool = False, 
                config: Dict = None, 
                config_file_path: str = None, 
                debug: bool = False, 
                input_file_path: str = None,
                log_to_stdout: bool = False, 
                logger=..., 
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
        logger, 
        settings, 
        settings_file_path, 
        state_file_path, 
        test_connection)

        TargetSalesforce(config={
    "username": "luis@sandbox.com",
    "password": "Teste123",
    "domain": "login",
    "security_token": "2h2XG9ndeTxTYzp4Be435wje",
    "action": "insert"
}).listen(sys.stdin.buffer)
        


salesforce_Test()
    



