import json
import os
import re
from typing import Dict

import requests

from mage_ai.ai.ai_client import AIClient
from mage_ai.data_preparation.repo_manager import get_repo_config

llama_model = "meta-llama/Llama-2-7b-hf"
mistralai_model = "mistralai/Mistral-7B-Instruct-v0.1"

headers = {
    "Content-Type": "application/json"
}

"""
This HuggingFaceClient is calling a Hugging Face Inference API endpoint
with API endpoint and API token: https://huggingface.co/inference-endpoints.

The model I tested and verified is mistral-7b-instruct-v0.1.
"""


class HuggingFaceClient(AIClient):
    def __init__(self):
        hf_config = get_repo_config().ai_config.get("hugging_face_config")
        self.api_token = hf_config.get("huggingface_inference_api_token") \
            or os.getenv('HUGGINGFACE_INFERENCE_API_TOKEN')
        self.api = hf_config.get("huggingface_api") or \
            os.getenv('HUGGINGFACE_API')

    async def inference_with_prompt(
            self,
            variable_values: Dict[str, str],
            prompt_template: str,
            is_json_response: bool = True
    ):
        formated_prompt = prompt_template.format(**variable_values)
        data = json.dumps({
            "inputs": formated_prompt,
            "parameters": {
                "return_full_text": False,
                "max_new_tokens": 800,
                "num_return_sequences": 1}})
        headers.update(
            {"Authorization": f"Bearer {self.api_token}"})
        response = requests.post(self.api, headers=headers, data=data)
        response_json = response.json()
        if "error" in response_json:
            print(f'Error from hugging face endpoint: {response_json["error"]}')
            return ""
        generated_text = response.json()[0]["generated_text"].lstrip('\n')
        if is_json_response:
            # Clean up unexpected JSON format.
            generated_text = re.sub(r'^```json', '', generated_text)
            generated_text = re.sub(r'```$', '', generated_text)
            generated_text = re.sub(r'"""', '"', generated_text)
            return json.loads(generated_text, strict=False)
        return generated_text
