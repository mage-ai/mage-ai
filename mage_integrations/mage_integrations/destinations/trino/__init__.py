from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.trino.connectors.base import TrinoConnector
from mage_integrations.destinations.trino.connectors.deltalake import TrinoDeltalake
from mage_integrations.destinations.trino.connectors.iceberg import TrinoIceberg
import copy


class Trino(Destination):
    def __new__(self, argument_parser, **kwargs):
        argument_parser_copy = copy.deepcopy(argument_parser)
        config = Destination(
            argument_parser=argument_parser_copy,
            **kwargs,
        ).config
        connector = config['connector']

        klass = TrinoConnector
        if 'iceberg' == connector:
            klass = TrinoIceberg
        elif 'delta-lake' == connector:
            klass = TrinoDeltalake

        return klass(argument_parser=argument_parser, **kwargs)


if __name__ == '__main__':
    main(Trino)
