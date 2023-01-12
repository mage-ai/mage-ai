from mage_integrations.destinations.sql.base import Destination, main
from mage_integrations.destinations.trino.connectors.postgresql import TrinoPostgreSQL
import copy


class Trino(Destination):
    def __new__(self, argument_parser, **kwargs):
        argument_parser_copy = copy.deepcopy(argument_parser)
        config = Destination(
            argument_parser=argument_parser_copy,
            **kwargs,
        ).config
        catalog = config['catalog']

        klass = TrinoPostgreSQL
        if 'postgresql' == catalog:
            klass = TrinoPostgreSQL

        return klass(argument_parser=argument_parser, **kwargs)


if __name__ == '__main__':
    main(Trino)
