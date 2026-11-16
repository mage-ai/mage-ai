from typing import Dict, Generator, List

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog

API_BASE_URL = 'https://api.specstream.ai/v1'
DEFAULT_EXTRACT_FORMAT = 'markdown'
DEFAULT_MAX_PAGES = 1
DEFAULT_SEARCH_LIMIT = 10
DEFAULT_SEARCH_SPEED = 'fast'
EXTRACT_BATCH_SIZE = 20
MAX_SEARCH_PAGES = 10
SAMPLE_DATA_SEARCH_LIMIT = 5
SAMPLE_DATA_URL_LIMIT = 1

STREAM_EXTRACTED_PAGES = 'extracted_pages'
STREAM_SEARCH_RESULTS = 'search_results'

KEY_PROPERTIES = {
    STREAM_EXTRACTED_PAGES: ['url'],
    STREAM_SEARCH_RESULTS: ['url'],
}

EXTRACT_STATUS_OK = 'ok'
VALID_EXTRACT_FORMATS = ('markdown', 'text', 'html')
VALID_SEARCH_SPEEDS = ('fast', 'default')


class SpecStream(Source):
    def discover(self, streams: List[str] = None) -> Catalog:
        catalog_entries = []
        for stream_id, schema in self.load_schemas_from_folder().items():
            if not streams or stream_id in streams:
                catalog_entries.append(self.build_catalog_entry(
                    stream_id,
                    schema,
                    key_properties=KEY_PROPERTIES[stream_id],
                ))

        return Catalog(catalog_entries)

    def get_table_key_properties(self, stream_id: str) -> List[str]:
        return KEY_PROPERTIES.get(stream_id, [])

    def test_connection(self) -> None:
        """
        Validate the API key against the read-only capacity catalog endpoint
        so testing the connection does not spend account credits.
        """
        response = self._request(
            'GET',
            '/capacity/catalog',
            headers={'Accept': 'application/json'},
        )
        self._raise_for_status(response)

    def load_data(
        self,
        stream,
        bookmarks: Dict = None,
        query: Dict = None,
        sample_data: bool = False,
        start_date=None,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        tap_stream_id = stream.tap_stream_id

        if tap_stream_id == STREAM_EXTRACTED_PAGES:
            yield from self._load_extracted_pages(sample_data=sample_data)
        elif tap_stream_id == STREAM_SEARCH_RESULTS:
            yield from self._load_search_results(sample_data=sample_data)
        else:
            raise Exception(f'Unknown stream {tap_stream_id}.')

    def _load_extracted_pages(self, sample_data: bool = False) -> Generator[List[Dict], None, None]:
        urls = self._get_urls()
        if sample_data:
            urls = urls[:SAMPLE_DATA_URL_LIMIT]

        extract_format = self._get_extract_format()
        succeeded = 0
        failures = []

        for idx in range(0, len(urls), EXTRACT_BATCH_SIZE):
            batch = urls[idx:idx + EXTRACT_BATCH_SIZE]
            response = self._request(
                'POST',
                '/extract',
                json=dict(format=extract_format, urls=batch),
            )
            self._raise_for_status(response)

            data = self._parse_json(response).get('data') or {}
            request_id = data.get('request_id')
            rows = [
                self._build_extract_row(item, extract_format, request_id)
                for item in (data.get('results') or [])
            ]

            for row in rows:
                if row['status'] == EXTRACT_STATUS_OK:
                    succeeded += 1
                else:
                    failures.append(row)
                    self.logger.info(
                        f"Extract of {row['url']} returned status {row['status']}",
                    )

            yield rows

        # One blocked or missing URL shouldn't lose the others,
        # but a sync where every URL failed should raise.
        if failures and not succeeded:
            raise Exception(
                f"All {len(failures)} URLs failed to extract. "
                f"First status: {failures[0]['status']}",
            )

    def _load_search_results(self, sample_data: bool = False) -> Generator[List[Dict], None, None]:
        search_query = (self._get_config_value('search_query') or '').strip()
        if not search_query:
            raise Exception(f'search_query is required to sync {STREAM_SEARCH_RESULTS}.')

        limit = int(self._get_config_value('search_limit') or DEFAULT_SEARCH_LIMIT)
        if sample_data:
            limit = min(limit, SAMPLE_DATA_SEARCH_LIMIT)

        speed = self._get_search_speed()
        max_pages = 1 if sample_data else min(
            int(self._get_config_value('max_pages') or DEFAULT_MAX_PAGES),
            MAX_SEARCH_PAGES,
        )

        page = 1
        while page <= max_pages:
            body = self._build_search_body(search_query, limit, page, speed)
            response = self._request('POST', '/web-search', json=body)
            self._raise_for_status(response)

            data = self._parse_json(response).get('data') or {}
            request_id = data.get('request_id')
            sources = data.get('sources') or []

            rows = [
                self._build_search_row(source, search_query, page, request_id)
                for source in sources
            ]
            if rows or page == 1:
                yield rows

            next_page = data.get('next_page')
            if not next_page or not sources or int(next_page) <= page:
                break
            page = int(next_page)

    def _build_search_body(self, search_query: str, limit: int, page: int, speed: str) -> Dict:
        body = dict(
            num=limit,
            page=page,
            q=search_query,
            speed=speed,
        )
        language = (self._get_config_value('search_language') or '').strip()
        if language:
            body['language'] = language

        country = (self._get_config_value('search_country') or '').strip()
        if country:
            body['country'] = country

        if self._get_config_value('include_passages'):
            body['passages'] = True

        return body

    def _build_extract_row(self, item: Dict, extract_format: str, request_id: str) -> Dict:
        return dict(
            captured_at=item.get('captured_at'),
            format=extract_format,
            modified=item.get('modified'),
            published=item.get('published'),
            read_from=item.get('read_from'),
            request_id=request_id,
            status=item.get('status'),
            status_code=item.get('status_code'),
            text=item.get('text'),
            text_truncated=item.get('text_truncated'),
            title=item.get('title'),
            url=item.get('url'),
        )

    def _build_search_row(
        self,
        source: Dict,
        search_query: str,
        page: int,
        request_id: str,
    ) -> Dict:
        return dict(
            cited=source.get('cited'),
            excerpt=source.get('excerpt'),
            file_type=source.get('file_type'),
            modified=source.get('modified'),
            page=page,
            published=source.get('published'),
            query=search_query,
            request_id=request_id,
            site=source.get('site'),
            snippet=source.get('snippet'),
            title=source.get('title'),
            url=source.get('url'),
        )

    def _get_urls(self) -> List[str]:
        urls = self._get_config_value('urls') or []
        if isinstance(urls, str):
            urls = urls.split(',')
        urls = [url.strip() for url in urls if url and url.strip()]
        if not urls:
            raise Exception(f'urls is required to sync {STREAM_EXTRACTED_PAGES}.')

        # Preserve order and avoid extracting the same URL twice.
        return list(dict.fromkeys(urls))

    def _get_extract_format(self) -> str:
        extract_format = (
            self._get_config_value('extract_format') or DEFAULT_EXTRACT_FORMAT
        ).strip().lower()
        if extract_format not in VALID_EXTRACT_FORMATS:
            raise Exception(
                f"Invalid extract_format '{extract_format}'. "
                f"Expected one of: {', '.join(VALID_EXTRACT_FORMATS)}.",
            )
        return extract_format

    def _get_search_speed(self) -> str:
        speed = (
            self._get_config_value('search_speed') or DEFAULT_SEARCH_SPEED
        ).strip().lower()
        if speed not in VALID_SEARCH_SPEEDS:
            raise Exception(
                f"Invalid search_speed '{speed}'. "
                f"Expected one of: {', '.join(VALID_SEARCH_SPEEDS)}.",
            )
        return speed

    def _get_api_key(self) -> str:
        api_key = (self._get_config_value('api_key') or '').strip()
        if not api_key:
            raise Exception('SpecStream api_key is required.')
        return api_key

    def _get_config_value(self, key: str, default=None):
        if not self.config:
            return default
        return self.config.get(key, default)

    def _request(self, method: str, path: str, headers: Dict = None, **kwargs) -> requests.Response:
        api_key = self._get_api_key()
        if not hasattr(self, '_session'):
            retry = Retry(
                allowed_methods=['GET', 'POST'],
                backoff_factor=1,
                raise_on_status=False,
                respect_retry_after_header=True,
                status_forcelist=[429, 500, 502, 503, 504],
                total=4,
            )
            self._session = requests.Session()
            self._session.mount('https://', HTTPAdapter(max_retries=retry))
            self._session.headers.update({'Authorization': f'Bearer {api_key}'})

        return self._session.request(
            method,
            f'{API_BASE_URL}{path}',
            headers=headers,
            timeout=60,
            **kwargs,
        )

    def _raise_for_status(self, response: requests.Response) -> None:
        if response.ok:
            return

        message = self._get_error_message(response)
        if response.status_code == 401:
            raise Exception(f'Invalid SpecStream API key: {message}')
        if response.status_code == 402:
            raise Exception(f'Insufficient SpecStream balance: {message}')
        if response.status_code == 403:
            raise Exception(f'SpecStream API permission or spending limit error: {message}')
        raise Exception(f'SpecStream API returned HTTP {response.status_code}: {message}')

    def _get_error_message(self, response: requests.Response) -> str:
        payload = self._parse_json(response)
        error = payload.get('error')
        if isinstance(error, dict) and error.get('message'):
            return error['message']
        if payload.get('message'):
            return payload['message']
        return f'HTTP {response.status_code}'

    def _parse_json(self, response: requests.Response) -> Dict:
        try:
            data = response.json()
        except ValueError:
            return {}

        return data if isinstance(data, dict) else {}


if __name__ == '__main__':
    main(SpecStream)
