from dataclasses import dataclass

from mage_ai.data_preparation.models.constants import AIMode
from mage_ai.shared.config import BaseConfig


@dataclass
class OpenAIConfig(BaseConfig):
    openai_api_key: str = None


@dataclass
class HuggingFaceConfig(BaseConfig):
    huggingface_api: str = None
    huggingface_inference_api_token: str = None


@dataclass
class AIConfig(BaseConfig):
    mode: AIMode = AIMode.OPEN_AI
    open_ai_config: OpenAIConfig = OpenAIConfig
    hugging_face_config: HuggingFaceConfig = HuggingFaceConfig
