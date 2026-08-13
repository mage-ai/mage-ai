from typing import Any, Dict, Generator, Iterable, List, Mapping, Optional


class BaseStream:
    KEY_PROPERTIES = []

    URL_PATH = None

    def __init__(self, client, config, stream, logger):
        self.client = client
        self.config = config
        self.stream = stream
        self.logger = logger

    def load_data(self, bookmarks: Dict = None) -> Generator[List[Dict], None, None]:

        bookmarks = bookmarks or {}
        next_page_token = None
        account_id = str(bookmarks.get('account_id')) if bookmarks else None
        customer_id = str(bookmarks.get('customer_id')) if bookmarks else None

        while True:
            params = self.request_params(
                stream_state=stream_state,
                stream_slice=stream_slice,
                next_page_token=next_page_token,
                account_id=account_id,
            )
            response = self.send_request(params, customer_id=customer_id, account_id=account_id)
            for record in self.parse_response(response):
                yield record

            next_page_token = self.next_page_token(response, current_page_token=next_page_token)
            if not next_page_token:
                break

        self.logger.info(f'Finish loading data for stream {self.__class__.__name__}.')

    def next_page_token(self, response, **kwargs) -> Optional[Dict[str, Any]]:
        """
        Default method for streams that don't support pagination
        """
        return None

    def parse_response(self, response, **kwargs) -> Iterable[Mapping]:
        if response is not None and hasattr(response, self.data_field):
            yield from self.client.asdict(response)[self.data_field]

        yield from []

    def request_params(
        self,
        next_page_token: Dict[str, Any] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        return {}

    def send_request(self, params: Mapping[str, Any], customer_id: str, account_id: str = None) -> Mapping[str, Any]:
        request_kwargs = {
            'service_name': self.service_name,
            'customer_id': customer_id,
            'account_id': account_id,
            'operation_name': self.operation_name,
            'params': params,
        }
        request = self.client.request(**request_kwargs)
        return request
