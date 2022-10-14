from connections.amplitude.utils import build_date_range
from connections.base import Connection
from datetime import timedelta
from utils.dates import date_intervals
from utils.dictionary import flatten, merge_dict
import gzip
import io
import json
import requests
import zipfile

DATE_FORMAT = '%Y%m%dT%H' # 20150201T0
URL = 'https://amplitude.com/api/2/export'


class Amplitude(Connection):
    def __init__(self, api_key, secret_key):
        super().__init__()
        self.api_key = api_key
        self.secret_key = secret_key

    def load(
        self,
        start_date,
        end_date=None,
        offset=None,
        sample=False,
    ):
        data = []
        start_date, end_date = build_date_range(
            end_date=end_date,
            offset=offset,
            sample=sample,
            start_date=start_date,
        )

        tags = self.build_tags(
            end_date=end_date,
            offset=offset,
            sample=sample,
            start_date=start_date,
        )
        self.info('Loading started.', tags=tags)

        if start_date is None and end_date is None:
            self.error('No start date and no end date.', tags=tags)
            return data

        # Use a large timedelta or else Amplitude will return a 429 error
        intervals = date_intervals(start_date, end_date, timedelta(days=14))
        for sd, ed in intervals:
            zip_file = self.__fetch_files(sd, ed)
            if zip_file:
                data += self.__build_data_from_zip_file(zip_file)

        self.info('Loading completed.', tags=merge_dict(tags, dict(count=len(data))))

        return data

    def build_tags(self, **kwargs):
        tags = dict()
        if kwargs.get('start_date'):
            tags['start'] = kwargs['start_date']
            kwargs.pop('start_date')
        if kwargs.get('end'):
            tags['end'] = kwargs['end_date']
            kwargs.pop('end_date')

        return merge_dict(tags, kwargs)

    def __build_data_from_zip_file(self, zip_file):
        file_content = ''

        with zipfile.ZipFile(zip_file) as zipper1:
            for filename1 in zipper1.namelist():
                with zipper1.open(filename1) as file1:
                    if '.gz' in filename1:
                        decompressed_file = gzip.GzipFile(fileobj=file1)
                        file_content += decompressed_file.read().decode('utf-8')
                    else:
                        try:
                            with zipfile.ZipFile(file1) as zipper2:
                                for file_name2 in zipper2.namelist():
                                    with zipper2.open(file_name2) as file2:
                                        decompressed_file = gzip.GzipFile(fileobj=file2)
                                        file_content += decompressed_file.read().decode('utf-8')
                        except zipfile.BadZipFile as err:
                            self.exception(f'{err} when unzipping file.', tags=dict(
                                error=err,
                                filename=filename1,
                            ))

        arr = file_content.split('\n')

        data = []
        for i in arr:
            if i:
                try:
                    data.append(flatten(json.loads(i)))
                except Exception as err:
                    self.exception(f'{err} when loading from JSON string.', tags=dict(
                        error=err,
                        json_string=i,
                    ))

        return data


    def __fetch_files(self, start_date, end_date):
        start_date_string = start_date.strftime(DATE_FORMAT)
        end_date_string = end_date.strftime(DATE_FORMAT)

        tags = self.build_tags(start_date=start_date_string, end_date=end_date_string)

        url = f'{URL}?start={start_date_string}&end={end_date_string}'
        self.info('Fetch files started.', tags=tags)

        response = requests.get(url, auth=(self.api_key, self.secret_key))
        if response.status_code == 200:
            self.info('Fetch files succeeded.', tags=tags)
            return io.BytesIO(response.content)
        elif response.status_code == 403 or response.status_code >= 500:
            self.error('Failed to fetch files.', tags=merge_dict(tags, dict(
                reason=response.reason,
                status_code=response.status_code,
            )))
        else:
            self.error('Failed to fetch files.', tags=merge_dict(tags, dict(
                status_code=response.status_code,
            )))

        return None

