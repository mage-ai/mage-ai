import json
import os
from typing import Dict

import openai
from langchain.chains import LLMChain
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate

from mage_ai.ai.ai_client import AIClient
from mage_ai.data_preparation.repo_manager import get_repo_config


class OpenAIClient(AIClient):
    def __init__(self):
        repo_config = get_repo_config()
        open_ai_config = repo_config.ai_config.get("open_ai_config")
        openai_api_key = repo_config.openai_api_key or \
            open_ai_config.get("openai_api_key") or os.getenv('OPENAI_API_KEY')
        openai.api_key = openai_api_key
        self.llm = OpenAI(openai_api_key=openai_api_key, temperature=0)

    async def inference_with_prompt(
            self,
            variable_values: Dict[str, str],
            prompt_template: str,
            is_json_response: bool = True
    ):
        """Generic function to call OpenAI LLM and return JSON response by default.

        Fill variables and values into template, and run against LLM
        to genenrate JSON format response.

        Args:
            variable_values: all required variable and values in prompt.
            prompt_template: prompt template for LLM call.
            is_json_response: default is json formatted response.

        Returns:
            We typically suggest response in JSON format. For example:
                {
                    'action_code': 'grade == 5 or grade == 6',
                    'arguments': ['class']
                }
        """
        filled_prompt = PromptTemplate(
            input_variables=list(variable_values.keys()),
            template=prompt_template,
        )
        chain = LLMChain(llm=self.llm, prompt=filled_prompt)
        if is_json_response:
            return json.loads(await chain.arun(variable_values))
        return await chain.arun(variable_values)
