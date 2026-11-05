import json
import unittest
from unittest.mock import MagicMock, patch

import requests_mock

from mage_integrations.sources.anakin import API_BASE_URL, Anakin

SCRAPE_URL = f'{API_BASE_URL}/url-scraper'
SEARCH_URL = f'{API_BASE_URL}/search'


def build_source(**config):
    return Anakin(config=dict(api_key='ask_test', **config), logger=MagicMock())


def build_stream(tap_stream_id):
    stream = MagicMock()
    stream.tap_stream_id = tap_stream_id
    return stream


def completed_job(job_id, url):
    return dict(
        cached=False,
        cleanedHtml='<p>Hello</p>',
        completedAt='2026-11-05T10:53:46.336Z',
        country='us',
        durationMs=1033,
        finalUrl=url,
        html='<html><p>Hello</p></html>',
        id=job_id,
        markdown='Hello',
        status='completed',
        statusCode=200,
        url=url,
    )


def load_rows(source, tap_stream_id, **kwargs):
    rows = []
    for batch in source.load_data(build_stream(tap_stream_id), **kwargs):
        rows.extend(batch)
    return rows


class AnakinDiscoverTests(unittest.TestCase):
    def test_discover(self):
        catalog = build_source().discover()
        streams = {stream.tap_stream_id: stream for stream in catalog.streams}

        self.assertEqual(set(streams), {'scraped_pages', 'search_results'})
        for stream in streams.values():
            self.assertEqual(stream.key_properties, ['url'])
            self.assertEqual(stream.replication_method, 'FULL_TABLE')

        scraped_columns = streams['scraped_pages'].schema.to_dict()['properties']
        self.assertIn('markdown', scraped_columns)
        self.assertIn('generated_json', scraped_columns)

    def test_discover_selected_stream(self):
        catalog = build_source().discover(streams=['search_results'])
        self.assertEqual([s.tap_stream_id for s in catalog.streams], ['search_results'])

    def test_templates(self):
        self.assertIn('api_key', Anakin.templates()['config'])


class AnakinTestConnectionTests(unittest.TestCase):
    @requests_mock.Mocker()
    def test_valid_key(self, mocker):
        adapter = mocker.get(requests_mock.ANY, status_code=404, json=dict(error='not_found'))

        build_source().test_connection()

        self.assertEqual(adapter.last_request.headers['X-API-Key'], 'ask_test')
        self.assertEqual(adapter.last_request.method, 'GET')

    @requests_mock.Mocker()
    def test_invalid_key(self, mocker):
        mocker.get(
            requests_mock.ANY,
            status_code=401,
            json=dict(error='unauthorized', message='Invalid or inactive API key'),
        )

        with self.assertRaisesRegex(Exception, 'Invalid Anakin API key'):
            build_source().test_connection()

    @requests_mock.Mocker()
    def test_api_key_is_not_in_error_message(self, mocker):
        mocker.get(requests_mock.ANY, status_code=403, json=dict(message='Forbidden'))

        with self.assertRaises(Exception) as context:
            build_source().test_connection()

        self.assertNotIn('ask_test', str(context.exception))


class AnakinScrapedPagesTests(unittest.TestCase):
    @requests_mock.Mocker()
    def test_submits_and_polls_until_completed(self, mocker):
        url = 'https://example.com'
        submit = mocker.post(SCRAPE_URL, status_code=202, json=dict(jobId='j1', status='pending'))
        mocker.get(f'{SCRAPE_URL}/j1', [
            dict(json=dict(id='j1', status='processing')),
            dict(json=completed_job('j1', url)),
        ])

        with patch('mage_integrations.sources.anakin.time.sleep') as sleep:
            rows = load_rows(build_source(urls=[url]), 'scraped_pages')

        sleep.assert_called_once()
        self.assertEqual(json.loads(submit.last_request.text), dict(
            country='us',
            forceFresh=False,
            generateJson=False,
            url=url,
            useBrowser=False,
        ))
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['markdown'], 'Hello')
        self.assertEqual(rows[0]['cleaned_html'], '<p>Hello</p>')
        self.assertEqual(rows[0]['status_code'], 200)
        self.assertEqual(rows[0]['final_url'], url)
        self.assertEqual(rows[0]['job_id'], 'j1')

    @requests_mock.Mocker()
    def test_passes_config_to_the_api(self, mocker):
        url = 'https://example.com'
        submit = mocker.post(SCRAPE_URL, status_code=202, json=dict(jobId='j1'))
        mocker.get(f'{SCRAPE_URL}/j1', json=completed_job('j1', url))

        load_rows(
            build_source(
                country='de',
                force_fresh=True,
                generate_json=True,
                urls=[url],
                use_browser=True,
            ),
            'scraped_pages',
        )

        self.assertEqual(json.loads(submit.last_request.text), dict(
            country='de',
            forceFresh=True,
            generateJson=True,
            url=url,
            useBrowser=True,
        ))

    @requests_mock.Mocker()
    def test_rejected_url_does_not_lose_the_others(self, mocker):
        good, bad = 'https://example.com', 'https://does-not-resolve.invalid'

        def respond(request, context):
            if request.json()['url'] == bad:
                context.status_code = 400
                return dict(error='invalid_url', message='hostname does not resolve')
            context.status_code = 202
            return dict(jobId='j1')

        mocker.post(SCRAPE_URL, json=respond)
        mocker.get(f'{SCRAPE_URL}/j1', json=completed_job('j1', good))

        rows = load_rows(build_source(urls=[bad, good]), 'scraped_pages')

        self.assertEqual([row['url'] for row in rows], [bad, good])
        self.assertEqual(rows[0]['status'], 'failed')
        self.assertEqual(rows[0]['error'], 'hostname does not resolve')
        self.assertEqual(rows[1]['status'], 'completed')

    @requests_mock.Mocker()
    def test_failed_job_is_recorded(self, mocker):
        good, bad = 'https://example.com', 'https://example.org'

        def respond(request, context):
            context.status_code = 202
            return dict(jobId='bad' if request.json()['url'] == bad else 'good')

        mocker.post(SCRAPE_URL, json=respond)
        mocker.get(f'{SCRAPE_URL}/good', json=completed_job('good', good))
        mocker.get(f'{SCRAPE_URL}/bad', json=dict(id='bad', status='failed', error='blocked'))

        rows = load_rows(build_source(urls=[good, bad]), 'scraped_pages')

        self.assertEqual([row['status'] for row in rows], ['completed', 'failed'])
        self.assertEqual(rows[1]['error'], 'blocked')

    @requests_mock.Mocker()
    def test_all_urls_failing_fails_the_sync(self, mocker):
        mocker.post(SCRAPE_URL, status_code=400, json=dict(message='bad url'))

        with self.assertRaisesRegex(Exception, 'All 1 URLs failed to scrape.*bad url'):
            load_rows(build_source(urls=['https://example.com']), 'scraped_pages')

    @requests_mock.Mocker()
    def test_out_of_credits_stops_the_sync(self, mocker):
        submit = mocker.post(SCRAPE_URL, status_code=402, json=dict(message='Insufficient'))

        with self.assertRaisesRegex(Exception, 'Not enough Anakin credits'):
            load_rows(
                build_source(urls=['https://example.com', 'https://example.org']),
                'scraped_pages',
            )

        self.assertEqual(submit.call_count, 1)

    @requests_mock.Mocker()
    def test_poll_timeout_is_recorded(self, mocker):
        url, good_url = 'https://example.com', 'https://example.org'

        def respond(request, context):
            context.status_code = 202
            return dict(jobId='j2' if request.json()['url'] == good_url else 'j1')

        mocker.post(SCRAPE_URL, json=respond)
        mocker.get(f'{SCRAPE_URL}/j1', json=dict(id='j1', status='processing'))
        mocker.get(f'{SCRAPE_URL}/j2', json=completed_job('j2', good_url))

        with patch('mage_integrations.sources.anakin.time.sleep'):
            rows = load_rows(
                build_source(poll_timeout_seconds=-1, urls=[url, good_url]),
                'scraped_pages',
            )

        self.assertEqual([row['status'] for row in rows], ['timed_out', 'completed'])
        self.assertIn('j1', rows[0]['error'])

    @requests_mock.Mocker()
    def test_urls_are_grouped_deduplicated_and_kept_in_order(self, mocker):
        urls = [f'https://example.com/{idx}' for idx in range(12)]

        def respond(request, context):
            context.status_code = 202
            return dict(jobId=str(urls.index(request.json()['url'])))

        submit = mocker.post(SCRAPE_URL, json=respond)
        for idx, url in enumerate(urls):
            mocker.get(f'{SCRAPE_URL}/{idx}', json=completed_job(str(idx), url))

        source = build_source(urls=urls + urls[:2])
        batches = list(source.load_data(build_stream('scraped_pages')))

        self.assertEqual([len(batch) for batch in batches], [10, 2])
        self.assertEqual([row['url'] for batch in batches for row in batch], urls)
        self.assertEqual(submit.call_count, 12)

    @requests_mock.Mocker()
    def test_urls_as_comma_separated_string(self, mocker):
        def respond(request, context):
            context.status_code = 202
            return dict(jobId=request.json()['url'][-1])

        mocker.post(SCRAPE_URL, json=respond)
        mocker.get(f'{SCRAPE_URL}/a', json=completed_job('a', 'https://x.io/a'))
        mocker.get(f'{SCRAPE_URL}/b', json=completed_job('b', 'https://x.io/b'))

        rows = load_rows(build_source(urls='https://x.io/a, https://x.io/b'), 'scraped_pages')

        self.assertEqual([row['url'] for row in rows], ['https://x.io/a', 'https://x.io/b'])

    @requests_mock.Mocker()
    def test_sample_data_scrapes_one_url(self, mocker):
        url = 'https://example.com'
        submit = mocker.post(SCRAPE_URL, status_code=202, json=dict(jobId='j1'))
        mocker.get(f'{SCRAPE_URL}/j1', json=completed_job('j1', url))

        rows = load_rows(
            build_source(urls=[url, 'https://example.org']),
            'scraped_pages',
            sample_data=True,
        )

        self.assertEqual(len(rows), 1)
        self.assertEqual(submit.call_count, 1)

    def test_missing_urls(self):
        with self.assertRaisesRegex(Exception, 'urls is required'):
            load_rows(build_source(urls=[]), 'scraped_pages')


class AnakinSearchResultsTests(unittest.TestCase):
    @requests_mock.Mocker()
    def test_search(self, mocker):
        search = mocker.post(SEARCH_URL, json=dict(
            id='search_1',
            results=[dict(
                date='2026-08-24',
                last_updated='2026-08-24',
                snippet='A snippet',
                title='A title',
                url='https://example.com',
            )],
        ))

        rows = load_rows(build_source(search_limit=2, search_prompt='q'), 'search_results')

        self.assertEqual(json.loads(search.last_request.text), dict(limit=2, prompt='q'))
        self.assertEqual(rows, [dict(
            date='2026-08-24',
            last_updated='2026-08-24',
            prompt='q',
            search_id='search_1',
            snippet='A snippet',
            title='A title',
            url='https://example.com',
        )])

    @requests_mock.Mocker()
    def test_search_with_no_results(self, mocker):
        mocker.post(SEARCH_URL, json=dict(id='search_1', results=None))

        self.assertEqual(load_rows(build_source(search_prompt='q'), 'search_results'), [])

    def test_missing_prompt(self):
        with self.assertRaisesRegex(Exception, 'search_prompt is required'):
            load_rows(build_source(), 'search_results')


if __name__ == '__main__':
    unittest.main()
