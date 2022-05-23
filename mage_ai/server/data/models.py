from mage_ai.data_cleaner.pipelines.base import BasePipeline
from numpyencoder import NumpyEncoder
from server.data.base import Model

import json
import os
import os.path
import pandas as pd

# right now, we are writing the feature sets to local files
class FeatureSet(Model):
    def __init__(self, id=None, df=None):
        super().__init__(id)

        try:
            metadata = self.metadata
        except:
            self.metadata = {}
            metadata = self.metadata

        if self.pipeline is None:
            pipeline = Pipeline()
            metadata['pipeline_id'] = pipeline.id
            self.metadata = metadata

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
        with open(os.path.join(self.dir, 'metadata.json')) as file:
            return json.load(file)
    
    @metadata.setter
    def metadata(self, metadata):
        with open(os.path.join(self.dir, 'metadata.json'), 'w') as file:
            json.dump(metadata, file)

    @property
    def sample_data(self):
        sample_size = 20
        if self._data.size < sample_size:
            sample_size = self._data.size 
        return self._data.sample(1)

    @property
    def statistics(self):
        with open(os.path.join(self.dir, 'statistics.json')) as file:
            return json.load(file)

    @property
    def insights(self):
        with open(os.path.join(self.dir, 'insights.json')) as file:
            return json.load(file)

    @property
    def suggestions(self):
        with open(os.path.join(self.dir, 'suggestions.json')) as file:
            return json.load(file)
    
    @property
    def pipeline(self):
        metadata = self.metadata
        if 'pipeline_id' not in metadata:
            return None    
        pipeline = Pipeline(id=metadata['pipeline_id'])
        return pipeline.pipeline

    def write_files(self, obj):
        if 'df_cleaned' in obj:
            self.data = obj['df_cleaned']
        if 'suggested_actions' in obj:
            with open(os.path.join(self.dir, 'suggestions.json'), 'w') as file:
                json.dump(obj['suggested_actions'], file)
        if 'statistics' in obj:
            with open(os.path.join(self.dir, 'statistics.json'), 'w') as file:
                json.dump(obj['statistics'], file, cls=NumpyEncoder)
        if 'analysis' in obj:
            with open(os.path.join(self.dir, 'insights.json'), 'w') as file:
                json.dump(obj['analysis'], file, cls=NumpyEncoder)

    def column(self, column):
        column_dict = dict()
        with open(os.path.join(self.dir, f'columns/{column}/statistics.json')) as column_stats:
            column_dict['statistics'] = json.load(column_stats)
        with open(os.path.join(self.dir, f'columns/{column}/insights.json')) as column_insights:
            column_dict['insights'] = json.load(column_insights)
        return column_dict

    def to_dict(self):
        return dict(
            id=self.id,
            metadata=self.metadata,
            pipeline_actions=self.pipeline.actions,
            sample_data=self.sample_data.to_dict(),
            statistics=self.statistics,
            insights=self.insights,
            suggestions=self.suggestions,
        )
        
class Pipeline(Model):
    def __init__(self, id=None, pipeline=None):
        # TODO: figure out a good directory to store the files
        super().__init__(id)
        if pipeline is not None:
            self.pipeline = pipeline
        else:
            self.pipeline = BasePipeline()
    
    @property
    def pipeline(self):
        actions = []
        with open(os.path.join(self.dir, 'pipeline.json')) as file:
            actions = json.load(file)
        return BasePipeline(actions=actions)

    @pipeline.setter
    def pipeline(self, pipeline):
        with open(os.path.join(self.dir, 'pipeline.json'), 'w') as file:
            json.dump(pipeline.actions, file)

    def to_dict(self):
        return dict(
            actions=self.pipeline.actions,
        )
