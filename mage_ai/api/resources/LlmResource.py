from mage_ai.ai.generator import Generator
from mage_ai.api.resources.GenericResource import GenericResource


class LLMResource(GenericResource):
    @classmethod
    def create(self, payload, user, **kwargs):
        response = Generator.generate(payload.get('use_case'), payload.get('payload'))
        return dict(
            use_case=payload.get('use_case'),
            response=response,
        )
