from http import server
from tests.base_test import TestCase
from server import create_app
from server.routes import clean_df

import pandas as pd
import pytest

class RouteTests(TestCase):
    def setUp(self):
        self.app = create_app()
        self.test_client = self.app.test_client()

    def test_feature_sets(self):
        data = {'col1': [1, 2], 'col2': [3, 4]}
        df = pd.DataFrame(data)
        (self.fs_id, _) = clean_df(df)
        response = self.test_client.get("/feature_sets", json={
            "id": self.fs_id,
        })
        self.assertEqual(len(response.data), 1)



