import unittest
from unittest.mock import MagicMock, patch
from mage_integrations.sources.api import Api



class ApiTest(unittest.TestCase):
    def test_api_csv(self):
        source = Api(config=dict(
            url='https://docs.google.com/spreadsheets/d/e/2PACX-1vTlHOAjgtOk99kDCjamRToX3Jm4p5HQc4ren6QXQIePZvVnrrVZWmIbMuRQ6m41mzuFpvHHLTjFuYCK/pub?output=csv'
        ))
        api_connection = MagicMock()

        with patch.object(
            source,
            'test_connection',
            return_value=api_connection
        ) as mock_build_connection:
            catalog = source.discover()
            print(catalog.to_dict())

    def test_api_tsv(self):
        source = Api(config=dict(
            url='https://docs.google.com/spreadsheets/d/e/2PACX-1vTlHOAjgtOk99kDCjamRToX3Jm4p5HQc4ren6QXQIePZvVnrrVZWmIbMuRQ6m41mzuFpvHHLTjFuYCK/pub?output=tsv'
        ))
        api_connection = MagicMock()

        with patch.object(
            source,
            'test_connection',
            return_value=api_connection
        ) as mock_build_connection:
            catalog = source.discover()
            print(catalog.to_dict())

    def test_api_xlsx(self):
        source = Api(config=dict(
            url='https://docs.google.com/spreadsheets/d/e/2PACX-1vTlHOAjgtOk99kDCjamRToX3Jm4p5HQc4ren6QXQIePZvVnrrVZWmIbMuRQ6m41mzuFpvHHLTjFuYCK/pub?output=xlsx'
        ))
        api_connection = MagicMock()

        with patch.object(
            source,
            'test_connection',
            return_value=api_connection
        ) as mock_build_connection:
            catalog = source.discover()
            print(catalog.to_dict())

    def test_api_json(self):
        source = Api(config=dict(
            url='https://api.coindesk.com/v1/bpi/currentprice.json'
        ))
        api_connection = MagicMock()

        with patch.object(
            source,
            'test_connection',
            return_value=api_connection
        ) as mock_build_connection:
            response = source._build_response()
            print(response.json())