from dataclasses import dataclass

from mage_ai.shared.config import BaseConfig


@dataclass
class TerminationPolicy(BaseConfig):
    enable_auto_termination: bool = False
    max_idle_seconds: int = 0


@dataclass
class WorkspaceConfig(BaseConfig):
    termination_policy: TerminationPolicy = None
