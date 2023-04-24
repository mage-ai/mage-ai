from netsuitesdk.internal.client import NetSuiteClient


class ExtendedNetSuiteClient(NetSuiteClient):
    def __init__(self, account=None, fetch_child=True, caching=True, caching_timeout=2592000):
        NetSuiteClient.__init__(self, account, caching, caching_timeout)
        # self.set_search_preferences(page_size=100, return_search_columns=True)
        self._search_preferences = self.SearchPreferences(
            bodyFieldsOnly=not(fetch_child),
            pageSize=500,
            returnSearchColumns=True
        )
