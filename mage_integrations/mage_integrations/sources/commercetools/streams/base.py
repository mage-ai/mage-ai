from typing import Dict, Generator, List


class BaseStream():
    KEY_PROPERTIES = []

    URL_PATH = None

    def __init__(self, client, config, stream, logger):
        self.client = client
        self.config = config
        self.stream = stream
        self.logger = logger

    def load_data(self, bookmarks: Dict = None) -> Generator[List[Dict], None, None]:
        if self.URL_PATH is None:
            return
        offset = 0
        kwargs = dict(path=self.URL_PATH)
        while True:
            kwargs['params'] = dict(offset=offset)
            data = self.client.request(**kwargs)
            results = data['results']
            if not results:
                break
            yield results

            offset += data['count']

        self.logger.info(f'Finish loading data for stream {self.__class__.__name__}.')
