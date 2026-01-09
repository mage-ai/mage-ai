# Kafka OAUTH BEARER Authentication Example

This example shows how to configure Kafka streaming source and sink with OAUTH BEARER authentication.

## Configuration for Kafka Source (Consumer)

```python
from mage_ai.streaming.sources.kafka import KafkaSource

config = {
    'connector_type': 'kafka',
    'bootstrap_server': 'kafka-broker.example.com:9092',
    'consumer_group': 'my-consumer-group',
    'topic': 'my-topic',
    'security_protocol': 'SASL_SSL',
    'sasl_config': {
        'mechanism': 'OAUTHBEARER',
        'oauth_token_url': 'https://keycloak.example.com/auth/realms/myrealm/protocol/openid-connect/token',
        'oauth_client_id': 'kafka-client',
        'oauth_client_secret': 'your-client-secret',
        'oauth_scope': 'kafka',  # Optional
    },
    # Optional SSL configuration
    'ssl_config': {
        'cafile': '/path/to/ca-cert.pem',
        'check_hostname': True,
    }
}

source = KafkaSource(config)
```

## Configuration for Kafka Sink (Producer)

```python
from mage_ai.streaming.sinks.kafka import KafkaSink

config = {
    'connector_type': 'kafka',
    'bootstrap_server': 'kafka-broker.example.com:9092',
    'topic': 'my-topic',
    'security_protocol': 'SASL_SSL',
    'sasl_config': {
        'mechanism': 'OAUTHBEARER',
        'oauth_token_url': 'https://keycloak.example.com/auth/realms/myrealm/protocol/openid-connect/token',
        'oauth_client_id': 'kafka-client',
        'oauth_client_secret': 'your-client-secret',
        'oauth_scope': 'kafka',  # Optional
    },
    # Optional SSL configuration
    'ssl_config': {
        'cafile': '/path/to/ca-cert.pem',
    }
}

sink = KafkaSink(config)
```

## YAML Configuration

For block configuration in Mage AI:

```yaml
connector_type: kafka
bootstrap_server: kafka-broker.example.com:9092
consumer_group: my-consumer-group  # For source only
topic: my-topic
security_protocol: SASL_SSL
sasl_config:
  mechanism: OAUTHBEARER
  oauth_token_url: https://keycloak.example.com/auth/realms/myrealm/protocol/openid-connect/token
  oauth_client_id: kafka-client
  oauth_client_secret: your-client-secret
  oauth_scope: kafka  # Optional
ssl_config:
  cafile: /path/to/ca-cert.pem
  check_hostname: true
```

## Required Configuration Parameters

For OAUTHBEARER mechanism, the following parameters are **required** in `sasl_config`:

- `mechanism`: Must be set to `'OAUTHBEARER'`
- `oauth_token_url`: The OAuth 2.0 token endpoint URL (e.g., Keycloak token endpoint)
- `oauth_client_id`: The OAuth 2.0 client ID
- `oauth_client_secret`: The OAuth 2.0 client secret

## Optional Configuration Parameters

- `oauth_scope`: The OAuth 2.0 scope to request (optional)
- `ssl_config`: SSL/TLS configuration for secure connections (optional but recommended)

## How It Works

1. The token provider uses OAuth 2.0 client credentials flow to obtain an access token
2. The token is automatically cached and refreshed before expiry
3. The token is sent with each Kafka connection using SASL/OAUTHBEARER mechanism
4. Token refresh happens automatically in the background (60 seconds before expiry by default)

## Keycloak Example

If you're using Keycloak as your OAuth provider:

1. Token URL format: `https://<keycloak-host>/auth/realms/<realm-name>/protocol/openid-connect/token`
2. Create a client in Keycloak with "Client Credentials" flow enabled
3. Note the client ID and secret
4. Configure Kafka broker to use OAUTHBEARER mechanism with the same Keycloak realm

## Troubleshooting

If you encounter authentication issues:

1. Verify the token URL is correct and accessible
2. Check that client ID and secret are correct
3. Ensure the Kafka broker is configured to accept OAUTHBEARER
4. Check that SSL certificates are valid (if using SASL_SSL)
5. Review Kafka broker logs for authentication errors
