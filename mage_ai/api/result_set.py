from collections import UserList
from mage_ai.api.api_context import ApiContext
from mage_ai.api.resources.Resource import Resource


class ResultSet(UserList):
    def __init__(self, results):
        self.context = ApiContext()
        self.data = []
        self.metadata = {}
        for r in results:
            if issubclass(r.__class__, Resource):
                key = r.__class__.__name__
                if not r.model_options.get('result_sets', None):
                    r.model_options['result_sets'] = {}

                existing_result_set = r.model_options['result_sets'].get(
                    key, None)
                if existing_result_set:
                    for i in self:
                        existing_result_set.append(i)
                    r.model_options['result_sets'][key] = existing_result_set
                else:
                    r.model_options['result_sets'][key] = self
            self.data.append(r)
