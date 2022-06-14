import json
import requests
from mage_ai.data_cleaner.shared.hash import merge_dict

class Mage():
    def __init__(self, **kwargs):
        self.url_prefix = 'https://backend.mage.ai/api/v1'
    
    def sync_pipeline(self, pipeline, api_key):
        feature_set = pipeline.get_feature_set()
        pipeline_name = f"{feature_set.metadata['name']}_pipeline"
        data = {
            'data_cleaning_pipeline': {
                'name': pipeline_name,
                'pipeline_actions': pipeline.pipeline.actions
            }
        }
        try:
            remote_id = pipeline.metadata.get('remote_id')
            if remote_id is not None:
                requests.put(
                    data=json.dumps(data),
                    headers={
                        'Content-Type': 'application/json',
                        'X-API-KEY': api_key,
                    },
                    url=f'{self.url_prefix}/data_cleaning_pipelines/{remote_id}',
                )
            else:
                response = requests.post(
                    data=json.dumps(data),
                    headers={
                        'Content-Type': 'application/json',
                        'X-API-KEY': api_key,
                    },
                    url=f'{self.url_prefix}/data_cleaning_pipelines',
                ).json()
                pipeline_response = response['data_cleaning_pipeline']
                pipeline.metadata = merge_dict(pipeline.metadata, {
                    'remote_id': pipeline_response['id'],
                })
        except:
            pass

    def get_pipeline_actions(self, id, api_key):
        try:
            requests.get(
                headers={
                    'Content-Type': 'application/json',
                    'X-API-KEY': api_key,
                },
                url=f'{self.url_prefix}/data_cleaning_pipelines/{id}',
            ).json()['data_cleaning_pipeline']['pipeline_actions']
        except:
            pass