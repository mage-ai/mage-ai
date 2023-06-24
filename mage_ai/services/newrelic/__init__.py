import newrelic.agent

from mage_ai.settings import ENABLE_NEW_RELIC, NEW_RELIC_CONFIG_PATH


def initialize_new_relic():
    enable_new_relic = ENABLE_NEW_RELIC
    application = None
    if ENABLE_NEW_RELIC:
        try:
            newrelic.agent.initialize(NEW_RELIC_CONFIG_PATH)
            application = newrelic.agent.register_application(timeout=10)
        except newrelic.api.exceptions.ConfigurationError as error:
            print(f"Configuration error with new relic initialization. Disable "
                  f"new relic reporting. Message: {error}")
            enable_new_relic = False
        except Exception as error:
            print("Unexpected error with new relic initialization. Disable "
                  f"new relic reporting. Message: {error}")
            enable_new_relic = False
    return (enable_new_relic, application)
