from mage_ai.api.presenters.BasePresenter import BasePresenter


class SparkEnvironmentPresenter(BasePresenter):
    default_attributes = [
        'classpath_entries',
        'hadoop_properties',
        'metrics_properties',
        'resource_profiles',
        'runtime',
        'spark_properties',
        'system_properties',
    ]

    async def prepare_present(self, **kwargs):
        return self.model.to_dict()
