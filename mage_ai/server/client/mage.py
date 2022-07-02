from mage_ai.shared.hash import merge_dict

import json
import logging
import requests

logger = logging.getLogger(__name__)


class Mage:
    def __init__(self, **kwargs):
        self.url_prefix = 'https://backend.mage.ai/api/v1'

    def sync_pipeline(self, pipeline, api_key):
        error_message = f'Syncing pipeline {pipeline.id} failed'
        if api_key is None:
            logger.error(f'{error_message}, invalid API key')
            return
        feature_set = pipeline.get_feature_set()
        if feature_set is None:
            logger.error(f'{error_message}, feature set does not exist')
            return
        pipeline_name = f"{feature_set.metadata['name']}_pipeline"
        data = {
            'data_cleaning_pipeline': {
                'name': pipeline_name,
                'pipeline_actions': pipeline.pipeline.actions,
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
                pipeline.metadata = merge_dict(
                    pipeline.metadata,
                    {
                        'remote_id': pipeline_response['id'],
                    },
                )
        except:
            logger.exception(error_message)
            pass

    def get_pipeline_actions(self, id, api_key):
        if api_key is None:
            logger.error('Fetching pipeline actions failed, invalid API key')
            return []
        try:
            response = requests.get(
                headers={
                    'Content-Type': 'application/json',
                    'X-API-KEY': api_key,
                },
                url=f'{self.url_prefix}/data_cleaning_pipelines/{id}',
            ).json()
            return response['data_cleaning_pipeline'].get('pipeline_actions', [])
        except:
            logger.exception('Fetching pipeline actions from database failed')
            return []
