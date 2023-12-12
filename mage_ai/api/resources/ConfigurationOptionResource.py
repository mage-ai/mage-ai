from mage_ai.api.resources.AsyncBaseResource import AsyncBaseResource
from mage_ai.settings.models.configuration_option import ConfigurationOption


class ConfigurationOptionResource(AsyncBaseResource):
    @classmethod
    async def collection(self, query, _meta, user, **kwargs):
        configuration_type = query.get('configuration_type', [None])
        if configuration_type:
            configuration_type = configuration_type[0]

        option_type = query.get('option_type', [None])
        if option_type:
            option_type = option_type[0]

        resource_type = query.get('resource_type', [None])
        if resource_type:
            resource_type = resource_type[0]

        results = await ConfigurationOption.fetch(
            configuration_type=configuration_type,
            option_type=option_type,
            resource_type=resource_type,
        )

        return self.build_result_set(
            results,
            user,
            **kwargs,
        )
