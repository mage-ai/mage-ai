from mage_ai.data_integrations.destinations.constants import DESTINATIONS
from mage_ai.data_integrations.sources.constants import SOURCES
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
from mage_ai.server.api.base import BaseHandler
from mage_ai.shared.hash import merge_dict
from typing import List, Dict
import importlib


def get_collection(key: str, available_options: List[Dict]):
    collection = []

    for option in available_options:
        d = option.copy()
        if not d.get('uuid'):
            d['uuid'] = d['name'].lower().replace(' ', '_')
        module_name = d.get('module_name', d['name'].replace(' ', ''))
        try:
            mod = getattr(
                importlib.import_module(f"mage_integrations.{key}.{d['uuid']}"),
                module_name,
            )
            d['templates'] = mod.templates()
        except FileNotFoundError:
            d['templates'] = {}
        except Exception:
            continue

        collection.append(d)

    return collection


class ApiIntegrationDestinationsHandler(BaseHandler):
    def get(self):
        self.write(dict(integration_destinations=get_collection('destinations', DESTINATIONS)))

    def post(self):
        payload = self.get_payload()

        action = payload['action']
        if action == 'test_connection':
            pipeline_uuid = payload['pipeline_uuid']
            pipeline = IntegrationPipeline.get(pipeline_uuid)
            config = payload['config']

            try:
                pipeline.test_connection(BlockType.DATA_EXPORTER, config=config)
                self.write(dict(success=True))
            except Exception as e:
                self.write(dict(success=False, error_message=str(e)))

        self.finish()


class ApiIntegrationSourcesHandler(BaseHandler):
    def get(self):
        self.write(dict(integration_sources=get_collection('sources', SOURCES)))

    def post(self):
        payload = self.get_payload()

        action = payload['action']
        if action == 'test_connection':
            pipeline_uuid = payload['pipeline_uuid']
            pipeline = IntegrationPipeline.get(pipeline_uuid)
            config = payload['config']

            try:
                pipeline.test_connection(BlockType.DATA_LOADER, config=config)
                self.write(dict(success=True))
            except Exception as e:
                self.write(dict(success=False, error_message=str(e)))
        elif action == 'sample_data':
            pipeline_uuid = payload['pipeline_uuid']
            pipeline = IntegrationPipeline.get(pipeline_uuid)

            try:
                pipeline.preview_data(BlockType.DATA_LOADER)
                self.write(dict(success=True))
            except Exception as e:
                self.write(dict(success=False, error_message=str(e)))

        self.finish()


class ApiIntegrationSourceStreamHandler(BaseHandler):
    def put(self, pipeline_uuid):
        pipeline = IntegrationPipeline.get(pipeline_uuid)
        streams = pipeline.discover_streams() or {}

        self.write(dict(
            integration_source_stream=dict(
                streams=sorted(streams, key=lambda x: x['tap_stream_id']),
                uuid=pipeline.source_uuid,
            ),
        ))


class ApiIntegrationSourceHandler(BaseHandler):
    def put(self, pipeline_uuid):
        payload = self.get_payload()
        pipeline = IntegrationPipeline.get(pipeline_uuid)
        selected_streams = payload.get('integration_source', {}).get('streams')
        catalog = pipeline.discover(streams=selected_streams) or {}

        self.write(dict(
            integration_source=merge_dict(catalog, dict(
                selected_streams=selected_streams,
                uuid=pipeline.source_uuid,
            )),
        ))
