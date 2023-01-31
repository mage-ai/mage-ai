from typing_extensions import TypedDict


class CredentialsInfoType(TypedDict):
    auth_provider_x509_cert_url: str
    auth_uri: str
    client_email: str
    client_id: str
    client_x509_cert_url: str
    private_key: str
    private_key_id: str
    project_id: str
    token_uri: str
    type: str
