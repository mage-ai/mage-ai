from mage_ai.settings.platform.constants import project_platform_activated

if project_platform_activated():
    from mage_ai.orchestration.pipeline_scheduler_project_platform import *
else:
    from mage_ai.orchestration.pipeline_scheduler_original import *
