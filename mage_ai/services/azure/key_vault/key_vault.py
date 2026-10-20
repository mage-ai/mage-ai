import os


class SecretsManager:
    def __init__(self):
        from azure.identity import DefaultAzureCredential
        from azure.keyvault.secrets import SecretClient

        key_vault_url = os.getenv('AZURE_KEY_VAULT_URL')
        if not key_vault_url:
            raise Exception('Please provide valid AZURE_KEY_VAULT_URL in environment variable.')
        cred = DefaultAzureCredential()
        self.client = SecretClient(vault_url=key_vault_url, credential=cred)


secrets_manager = SecretsManager()


def get_secret(secret_name: str) -> str:
    return secrets_manager.client.get_secret(secret_name).value
