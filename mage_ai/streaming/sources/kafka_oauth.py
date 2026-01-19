"""
OAuth token provider for Kafka SASL OAUTHBEARER authentication.

This module provides a token provider implementation for OAuth 2.0 client credentials flow,
which can be used with kafka-python's OAUTHBEARER SASL mechanism.
"""
import logging
import time
from typing import Dict, Optional

import requests

try:
    from kafka.sasl.oauth import AbstractTokenProvider
except ImportError:
    # Fallback for when kafka is not installed
    class AbstractTokenProvider:
        """Fallback token provider interface when kafka-python is not installed."""
        
        def __init__(self, **config):
            pass
        
        def token(self):
            raise NotImplementedError("token() must be implemented by subclass")
        
        def extensions(self):
            return {}


logger = logging.getLogger(__name__)


def create_oauth_token_provider(sasl_config):
    """
    Create an OAuth token provider for OAUTHBEARER mechanism.
    
    Args:
        sasl_config: SASL configuration containing OAuth parameters
        
    Returns:
        ClientCredentialsTokenProvider instance
        
    Raises:
        Exception: If required OAuth parameters are missing
    """
    if not sasl_config.oauth_token_url:
        raise Exception(
            'oauth_token_url is required in sasl_config for OAUTHBEARER mechanism'
        )
    if not sasl_config.oauth_client_id:
        raise Exception(
            'oauth_client_id is required in sasl_config for OAUTHBEARER mechanism'
        )
    if not sasl_config.oauth_client_secret:
        raise Exception(
            'oauth_client_secret is required in sasl_config for OAUTHBEARER mechanism'
        )
    
    return ClientCredentialsTokenProvider(
        token_url=sasl_config.oauth_token_url,
        client_id=sasl_config.oauth_client_id,
        client_secret=sasl_config.oauth_client_secret,
        scope=sasl_config.oauth_scope,
    )


class ClientCredentialsTokenProvider(AbstractTokenProvider):
    """
    Token provider that implements OAuth 2.0 client credentials flow.
    
    This provider fetches access tokens from an OAuth 2.0 authorization server
    (e.g., Keycloak) using client credentials and manages token refresh.
    
    Args:
        token_url: The OAuth 2.0 token endpoint URL
        client_id: The OAuth 2.0 client ID
        client_secret: The OAuth 2.0 client secret
        scope: Optional scope for the token request
        token_expiry_buffer: Buffer time in seconds before token expiry to refresh (default: 60)
    """
    
    def __init__(
        self,
        token_url: str,
        client_id: str,
        client_secret: str,
        scope: Optional[str] = None,
        token_expiry_buffer: int = 60,
        **config
    ):
        super().__init__(**config)
        self.token_url = token_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.scope = scope
        self.token_expiry_buffer = token_expiry_buffer
        
        self._access_token: Optional[str] = None
        self._token_expiry_time: Optional[float] = None
    
    def token(self) -> str:
        """
        Returns a valid access token, fetching a new one if necessary.
        
        Returns:
            str: The access token to use for authentication
        """
        if self._is_token_expired():
            self._fetch_token()
        
        return self._access_token
    
    def _is_token_expired(self) -> bool:
        """
        Check if the current token is expired or will expire soon.
        
        Returns:
            bool: True if token is expired or will expire within buffer time
        """
        if self._access_token is None or self._token_expiry_time is None:
            return True
        
        current_time = time.time()
        return current_time >= (self._token_expiry_time - self.token_expiry_buffer)
    
    def _fetch_token(self):
        """
        Fetch a new access token from the OAuth 2.0 authorization server.
        
        Raises:
            RuntimeError: If token fetch fails
        """
        try:
            data = {
                'grant_type': 'client_credentials',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
            }
            
            if self.scope:
                data['scope'] = self.scope
            
            logger.debug(f"Fetching OAuth token from {self.token_url}")
            
            response = requests.post(
                self.token_url,
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=10,
            )
            
            response.raise_for_status()
            token_data = response.json()
            
            # Validate that access_token is present in the response
            if 'access_token' not in token_data:
                logger.error("OAuth server response missing 'access_token' field")
                raise RuntimeError(
                    "Invalid token response format: missing 'access_token' field"
                )
            
            self._access_token = token_data['access_token']
            expires_in = token_data.get('expires_in', 3600)
            self._token_expiry_time = time.time() + expires_in
            
            logger.debug(f"Successfully fetched OAuth token, expires in {expires_in} seconds")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch OAuth token: {e}")
            raise RuntimeError(f"Failed to fetch OAuth token: {e}")
        except (KeyError, ValueError) as e:
            logger.error(f"Invalid token response format: {e}")
            raise RuntimeError(f"Invalid token response format: {e}")
    
    def extensions(self) -> Dict[str, str]:
        """
        Return optional extensions to be sent with the SASL/OAUTHBEARER request.
        
        Returns:
            dict: Empty dict as no extensions are needed for basic client credentials flow
        """
        return {}
