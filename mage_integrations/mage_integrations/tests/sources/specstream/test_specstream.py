import json
import unittest
from unittest.mock import MagicMock

import requests_mock

from mage_integrations.sources.specstream import API_BASE_URL, SpecStream

CATALOG_URL = f'{API_BASE_URL}/capacity/catalog'
EXTRACT_URL = f'{API_BASE_URL}/extract'
SEARCH_URL = f'{API_BASE_URL}/web-search'


def build_source(**config):
    return SpecStream(config=dict(api_key='ss_test_secret', **config), logger=MagicMock())


def build_stream(tap_stream_id):
    stream = MagicMock()
    stream.tap_stream_id = tap_stream_id
    return stream


def load_rows(source, tap_stream_id, **kwargs):
    rows = []
    for batch in source.load_data(build_stream(tap_stream_id), **kwargs):
        rows.extend(batch)
    return rows


class SpecStreamDiscoverTests(unittest.TestCase):
    def test_discover(self):
        catalog = build_source().discover()
        streams = {stream.tap_stream_id: stream for stream in catalog.streams}

        self.assertEqual(set(streams), {'extracted_pages', 'search_results'})
        for stream in streams.values():
            self.assertEqual(stream.key_properties, ['url'])
            self.assertEqual(stream.replication_method, 'FULL_TABLE')

        extracted_columns = streams['extracted_pages'].schema.to_dict()['properties']
        self.assertIn('text', extracted_columns)
        self.assertIn('read_from', extracted_columns)

        search_columns = streams['search_results'].schema.to_dict()['properties']
        self.assertIn('excerpt', search_columns)
        self.assertIn('file_type', search_columns)

    def test_discover_selected_stream(self):
        catalog = build_source().discover(streams=['search_results'])
        self.assertEqual([s.tap_stream_id for s in catalog.streams], ['search_results'])

    def test_templates(self):
        config = SpecStream.templates()['config']
        self.assertIn('api_key', config)
        self.assertIn('search_query', config)
        self.assertIn('urls', config)

    def test_unknown_stream_raises(self):
        with self.assertRaisesRegex(Exception, 'Unknown stream nope'):
            load_rows(build_source(), 'nope')


class SpecStreamTestConnectionTests(unittest.TestCase):
    @requests_mock.Mocker()
    def test_valid_key(self, mocker):
        adapter = mocker.get(CATALOG_URL, status_code=200, json=dict(plans=[]))

        build_source().test_connection()

        self.assertEqual(adapter.last_request.headers['Authorization'], 'Bearer ss_test_secret')
        self.assertEqual(adapter.last_request.method, 'GET')

    def test_missing_key_fails_before_request(self):
        source = SpecStream(config={}, logger=MagicMock())
        with self.assertRaisesRegex(Exception, 'SpecStream api_key is required'):
            source.test_connection()

    @requests_mock.Mocker()
    def test_invalid_key(self, mocker):
        mocker.get(
            CATALOG_URL,
            status_code=401,
            json=dict(error=dict(code='invalid_token', message='API key is invalid or revoked')),
        )

        with self.assertRaisesRegex(
            Exception,
            'Invalid SpecStream API key: API key is invalid or revoked',
        ):
            build_source().test_connection()

    @requests_mock.Mocker()
    def test_api_key_is_not_in_error_message(self, mocker):
        mocker.get(
            CATALOG_URL,
            status_code=403,
            json=dict(error=dict(code='forbidden', message='Forbidden')),
        )

        with self.assertRaises(Exception) as context:
            build_source().test_connection()

        self.assertNotIn('ss_test_secret', str(context.exception))


class SpecStreamExtractedPagesTests(unittest.TestCase):
    @requests_mock.Mocker()
    def test_extracts_pages_and_maps_fields(self, mocker):
        url = 'https://example.gov/records/2026.pdf'
        adapter = mocker.post(EXTRACT_URL, json=dict(data=dict(
            request_id='req_1',
            results=[dict(
                captured_at='2026-10-01T00:00:00Z',
                modified='2026-10-02',
                published='2026-09-15',
                read_from='live',
                status='ok',
                text='# Filing 2026',
                text_truncated=False,
                title='Public Filing',
                url=url,
            )],
        )))

        rows = load_rows(build_source(urls=[url]), 'extracted_pages')

        self.assertEqual(json.loads(adapter.last_request.text), dict(
            format='markdown',
            urls=[url],
        ))
        self.assertEqual(rows, [dict(
            captured_at='2026-10-01T00:00:00Z',
            format='markdown',
            modified='2026-10-02',
            published='2026-09-15',
            read_from='live',
            request_id='req_1',
            status='ok',
            status_code=None,
            text='# Filing 2026',
            text_truncated=False,
            title='Public Filing',
            url=url,
        )])

    @requests_mock.Mocker()
    def test_passes_custom_extract_format(self, mocker):
        url = 'https://example.com'
        adapter = mocker.post(EXTRACT_URL, json=dict(data=dict(
            request_id='req_2',
            results=[dict(url=url, status='ok', text='Hello')],
        )))

        rows = load_rows(build_source(extract_format='text', urls=[url]), 'extracted_pages')

        self.assertEqual(json.loads(adapter.last_request.text), dict(format='text', urls=[url]))
        self.assertEqual(rows[0]['format'], 'text')

    def test_invalid_extract_format_raises(self):
        with self.assertRaisesRegex(Exception, 'Invalid extract_format'):
            load_rows(build_source(extract_format='xml', urls=['https://example.com']),
                      'extracted_pages')

    @requests_mock.Mocker()
    def test_failed_url_does_not_lose_successful_urls(self, mocker):
        good, bad = 'https://example.com/ok', 'https://example.com/missing'
        mocker.post(EXTRACT_URL, json=dict(data=dict(
            request_id='req_3',
            results=[
                dict(url=bad, status='not_found', status_code=404, text='Not Found'),
                dict(url=good, status='ok', text='Record text'),
            ],
        )))

        rows = load_rows(build_source(urls=[bad, good]), 'extracted_pages')

        self.assertEqual([row['url'] for row in rows], [bad, good])
        self.assertEqual(rows[0]['status'], 'not_found')
        self.assertEqual(rows[0]['status_code'], 404)
        self.assertEqual(rows[1]['status'], 'ok')

    @requests_mock.Mocker()
    def test_all_urls_failing_fails_the_sync(self, mocker):
        mocker.post(EXTRACT_URL, json=dict(data=dict(
            request_id='req_4',
            results=[dict(url='https://example.com', status='blocked')],
        )))

        with self.assertRaisesRegex(Exception, 'All 1 URLs failed to extract.*blocked'):
            load_rows(build_source(urls=['https://example.com']), 'extracted_pages')

    @requests_mock.Mocker()
    def test_insufficient_balance_stops_the_sync(self, mocker):
        adapter = mocker.post(
            EXTRACT_URL,
            status_code=402,
            json=dict(error=dict(code='insufficient_balance', message='Add balance')),
        )

        with self.assertRaisesRegex(Exception, 'Insufficient SpecStream balance: Add balance'):
            load_rows(
                build_source(urls=[f'https://example.com/{i}' for i in range(25)]),
                'extracted_pages',
            )

        self.assertEqual(adapter.call_count, 1)

    @requests_mock.Mocker()
    def test_urls_are_batched_deduplicated_and_kept_in_order(self, mocker):
        urls = [f'https://example.com/{idx}' for idx in range(23)]

        def respond(request, context):
            batch = request.json()['urls']
            return dict(data=dict(
                request_id='req_batch',
                results=[dict(url=u, status='ok', text=f'text {u}') for u in batch],
            ))

        adapter = mocker.post(EXTRACT_URL, json=respond)

        source = build_source(urls=urls + urls[:3])
        batches = list(source.load_data(build_stream('extracted_pages')))

        self.assertEqual([len(batch) for batch in batches], [20, 3])
        self.assertEqual([row['url'] for batch in batches for row in batch], urls)
        self.assertEqual(adapter.call_count, 2)

    @requests_mock.Mocker()
    def test_urls_as_comma_separated_string(self, mocker):
        mocker.post(EXTRACT_URL, json=dict(data=dict(
            request_id='req_csv',
            results=[
                dict(url='https://x.io/a', status='ok', text='a'),
                dict(url='https://x.io/b', status='ok', text='b'),
            ],
        )))

        rows = load_rows(build_source(urls='https://x.io/a, https://x.io/b'), 'extracted_pages')

        self.assertEqual([row['url'] for row in rows], ['https://x.io/a', 'https://x.io/b'])

    @requests_mock.Mocker()
    def test_sample_data_extracts_one_url(self, mocker):
        adapter = mocker.post(EXTRACT_URL, json=dict(data=dict(
            request_id='req_sample',
            results=[dict(url='https://example.com', status='ok', text='Sample')],
        )))

        rows = load_rows(
            build_source(urls=['https://example.com', 'https://example.org']),
            'extracted_pages',
            sample_data=True,
        )

        self.assertEqual(len(rows), 1)
        self.assertEqual(json.loads(adapter.last_request.text)['urls'], ['https://example.com'])

    def test_missing_urls(self):
        with self.assertRaisesRegex(Exception, 'urls is required'):
            load_rows(build_source(urls=[]), 'extracted_pages')


class SpecStreamSearchResultsTests(unittest.TestCase):
    @requests_mock.Mocker()
    def test_search_with_defaults(self, mocker):
        adapter = mocker.post(SEARCH_URL, json=dict(data=dict(
            next_page=None,
            request_id='search_1',
            sources=[dict(
                cited=True,
                file_type='pdf',
                modified='2026-10-01',
                published='2026-09-01',
                site='sec.gov',
                snippet='Annual report filing',
                title='Form 10-K',
                url='https://sec.gov/10k.pdf',
            )],
        )))

        rows = load_rows(build_source(search_query='site:sec.gov "Form 10-K"'), 'search_results')

        self.assertEqual(json.loads(adapter.last_request.text), dict(
            num=10,
            page=1,
            q='site:sec.gov "Form 10-K"',
            speed='fast',
        ))
        self.assertEqual(rows, [dict(
            cited=True,
            excerpt=None,
            file_type='pdf',
            modified='2026-10-01',
            page=1,
            published='2026-09-01',
            query='site:sec.gov "Form 10-K"',
            request_id='search_1',
            site='sec.gov',
            snippet='Annual report filing',
            title='Form 10-K',
            url='https://sec.gov/10k.pdf',
        )])

    @requests_mock.Mocker()
    def test_search_passes_optional_parameters(self, mocker):
        adapter = mocker.post(SEARCH_URL, json=dict(data=dict(
            next_page=None,
            request_id='search_2',
            sources=[dict(
                excerpt='Matching paragraph',
                title='Notice',
                url='https://example.de/notice',
            )],
        )))

        rows = load_rows(
            build_source(
                include_passages=True,
                search_country='DE',
                search_language='de',
                search_limit=20,
                search_query='public notice',
                search_speed='default',
            ),
            'search_results',
        )

        self.assertEqual(json.loads(adapter.last_request.text), dict(
            country='DE',
            language='de',
            num=20,
            page=1,
            passages=True,
            q='public notice',
            speed='default',
        ))
        self.assertEqual(rows[0]['excerpt'], 'Matching paragraph')

    @requests_mock.Mocker()
    def test_search_paginates_up_to_max_pages(self, mocker):
        mocker.post(SEARCH_URL, [
            dict(json=dict(data=dict(
                next_page=2,
                request_id='p1',
                sources=[dict(title='One', url='https://example.com/1')],
            ))),
            dict(json=dict(data=dict(
                next_page=3,
                request_id='p2',
                sources=[dict(title='Two', url='https://example.com/2')],
            ))),
        ])

        rows = load_rows(
            build_source(max_pages=2, search_query='public records'),
            'search_results',
        )

        self.assertEqual([row['url'] for row in rows], [
            'https://example.com/1',
            'https://example.com/2',
        ])
        self.assertEqual([row['page'] for row in rows], [1, 2])

    @requests_mock.Mocker()
    def test_sample_data_limits_search_results(self, mocker):
        adapter = mocker.post(SEARCH_URL, json=dict(data=dict(
            next_page=2,
            request_id='sample_s',
            sources=[dict(title='One', url='https://example.com/1')],
        )))

        rows = load_rows(
            build_source(max_pages=5, search_limit=50, search_query='public records'),
            'search_results',
            sample_data=True,
        )

        self.assertEqual(len(rows), 1)
        self.assertEqual(adapter.call_count, 1)
        self.assertEqual(json.loads(adapter.last_request.text)['num'], 5)

    @requests_mock.Mocker()
    def test_search_with_no_results(self, mocker):
        mocker.post(SEARCH_URL, json=dict(data=dict(
            next_page=None,
            request_id='empty_s',
            sources=[],
        )))

        self.assertEqual(
            load_rows(build_source(search_query='site:nonexistent.invalid'), 'search_results'),
            [],
        )

    def test_invalid_search_speed_raises(self):
        with self.assertRaisesRegex(Exception, 'Invalid search_speed'):
            load_rows(
                build_source(search_query='q', search_speed='turbo'),
                'search_results',
            )

    def test_missing_search_query(self):
        with self.assertRaisesRegex(Exception, 'search_query is required'):
            load_rows(build_source(), 'search_results')


if __name__ == '__main__':
    unittest.main()
