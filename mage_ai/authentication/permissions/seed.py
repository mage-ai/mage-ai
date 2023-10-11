from mage_ai.api.oauth_scope import OauthScopeType
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.PipelinePolicy import PipelinePolicy


def main(policy_class):
    for operation in OperationType:
        config = policy_class.action_rules[policy_class.__name__].get(operation)
        if not config:
            continue

        for scope in OauthScopeType:
            config2 = config.get(scope)
            if not config2:
                continue

            print(config2)


if __name__ == '__main__':
    main(PipelinePolicy)
