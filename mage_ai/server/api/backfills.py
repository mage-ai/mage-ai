from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import Backfill
from mage_ai.server.api.base import BaseHandler
from mage_ai.shared.hash import extract
from sqlalchemy import desc

ALLOWED_PAYLOAD_KEYS = [
    'block_uuid',
    'end_datetime',
    'interval_type',
    'interval_units',
    'name',
    'start_datetime',
]


class ApiPipelineBackfillsHandler(BaseHandler):
    model_class = Backfill

    @safe_db_query
    def post(self, pipeline_uuid):
        payload = self.get_payload()
        model = Backfill.create(**extract(payload, ALLOWED_PAYLOAD_KEYS))
        self.write(dict(backfill=model.to_dict()))


class ApiBackfillHandler(BaseHandler):
    model_class = Backfill

    @safe_db_query
    def get(self, id):
        model = Backfill.query.get(int(id))
        self.write(dict(backfill=model.to_dict()))

    @safe_db_query
    def put(self, id):
        model = Backfill.query.get(int(id))
        payload = self.get_payload()

        if 'status' in payload and payload['status'] != model.status:
            if Backfill.Status.INITIAL == payload['status']:
                model.update(status=payload['status'])
            elif Backfill.Status.CANCELLED == payload['status']:
                model.update(status=payload['status'])
        else:
            model.update(**extract(payload, ALLOWED_PAYLOAD_KEYS))

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
