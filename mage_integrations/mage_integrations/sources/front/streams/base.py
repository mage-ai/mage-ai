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
        kwargs = dict(path=self.URL_PATH)
        while True:
            data = self.client.get(**kwargs)
            results = data['_results']
            yield results

            pagination_next_url = data.get('_pagination', dict()).get('next')
            if not pagination_next_url:
                break
            kwargs = dict(url=pagination_next_url)

        self.logger.info(f'Finish loading data for stream {self.__class__.__name__}.')
