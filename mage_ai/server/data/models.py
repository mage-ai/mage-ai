from mage_ai.data_cleaner.pipelines.base import BasePipeline
from mage_ai.server.client.mage import Mage
from mage_ai.server.data.base import Model
from mage_ai.shared.constants import SAMPLE_SIZE
from mage_ai.shared.hash import merge_dict
import logging
import os
import os.path

logger = logging.getLogger(__name__)


# right now, we are writing the models to local files to reduce dependencies
class FeatureSet(Model):
    def __init__(self, id=None, df=None, name=None, api_key=None):
        super().__init__(id)

        # Update metadata
        try:
            metadata = self.metadata
        except Exception:
            self.metadata = {}
            metadata = self.metadata

        metadata_updated = False
        if name is not None:
            metadata['name'] = name
            metadata_updated = True

        if self.pipeline is None:
            pipeline = Pipeline(feature_set_id=self.id, api_key=api_key)
            metadata['pipeline_id'] = pipeline.id
            metadata_updated = True

        if metadata_updated:
            self.metadata = metadata

        if df is None:
            self._data = None
            self._data_orig = None
        else:
            self.data = df
            self.data_orig = df

    def __repr__(self):
        formatted_suggestions = []
        for idx, s in enumerate(self.suggestions):
            formatted_suggestions.append(
                f'{idx + 1}. {s["title"]}({s["action_payload"]["action_arguments"]}):'
                f' {s["message"]}',
            )
        suggestion_str = '\n'.join(formatted_suggestions)
        return f'<FeatureSet {self.id}> Cleaning suggestions:\n{suggestion_str}'

    @property
    def data(self):
        if self._data is None:
            self._data = self.read_parquet_file('data.parquet')
        return self._data

    @property
    def cleaning_rule_configs(self):
        return self.read_json_file('cleaning_rule_configs.json', {})

    @cleaning_rule_configs.setter
    def cleaning_rule_configs(self, configs):
        return self.write_json_file('cleaning_rule_configs.json', configs)

    @data.setter
    def data(self, df):
        self.write_parquet_file(os.path.join(self.dir, 'data.parquet'), df)
        self._data = df

    @property
    def data_orig(self):
        if self._data_orig is None:
            self._data_orig = self.read_parquet_file('data_orig.parquet')
        return self._data_orig

    @data_orig.setter
    def data_orig(self, df):
        self.write_parquet_file(os.path.join(self.dir, 'data_orig.parquet'), df)
        self._data_orig = df

    @property
    def metadata(self):
        return self.read_json_file('metadata.json', {})

    @metadata.setter
    def metadata(self, metadata):
        return self.write_json_file('metadata.json', metadata)

    @property
    def statistics(self):
        return self.read_json_file('statistics.json', {})

    @statistics.setter
    def statistics(self, metadata):
        return self.write_json_file('statistics.json', metadata)

    @property
    def insights(self):
        return self.read_json_file('insights.json', [])

    @insights.setter
    def insights(self, metadata):
        return self.write_json_file('insights.json', metadata)

    @property
    def suggestions(self):
        return self.read_json_file('suggestions.json', [])

    @suggestions.setter
    def suggestions(self, metadata):
        return self.write_json_file('suggestions.json', metadata)

    @property
    def pipeline(self):
        pipeline_id = self.metadata.get('pipeline_id')
        if pipeline_id is None:
            return None
        return Pipeline(id=pipeline_id)

    @property
    def sample_data(self):
        sample_size = SAMPLE_SIZE
        if self.data.size < sample_size:
            sample_size = len(self.data)
        return self.data.head(sample_size)

    def version_snapshot(self, version):
        return self.read_json_file(f'versions/{version}.json', {})

    def write_files(self, obj, write_orig_data=False, prev_version=None):
        if prev_version is not None:
            # Save the old version as a snapshot
            self.write_version_snapshot(prev_version)
        if 'cleaning_rule_configs' in obj:
            self.cleaning_rule_configs = obj['cleaning_rule_configs']
        if 'df' in obj:
            self.data = obj['df']
        if 'metadata' in obj:
            self.metadata = obj['metadata']
        if 'suggestions' in obj:
            self.suggestions = obj['suggestions']
        if 'statistics' in obj:
            self.statistics = obj['statistics']
        if 'insights' in obj:
            self.insights = obj['insights']
        if write_orig_data and 'df' in obj:
            self.data_orig = obj['df']
        # Update metadata
        metadata = self.metadata
        if 'column_types' in obj:
            metadata['column_types'] = obj['column_types']
        if 'statistics' in obj:
            metadata['statistics'] = dict(
                count=obj['statistics']['count'],
                quality='Good' if obj['statistics']['validity'] >= 0.8 else 'Bad',
            )
        self.metadata = metadata

    def write_version_snapshot(self, version):
        version_snapshot = self.to_dict()
        try:
            self.write_json_file(f'{version}.json', version_snapshot, subdir='versions')
        except Exception:
            logger.exception(f'Failed to write snapshot v{version} for feature set {self.id}')
        return version_snapshot

    def to_dict(self, column=None, detailed=True, version=None):
        if version is not None:
            return self.version_snapshot(version)
        obj = dict(
            id=self.id,
            metadata=self.metadata,
        )
        if detailed:
            sample_data = self.sample_data
            datetime_cols = [
                col for col in sample_data.columns if 'datetime64' in str(sample_data[col])
            ]
            sample_data[datetime_cols] = sample_data[datetime_cols].astype(str)
            # Filter sample data
            if column is not None:
                sample_data_dict = dict(
                    columns=[column],
                    rows=[[v] for v in sample_data[column].to_numpy().tolist()],
                )
            else:
                sample_data_dict = dict(
                    columns=sample_data.columns.tolist(),
                    rows=sample_data.to_numpy().tolist(),
                )
            # Filter suggestions
            suggestions = self.suggestions
            if column is not None:
                suggestions = [
                    s for s in suggestions if column in s['action_payload']['action_arguments']
                ]
                for s in suggestions:
                    s['action_payload']['action_arguments'] = [column]

            # Deduplicate outlier removal suggestions
            pipeline_dict = self.pipeline.to_dict()
            statistics = self.statistics
            suggestions_filtered, statistics_updated = BasePipeline.deduplicate_suggestions(
                pipeline_dict['actions'],
                suggestions,
                statistics,
            )
            obj = merge_dict(
                obj,
                dict(
                    pipeline=pipeline_dict,
                    sample_data=sample_data_dict,
                    statistics=statistics_updated,
                    insights=self.insights,
                    cleaning_rule_configs=self.cleaning_rule_configs,
                    suggestions=suggestions_filtered,
                ),
            )
        return obj


class Pipeline(Model):
    def __init__(self, id=None, path=None, feature_set_id=None, pipeline=None, api_key=None):
        super().__init__(id=id, path=path)

        # Update metadata
        try:
            metadata = self.metadata
        except Exception:
            self.metadata = {}
            metadata = self.metadata

        if feature_set_id is not None:
            metadata['feature_set_id'] = int(feature_set_id)
            self.metadata = metadata

        if pipeline is not None:
            self.pipeline = pipeline
            if api_key is not None:
                self.sync_pipeline(api_key)

    def sync_pipeline(self, api_key):
        Mage().sync_pipeline(self, api_key)

    @property
    def metadata(self):
        return self.read_json_file('metadata.json', {})

    @metadata.setter
    def metadata(self, metadata):
        return self.write_json_file('metadata.json', metadata)

    @property
    def pipeline(self):
        fpath = 'pipeline.json'
        if self.path is not None and os.path.isfile(self.path):
            fpath = self.path
        actions = self.read_json_file(fpath, [])
        return BasePipeline(actions=actions)

    @pipeline.setter
    def pipeline(self, pipeline):
        return self.write_json_file('pipeline.json', pipeline.actions)

    def get_feature_set(self):
        feature_set_id = self.metadata.get('feature_set_id')
        if feature_set_id is not None:
            return FeatureSet(id=feature_set_id)

    def to_dict(self, detailed=True):
        return dict(
            id=self.id,
            metadata=self.metadata,
            actions=self.pipeline.actions,
        )
