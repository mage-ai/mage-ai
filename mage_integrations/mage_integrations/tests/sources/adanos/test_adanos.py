import io
import json
import os
import threading
import unittest
from contextlib import redirect_stdout
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from mage_integrations.sources.adanos import Adanos


class AdanosTests(unittest.TestCase):
    def test_template(self):
        config = Adanos.templates()['config']
        self.assertEqual(config['tap_config']['base_url'], 'https://api.adanos.com')
        self.assertIn('mage_secret_var', config['tap_config']['api_key'])

    @unittest.skipUnless(os.name == 'posix', 'Uses a POSIX failing executable')
    def test_failed_tap_does_not_return_a_catalog(self):
        source = Adanos(config=dict(tap_path='/usr/bin/false', tap_config={}))
        with self.assertRaisesRegex(RuntimeError, 'tap-adanos failed'):
            source.discover()


@unittest.skipUnless(os.environ.get('TAP_ADANOS_PATH'), 'Set TAP_ADANOS_PATH to the installed tap')
class AdanosTapTests(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.status = 200
        self.fail_second_symbol = False
        case = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                request = urlparse(self.path)
                query = parse_qs(request.query)
                case.requests.append((request.path, query, self.headers.get('X-API-Key')))
                payload = dict(buzz_score=42.5, sentiment_score=None)
                if request.path.endswith('/trending'):
                    payload = ([dict(ticker='AAPL'), dict(ticker='MSFT')]
                               if query['offset'] == ['0'] else [])
                elif request.path.endswith('/compare'):
                    key = 'tokens' if '/crypto/' in request.path else 'stocks'
                    payload = {key: [dict(ticker='AAPL')], 'period_days': 1}
                elif '/stock/' in request.path or '/token/' in request.path:
                    payload.update(ticker=request.path.rsplit('/', 1)[-1], found=True)
                status = (403 if case.fail_second_symbol and request.path.endswith('/MSFT')
                          else case.status)
                if status != 200:
                    payload = dict(detail='synthetic-key must not be forwarded')
                data = json.dumps(payload).encode()
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.source = Adanos(config=dict(
            tap_path=os.environ['TAP_ADANOS_PATH'],
            tap_config=dict(
                api_key='synthetic-key',
                base_url=f'http://127.0.0.1:{self.server.server_port}',
                symbols=['AAPL', 'MSFT'],
                start_date='2026-11-16',
                end_date='2026-11-16',
                page_size=2,
            ),
        ), verbose=0)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def load(self, stream_id):
        stream = self.source.discover(streams=[stream_id]).streams[0]
        return [row for batch in self.source.load_data(stream) for row in batch]

    def test_discovery_is_offline_and_preserves_keys(self):
        catalog = self.source.discover()
        self.assertEqual({s.tap_stream_id for s in catalog.streams}, {
            'asset_sentiment', 'trending_assets', 'asset_comparison', 'market_sentiment',
        })
        for stream in catalog.streams:
            self.assertEqual(stream.replication_method, 'FULL_TABLE')
            self.assertIn('period_from', stream.key_properties)
            self.assertNotIn('observed_at', stream.schema.to_dict()['properties'])
        self.assertEqual(self.requests, [])

    def test_detail_selection_and_inclusive_window(self):
        rows = self.load('asset_sentiment')
        self.assertEqual([row['asset_symbol'] for row in rows], ['AAPL', 'MSFT'])
        self.assertIsNone(rows[0]['sentiment_score'])
        self.assertEqual(len(self.requests), 2)
        for path, query, key in self.requests:
            self.assertIn('/stock/', path)
            self.assertEqual(query, {'from': ['2026-11-16'], 'to': ['2026-11-16']})
            self.assertEqual(key, 'synthetic-key')

    def test_trending_pagination(self):
        rows = self.load('trending_assets')
        self.assertEqual([r['asset_symbol'] for r in rows], ['AAPL', 'MSFT'])
        self.assertEqual([q['offset'] for _, q, _ in self.requests], [['0'], ['2']])

    def test_comparison(self):
        self.assertEqual(self.load('asset_comparison')[0]['period_days'], 1)
        self.assertEqual(self.requests[0][1]['tickers'], ['AAPL,MSFT'])

    def test_source_routing(self):
        for source in ['x', 'news', 'polymarket']:
            with self.subTest(source=source):
                self.source.config['tap_config']['stock_source'] = source
                self.assertEqual(self.load('market_sentiment')[0]['source'], source)
                self.assertEqual(self.requests[-1][0], f'/{source}/stocks/v1/market-sentiment')
        self.source.config['tap_config']['asset_type'] = 'crypto'
        self.assertEqual(self.load('market_sentiment')[0]['source'], 'reddit')
        self.assertEqual(self.requests[-1][0], '/reddit/crypto/v1/market-sentiment')

    def test_connection_consumes_one_request(self):
        self.source.test_connection()
        self.assertEqual(len(self.requests), 1)

    def test_failed_extraction_emits_no_partial_records_or_key(self):
        self.fail_second_symbol = True
        stream = self.source.discover(streams=['asset_sentiment']).streams[0]
        rows = []
        with self.assertRaises(RuntimeError) as error:
            for batch in self.source.load_data(stream):
                rows.extend(batch)
        self.assertEqual(rows, [])
        self.assertEqual(len(self.requests), 2)
        self.assertNotIn('synthetic-key', str(error.exception))

    def test_mage_sync_writes_schema_and_selected_columns(self):
        catalog = self.source.discover(streams=['market_sentiment'])
        stream = catalog.streams[0]
        for item in stream.metadata:
            item['metadata']['selected'] = (
                not item['breadcrumb'] or item['breadcrumb'][-1] in stream.key_properties
                or item['breadcrumb'][-1] == 'buzz_score'
            )
        output = io.StringIO()
        with redirect_stdout(output):
            self.source.sync(catalog)
        messages = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual([m['type'] for m in messages], ['SCHEMA', 'RECORD'])
        self.assertEqual(messages[0]['replication_method'], 'FULL_TABLE')
        self.assertEqual(messages[1]['record'], dict(
            asset_type='stock', source='reddit', period_from='2026-11-16',
            period_to='2026-11-16', buzz_score=42.5,
        ))
