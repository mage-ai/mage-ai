from mage_ai.shared.config import BaseConfig


class TerminationPolicy(BaseConfig):
    enable_auto_termination: bool = False
    max_idle_seconds: int = 0


class WorkspaceConfig(BaseConfig):
    termination_policy: TerminationPolicy = TerminationPolicy()
