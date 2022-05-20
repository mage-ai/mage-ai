import json
import os
import os.path
import pandas as pd

from mage_ai.server.data.base import Model

# right now, we are writing the feature sets to local files
class FeatureSet(Model):
    def __init__(self, id=None, df=None):
        super.__init__(id)
            
        if df is None:
            self._data = pd.read_parquet(os.path.join(self.dir, 'data.parquet'), engine='pyarrow')
        else:
            self.data = df
    
    def folder_name(self):
        return 'feature_sets'

    @property
    def data(self):
        return self._data

    @data.setter
    def data(self, df):
        df.to_parquet(os.path.join(self.dir, 'data.parquet'))
        self._data = df
    
    @property
    def metadata(self):
        with open(os.path.join(self.dir, 'metadata.json')) as file:
            return json.load(file)

    @property
    def sample_data(self):
        with open(os.path.join(self.dir, 'sample_data.json')) as file:
            return json.load(file)

    @property
    def transformer_actions(self):
        with open(os.path.join(self.dir, 'transformer_actions.json')) as file:
            return json.load(file)

    @property
    def statistics(self):
        with open(os.path.join(self.dir, 'statistics.json')) as file:
            return json.load(file)

    @property
    def insights(self):
        with open(os.path.join(self.dir, 'insights.json')) as file:
            return json.load(file)

    def cleaning_pipeline(self):
        pipeline = Pipeline(id=self.metadata['pipeline_id'])
        return pipeline.pipeline

    def column(self, column):
        column_dict = dict()
        with open(os.path.join(self.dir, f'columns/{column}/statistics.json')) as column_stats:
            column_dict['statistics'] = json.load(column_stats)
        with open(os.path.join(self.dir, f'columns/{column}/insights.json')) as column_insights:
            column_dict['insights'] = json.load(column_insights)
        return column_dict

    def to_dict(self):
        return dict(
            metadata=self.metadata,
            transformer_actions=self.transformer_actions,
            sample_data=self.sample_data,
            statistics=self.statistics,
            insights=self.insights,
        )
        
class Pipeline():
    def __init__(self, id=None, pipeline=None):
        # TODO: figure out a good directory to store the files
        super.__init__(id)
        if pipeline is None:
            self.pipeline = pipeline
    
    def folder_name(self):
        return 'pipelines'
    
    @property
    def pipeline(self):
        with open(os.path.join(self.dir, 'pipeline.json')) as file:
            return json.load(file)

    @pipeline.setter
    def pipeline(self, pipeline):
        with open(os.path.join(self.dir, 'pipeline.json'), 'w') as file:
            file.write(pipeline)

    def to_dict(self):
        return dict(
            pipeline=self.pipeline,
        )
