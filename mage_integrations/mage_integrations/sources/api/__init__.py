from collections import Counter
from io import BytesIO, StringIO
from typing import Dict, Generator, List
from urllib.parse import parse_qs, urlencode, urlsplit

import magic
import pandas as pd
import polars
import requests
from singer.schema import Schema

from mage_integrations.sources.base import Source, main
from mage_integrations.sources.catalog import Catalog, CatalogEntry
from mage_integrations.sources.constants import (
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    REPLICATION_METHOD_FULL_TABLE,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.sources.utils import get_standard_metadata
from mage_integrations.transformers.utils import convert_data_type, infer_dtypes
from mage_integrations.utils.dictionary import dig


class Api(Source):
    @property
    def http_method(self):
        return 'post' if self.config.get('method', 'GET').upper() == 'POST' else 'get'

    def discover(self, streams: List[str] = None) -> Catalog:
        streams = []

        for rows in self.load_data():
            if len(rows) >= 1:

                df = pd.DataFrame(rows)

                stream_id = 'api'

                properties = {}
                for col in df.columns:
                    df_filtered = df[df[col].notnull()][[col]]

                    for k, v in infer_dtypes(df_filtered).items():
                        if 'mixed' == v:
                            counter = Counter(map(type, df_filtered[col].values))
                            dtype, count = sorted(
                                [(k, v) for k, v in dict(counter).items()],
                                key=lambda t: t[1],
                                reverse=True,
                            )[0]

                            if dtype is list:
                                col_type = COLUMN_TYPE_ARRAY
                            elif dtype is dict:
                                col_type = COLUMN_TYPE_OBJECT
                            else:
                                col_type = COLUMN_TYPE_STRING
                        else:
                            col_type = convert_data_type(v)
                        properties[k] = dict(
                            type=[
                                'null',
                                col_type,
                            ],
                        )

                schema = Schema.from_dict(dict(
                    properties=properties,
                    type='object',
                ))

                metadata = get_standard_metadata(
                    key_properties=[],
                    replication_method=REPLICATION_METHOD_FULL_TABLE,
                    schema=schema.to_dict(),
                    stream_id=stream_id,
                )
                catalog_entry = CatalogEntry(
                    key_properties=[],
                    metadata=metadata,
                    replication_method=REPLICATION_METHOD_FULL_TABLE,
                    schema=schema,
                    stream=stream_id,
                    tap_stream_id=stream_id,
                    unique_conflict_method=UNIQUE_CONFLICT_METHOD_UPDATE,
                )

                streams.append(catalog_entry)

        return Catalog(streams)

    def _deal_with_google_sheets(self, response, separator, header):
        url = self.config['url']

        if url.endswith('output=csv'):
            df = polars.read_csv(StringIO(response.content.decode()), separator=separator,
                                 has_header=header).to_pandas()
            return df
        elif url.endswith('output=tsv'):
            df = polars.read_csv(StringIO(response.content.decode()), separator='\t',
                                 has_header=header).to_pandas()
            return df
        elif url.endswith('output=xlsx'):
            df = pd.read_excel(BytesIO(response.content), header=0 if header else None)
            return df
        else:
            raise Exception('Extension not allowed, please use CSV,TSV or XLSX')

    def _check_response_type(self, response):
        """This function checks the type of response for:
        CSV,TSV,Excel file or JSON

        Args:
            response (Response): Response from given request
        """
        url = self.config['url']

        if url.startswith('https://docs.google'):
            return 'google_sheets'

        data = response.content
        mime_type = magic.Magic(mime=True).from_buffer(data)
        return mime_type

    def __build_response(self):
        url = self.config['url']
        query = self.config.get('query')
        payload = self.config.get('payload')
        headers = {
            'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) \
             Chrome/86.0.4240.111 Safari/537.36',
        }
        if self.config.get('headers') is not None:  # preventing iteration errors in headers.update
            headers.update(self.config.get('headers', {}))

        tags = dict(
            headers=headers,
            method=self.http_method,
            payload=payload,
            query=query,
            url=url,
        )

        if query:
            query_string = urlsplit(url).query
            query_existing = parse_qs(query_string) or {}
            query_existing.update(query)
            query_string_new = urlencode(query_existing)
            base = url.split('?')[0]
            url = f'{base}?{query_string_new}'

        self.logger.info(f'API request {self.http_method} {url} started.', tags=tags)

        s = requests.Session()
        a = requests.adapters.HTTPAdapter(max_retries=100)
        b = requests.adapters.HTTPAdapter(max_retries=100)
        s.mount('http://', a)
        s.mount('https://', b)

        return getattr(s, self.http_method)(
            url,
            data=payload,
            headers=headers,
            timeout=12,
            verify=False,
        )

    def load_data(
        self,
        *args,
        **kwargs,
    ) -> Generator[List[Dict], None, None]:
        url = self.config['url']
        response_parser = self.config.get('response_parser')
        columns = self.config.get('columns')

        separator = self.config.get('separator')
        if separator is None:
            separator = ','

        header = self.config.get('has_header')
        if header is None:
            header = False

        response = self.__build_response()

        checked_type = self._check_response_type(response)

        if checked_type == 'text/plain' or checked_type == 'text/csv':
            df = polars.read_csv(StringIO(response.content.decode()), separator=separator,
                                 has_header=header).to_pandas()
            yield df.to_dict(orient='records')

        elif checked_type == 'google_sheets':
            df = self._deal_with_google_sheets(response, separator, header)
            yield df.to_dict(orient='records')

        elif checked_type == 'application/gzip':
            df = polars.read_csv(BytesIO(response.content),
                                 sepr=separator,
                                 has_header=header,).to_pandas()
            yield df.to_dict(orient='records')

        elif checked_type == 'application/json':
            result = response.json()

            if result is None:
                raise Exception('API response is None.')

            if response_parser:
                result = dig(result, response_parser)

                if result is None:
                    raise Exception(f'API response with parser {response_parser} is None.')

            sample = None
            requires_columns = False
            if result and len(result) >= 1:
                sample = result[0]
                requires_columns = type(sample) is not dict

            rows = []

            if requires_columns:
                if not columns or len(columns) == 0:
                    col_length = 0
                    if type(sample) is list:
                        max_length = 0

                        for item in result:
                            if item:
                                length = len(item)
                                if length > max_length:
                                    max_length = length
                                    sample = item

                        col_length = len(sample)
                    else:
                        col_length = 1
                    columns = [f'col{i}' for i in range(col_length)]

                for item in result:
                    if type(item) is not list:
                        item = [item]
                    rows.append({col: item[idx] if len(item) > idx else None
                                for idx, col in enumerate(columns)})
            else:
                rows = result

            self.logger.info(f'API request {self.http_method} {url} completed.')

            yield rows

        else:
            try:
                df = pd.read_excel(BytesIO(response.content), header=0 if header else None)
                yield df.to_dict(orient='records')
            except Exception:
                raise Exception(f'Problems reading file {checked_type}. Check if extension is XLSX')

    def test_connection(self):
        response = self.__build_response()
        if response.status_code != 200:
            raise Exception(f'API response status code is {response.status_code}, must be 200.')


if __name__ == '__main__':
    main(Api)
