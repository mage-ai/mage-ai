from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import Backfill
from mage_ai.server.api.base import BaseHandler
from mage_ai.shared.hash import extract
from sqlalchemy import desc


class ApiPipelineBackfillsHandler(BaseHandler):
    model_class = Backfill

    @safe_db_query
    def post(self, pipeline_uuid):
        payload = self.get_payload()
        model = Backfill.create(**payload)
        self.write(dict(backfill=model.to_dict()))


class ApiBackfillHandler(BaseHandler):
    model_class = Backfill

    @safe_db_query
    def get(self, id):
        model = Backfill.query.get(int(id))
        self.write(dict(backfill=model.to_dict()))

    @safe_db_query
    def put(self, id):
        payload = self.get_payload()
        model = Backfill.query.get(int(id))
        model.update(**extract(payload, [
            'block_uuid',
            'end_datetime',
            'interval_type',
            'interval_units',
            'name',
            'start_datetime',
        ]))
        self.write(dict(block_run=model.to_dict()))


class ApiBackfillsHandler(BaseHandler):
    model_class = Backfill

    @safe_db_query
    def get(self):
        pipeline_uuid = self.get_argument('pipeline_uuid', None)

        results = (Backfill.
            query.
            filter(Backfill.pipeline_uuid == pipeline_uuid).
            order_by(desc(Backfill.created_at))
        )

        results = self.limit(results)
        collection = [b.to_dict() for b in results]

        self.write(dict(backfills=collection))
