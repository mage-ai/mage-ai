from connections.base import Connection
from connections.google_analytics.constants import (
    CredentialsInfoType,
    DATE_STRING_PATTERN,
    DIMENSIONS,
    METRICS,
)
from connections.google_analytics.utils import parse_response
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import DateRange
from google.analytics.data_v1beta.types import Dimension
from google.analytics.data_v1beta.types import Metric
from google.analytics.data_v1beta.types import RunReportRequest
from typing import Literal, TypedDict
from utils.dictionary import merge_dict
import os
import re


class GoogleAnalytics(Connection):
    def __init__(
        self,
        property_id: int,
        credentials_info: CredentialsInfoType = None,
        path_to_credentials_json_file: str = None,
    ):
        if not credentials_info and not path_to_credentials_json_file:
            raise Exception('GoogleAnalytics connection requires credentials_info or path_to_credentials_json_file.')

        super().__init__()
        self.credentials_info = credentials_info
        self.path_to_credentials_json_file = path_to_credentials_json_file
        self.property_id = property_id

    def load(
        self,
        start_date: str,
        end_date: str = 'today',
        dimensions: Literal[DIMENSIONS] = None,
        limit: int = None,
        metrics: Literal[METRICS] = None,
    ):
        if not re.match(DATE_STRING_PATTERN, start_date):
            raise Exception(f'start_date must match {DATE_STRING_PATTERN}')
        if not re.match(DATE_STRING_PATTERN, end_date):
            raise Exception(f'end_date must match {DATE_STRING_PATTERN}')

        tags = self.build_tags(
            dimensions=dimensions,
            end_date=end_date,
            limit=limit,
            metrics=metrics,
            start_date=start_date,
        )

        if self.credentials_info:
            client = BetaAnalyticsDataClient.from_service_account_info(self.credentials_info)
        elif self.path_to_credentials_json_file:
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = self.path_to_credentials_json_file
            client = BetaAnalyticsDataClient()

        self.info('Loading started.', tags=tags)
        request = RunReportRequest(
            date_ranges=[DateRange(start_date=start_date, end_date='today')],
            dimensions=([Dimension(name=d) for d in dimensions] if dimensions else None),
            limit=limit,
            metrics=([Metric(name=d) for d in metrics] if metrics else None),
            property=f'properties/{self.property_id}',
        )

        data = []
        try:
            response = client.run_report(request)
            data = parse_response(request, response)
        except Exception as err:
            self.exception(f'Loading err: {err}.', tags=dict(
                error=err,
            ))

        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = ''

        self.info('Loading completed.', tags=merge_dict(tags, dict(count=len(data))))

        return data
