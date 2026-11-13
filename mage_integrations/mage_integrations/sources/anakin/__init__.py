import time
from typing import Dict, Generator, List

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog

API_BASE_URL = 'https://api.anakin.io/v1'
DEFAULT_COUNTRY = 'us'
DEFAULT_POLL_TIMEOUT_SECONDS = 300
DEFAULT_SEARCH_LIMIT = 5
MAX_POLL_INTERVAL_SECONDS = 10
# Scrape jobs run on Anakin's side, so URLs are submitted in groups and then polled.
SCRAPE_GROUP_SIZE = 10
# Sample data in the Mage UI only needs a few rows, so don't spend credits on every URL.
SAMPLE_DATA_URL_LIMIT = 1

STREAM_SCRAPED_PAGES = 'scraped_pages'
STREAM_SEARCH_RESULTS = 'search_results'

KEY_PROPERTIES = {
    STREAM_SCRAPED_PAGES: ['url'],
    STREAM_SEARCH_RESULTS: ['url'],
}

# Errors that a retry of the next URL can't fix: stop the sync instead of recording a row each.
FATAL_STATUS_CODES = (401, 402, 403)
JOB_STATUS_COMPLETED = 'completed'
JOB_STATUS_FAILED = 'failed'
JOB_STATUS_TIMED_OUT = 'timed_out'


class Anakin(Source):
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
        Validate the API key without starting a job, so no credits are spent.
        Looking up a job that doesn't exist returns 404 for a valid key and 401 for an invalid one.
        """
        response = self._request(
            'GET',
            '/url-scraper/00000000-0000-0000-0000-000000000000',
        )
        if response.status_code != 404:
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

        if tap_stream_id == STREAM_SCRAPED_PAGES:
            yield from self._load_scraped_pages(sample_data=sample_data)
        elif tap_stream_id == STREAM_SEARCH_RESULTS:
            yield self._load_search_results()
        else:
            raise Exception(f'Unknown stream {tap_stream_id}.')

    def _load_scraped_pages(self, sample_data: bool = False) -> Generator[List[Dict], None, None]:
        urls = self._get_urls()
        if sample_data:
            urls = urls[:SAMPLE_DATA_URL_LIMIT]

        succeeded = 0
        failures = []
        for idx in range(0, len(urls), SCRAPE_GROUP_SIZE):
            rows = self._scrape_group(urls[idx:idx + SCRAPE_GROUP_SIZE])
            for row in rows:
                if row['status'] == JOB_STATUS_COMPLETED:
                    succeeded += 1
                else:
                    failures.append(row)
                    self.logger.info(f"Scrape of {row['url']} failed: {row['error']}")
            yield rows

        # One bad URL shouldn't lose the others, but a sync with no data must not look successful.
        if failures and not succeeded:
            raise Exception(
                f"All {len(failures)} URLs failed to scrape. First error: {failures[0]['error']}",
            )

    def _scrape_group(self, urls: List[str]) -> List[Dict]:
        rows = {}
        jobs = {}
        for url in urls:
            response = self._request('POST', '/url-scraper', json=self._build_scrape_body(url))
            if response.status_code in FATAL_STATUS_CODES:
                self._raise_for_status(response)

            job_id = None
            if response.ok:
                job_id = self._parse_json(response).get('jobId')

            if job_id:
                jobs[job_id] = url
            else:
                rows[url] = self._build_scrape_row(url, dict(
                    error=self._get_error_message(response),
                    status=JOB_STATUS_FAILED,
                ))

        rows.update(self._poll_jobs(jobs))

        return [rows[url] for url in urls]

    def _poll_jobs(self, jobs: Dict[str, str]) -> Dict[str, Dict]:
        rows = {}
        pending = dict(jobs)
        interval = 1
        deadline = time.monotonic() + self._get_poll_timeout()

        while pending:
            for job_id, url in list(pending.items()):
                response = self._request('GET', f'/url-scraper/{job_id}')
                self._raise_for_status(response)
                job = self._parse_json(response)
                if job.get('status') in (JOB_STATUS_COMPLETED, JOB_STATUS_FAILED):
                    rows[url] = self._build_scrape_row(url, job)
                    del pending[job_id]

            if not pending:
                break

            if time.monotonic() >= deadline:
                for job_id, url in pending.items():
                    rows[url] = self._build_scrape_row(url, dict(
                        error=f'Job {job_id} did not finish within the poll timeout.',
                        id=job_id,
                        status=JOB_STATUS_TIMED_OUT,
                    ))
                break

            time.sleep(interval)
            interval = min(interval * 2, MAX_POLL_INTERVAL_SECONDS)

        return rows

    def _load_search_results(self) -> List[Dict]:
        prompt = self.config.get('search_prompt')
        if not prompt:
            raise Exception(f'search_prompt is required to sync {STREAM_SEARCH_RESULTS}.')

        response = self._request('POST', '/search', json=dict(
            limit=int(self.config.get('search_limit') or DEFAULT_SEARCH_LIMIT),
            prompt=prompt,
        ))
        self._raise_for_status(response)
        data = self._parse_json(response)

        return [dict(
            date=result.get('date'),
            last_updated=result.get('last_updated'),
            prompt=prompt,
            search_id=data.get('id'),
            snippet=result.get('snippet'),
            title=result.get('title'),
            url=result.get('url'),
        ) for result in data.get('results') or []]

    def _build_scrape_body(self, url: str) -> Dict:
        return dict(
            country=self.config.get('country') or DEFAULT_COUNTRY,
            forceFresh=bool(self.config.get('force_fresh', False)),
            generateJson=bool(self.config.get('generate_json', False)),
            url=url,
            useBrowser=bool(self.config.get('use_browser', False)),
        )

    def _build_scrape_row(self, url: str, job: Dict) -> Dict:
        return dict(
            cached=job.get('cached'),
            cleaned_html=job.get('cleanedHtml'),
            completed_at=job.get('completedAt'),
            country=job.get('country'),
            duration_ms=job.get('durationMs'),
            error=job.get('error'),
            final_url=job.get('finalUrl'),
            generated_json=job.get('generatedJson'),
            html=job.get('html'),
            job_id=job.get('id'),
            markdown=job.get('markdown'),
            status=job.get('status'),
            status_code=job.get('statusCode'),
            url=url,
        )

    def _get_urls(self) -> List[str]:
        urls = self.config.get('urls') or []
        if isinstance(urls, str):
            urls = urls.split(',')
        urls = [url.strip() for url in urls if url and url.strip()]
        if not urls:
            raise Exception(f'urls is required to sync {STREAM_SCRAPED_PAGES}.')

        # Keep the first occurrence so rows stay in config order and no URL is charged twice.
        return list(dict.fromkeys(urls))

    def _get_poll_timeout(self) -> int:
        return int(self.config.get('poll_timeout_seconds') or DEFAULT_POLL_TIMEOUT_SECONDS)

    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
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
            self._session.headers.update({'X-API-Key': self.config['api_key']})

        return self._session.request(method, f'{API_BASE_URL}{path}', timeout=60, **kwargs)

    def _raise_for_status(self, response: requests.Response) -> None:
        if response.ok:
            return

        message = self._get_error_message(response)
        if response.status_code == 401:
            raise Exception(f'Invalid Anakin API key: {message}')
        if response.status_code == 402:
            raise Exception(f'Not enough Anakin credits: {message}')
        raise Exception(f'Anakin API returned HTTP {response.status_code}: {message}')

    def _get_error_message(self, response: requests.Response) -> str:
        return self._parse_json(response).get('message') or f'HTTP {response.status_code}'

    def _parse_json(self, response: requests.Response) -> Dict:
        try:
            data = response.json()
        except ValueError:
            return {}

        return data if isinstance(data, dict) else {}


if __name__ == '__main__':
    main(Anakin)
