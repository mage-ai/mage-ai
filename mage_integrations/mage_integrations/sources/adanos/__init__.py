import json
import subprocess
import tempfile
from contextlib import contextmanager
from pathlib import Path

from singer.schema import Schema

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog


class Adanos(Source):
    @contextmanager
    def _run_tap(self, catalog=None, discover=False):
        # Keep the tap's newer dependencies in a separate virtual environment.
        with tempfile.TemporaryDirectory() as directory:
            directory = Path(directory)
            config_path = directory / 'config.json'
            config_path.write_text(json.dumps(self.config['tap_config']))
            command = [self.config['tap_path'], '--config', str(config_path)]
            if discover:
                command.append('--discover')
            if catalog is not None:
                catalog_path = directory / 'catalog.json'
                catalog_path.write_text(json.dumps(catalog))
                command.extend(['--catalog', str(catalog_path)])
            with (directory / 'output.jsonl').open('w+') as output:
                result = subprocess.run(
                    command, stdout=output, stderr=subprocess.DEVNULL, timeout=300,
                )
                if result.returncode:
                    # Tap diagnostics can include request data; do not forward them to Mage.
                    raise RuntimeError(f'tap-adanos failed (exit {result.returncode}).')
                output.seek(0)
                yield output

    def discover(self, streams=None):
        with self._run_tap(discover=True) as output:
            catalog = json.load(output)
        return Catalog([
            self.build_catalog_entry(
                entry['tap_stream_id'],
                Schema.from_dict(entry['schema']),
                key_properties=entry['key_properties'],
                replication_method='FULL_TABLE',
            )
            for entry in catalog['streams']
            if not streams or entry['tap_stream_id'] in streams
        ])

    def load_data(self, stream, **kwargs):
        entry = stream.to_dict()
        entry['metadata'] = [
            dict(breadcrumb=[], metadata=dict(selected=True)),
        ]
        with self._run_tap(catalog=dict(streams=[entry])) as output:
            for line in output:
                message = json.loads(line)
                if message['type'] == 'RECORD' and message['stream'] == stream.tap_stream_id:
                    yield [message['record']]

    def test_connection(self):
        stream = self.discover(streams=['market_sentiment']).streams[0]
        if not list(self.load_data(stream)):
            raise RuntimeError('tap-adanos returned no market sentiment record.')


if __name__ == '__main__':
    main(Adanos)
