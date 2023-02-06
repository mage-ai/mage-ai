from mage_ai.orchestration.backfills.service import start_backfill, cancel_backfill
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import Backfill
from mage_ai.server.api.base import BaseHandler
from mage_ai.shared.hash import extract, merge_dict
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
        model = Backfill.create(
            **extract(payload, ALLOWED_PAYLOAD_KEYS),
            pipeline_uuid=pipeline_uuid,
        )
        self.write(dict(backfill=model.to_dict()))


class ApiBackfillHandler(BaseHandler):
    datetime_keys = ['start_datetime', 'end_datetime']
    model_class = Backfill

    @safe_db_query
    def get(self, id):
        model = Backfill.query.get(int(id))
        self.write(dict(backfill=model.to_dict()))

    @safe_db_query
    def put(self, id):
        model = Backfill.query.get(int(id))
        payload = self.get_payload()

        pipeline_runs = []

        if 'status' in payload and payload['status'] != model.status:
            if Backfill.Status.INITIAL == payload['status']:
                pipeline_runs += start_backfill(model)
                model.update(status=payload['status'])
            elif Backfill.Status.CANCELLED == payload['status']:
                cancel_backfill(model)
                model.update(status=payload['status'])
        else:
            model.update(**extract(payload, ALLOWED_PAYLOAD_KEYS))

        self.write(dict(block_run=merge_dict(model.to_dict(), dict(
            pipeline_runs=[pr.to_dict() for pr in pipeline_runs],
        ))))


class ApiBackfillsHandler(BaseHandler):
    model_class = Backfill

    @safe_db_query
    def get(self):
        pipeline_uuid = self.get_argument('pipeline_uuid', None)

        results = (
            Backfill.
            query.
            filter(Backfill.pipeline_uuid == pipeline_uuid).
            order_by(desc(Backfill.created_at))
        )

        results = self.limit(results)
        collection = [b.to_dict() for b in results]

        self.write(dict(backfills=collection))
