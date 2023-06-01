# pylint: disable=protected-access
import singer
LOGGER = singer.get_logger()


class Soap:

    def __init__(self, ns):
        self.ns = ns
        self.ns_client = self.ns.ns_client

    def query(self, catalog_entry, state):
        start_date = self.ns.get_start_date(state, catalog_entry)
        stream = catalog_entry['stream']
        return self._query_recur(stream=stream, start_date_str=start_date)

    # pylint: disable=too-many-arguments
    def _query_recur(
            self,
            stream,
            start_date_str):
        return self.ns_client.query_entity(stream,
                                           {'searchValue': start_date_str,
                                            'type': 'dateTime',
                                            'operator': 'onOrAfter'})
