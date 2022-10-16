from mage_ai.data_integrations.sources.constants import SOURCES
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.server.api.base import BaseHandler
from mage_ai.shared.hash import merge_dict
import importlib


class ApiIntegrationSourcesHandler(BaseHandler):
    def get(self):
        collection = []

        for source in SOURCES:
            d = source.copy()
            if not d.get('uuid'):
                d['uuid'] = d['name'].lower().replace(' ', '_')
            module_name = d.get('module_name', d['name'].replace(' ', ''))
            try:
                mod = getattr(
                    importlib.import_module(f"mage_integrations.sources.{d['uuid']}"),
                    module_name,
                )
                d['templates'] = mod.templates()
            except FileNotFoundError:
                d['templates'] = {}

            collection.append(d)

        self.write(dict(integration_sources=collection))

class ApiIntegrationSourceHandler(BaseHandler):
    def get(self, pipeline_uuid):
        pipeline = IntegrationPipeline.get(pipeline_uuid)
        catalog = pipeline.discover() or {}

        self.write(dict(
            integration_source=merge_dict(catalog, dict(
                uuid=pipeline.source_uuid,
            )),
        ))
