import json
import os
import os.path
import pandas as pd

# right now, we are writing the feature sets to local files
class FeatureSet():
    def __init__(self, id=None, df=None):
        # TODO: figure out a good directory to store the files
        self.path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'feature_sets'))
        if not os.path.isdir(self.path):
            os.mkdir(self.path)

        if id is None:
            dirs = [name for name in os.listdir(self.path)]
            print('dirs:', dirs)
            self.id = len(dirs)
        else:
            self.id = id
        
        self.dir = os.path.join(self.path, str(self.id))
        if not os.path.isdir(self.dir):
            os.mkdir(self.dir)
            
        if df is None:
            self._data = pd.read_parquet(os.path.join(self.dir, 'data.parquet'), engine='pyarrow')
        else:
            self.data = df
    
    @property
    def data(self):
        return self._data

    @data.setter
    def data(self, df):
        df.to_parquet(os.path.join(self.dir, 'data.parquet'))
        self._data = df
    
    @property
    def metadata(self):
        with open(os.path.join(self.path, 'metadata.json')) as file:
            return json.load(file)

    @property
    def cleaning_pipeline(self):
        with open(os.path.join(self.path, 'cleaning_pipeline.json')) as file:
            return json.load(file)

    @property
    def sample_data(self):
        with open(os.path.join(self.path, 'sample_data.json')) as file:
            return json.load(file)

    @property
    def transformer_actions(self):
        with open(os.path.join(self.path, 'transformer_actions.json')) as file:
            return json.load(file)

    @property
    def statistics(self):
        with open(os.path.join(self.path, 'statistics.json')) as file:
            return json.load(file)

    @property
    def insights(self):
        with open(os.path.join(self.path, 'insights.json')) as file:
            return json.load(file)

    def to_dict(self):
        return dict(
            metadata=self.metadata,
            transformer_actions=self.transformer_actions,
            sample_data=self.sample_data,
            statistics=self.statistics,
            insights=self.insights,
        )
        
