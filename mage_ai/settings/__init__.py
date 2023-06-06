import os

DEBUG = os.getenv('DEBUG', False)
HIDE_ENV_VAR_VALUES = int(os.getenv('HIDE_ENV_VAR_VALUES', 1) or 1) == 1
QUERY_API_KEY = 'api_key'

"""
import secrets
secrets.token_urlsafe()

Make sure this value is the same in mage_ai/frontend/api/constants.ts
"""
OAUTH2_APPLICATION_CLIENT_ID = 'zkWlN0PkIKSN0C11CfUHUj84OT5XOJ6tDZ6bDRO2'

# valid values: 0, 1, 2
try:
    DISABLE_NOTEBOOK_EDIT_ACCESS = int(os.getenv('DISABLE_NOTEBOOK_EDIT_ACCESS', 0))
except ValueError:
    DISABLE_NOTEBOOK_EDIT_ACCESS = 1 if os.getenv('DISABLE_NOTEBOOK_EDIT_ACCESS') else 0


def is_disable_pipeline_edit_access():
    return DISABLE_NOTEBOOK_EDIT_ACCESS >= 1


REQUIRE_USER_AUTHENTICATION = \
    os.getenv('REQUIRE_USER_AUTHENTICATION', 'False').lower() in ('true', '1', 't')
AUTHENTICATION_MODE = os.getenv('AUTHENTICATION_MODE', 'LOCAL')
LDAP_SERVER = os.getenv('LDAP_SERVER', 'ldaps://127.0.0.1:1636')
LDAP_BIND_DN = os.getenv('LDAP_BIND_DN', 'cd=admin,dc=example,dc=org')
LDAP_BIND_PASSWORD = os.getenv('LDAP_BIND_PASSWORD', 'admin_password')
LDAP_BASE_DN = os.getenv('LDAP_BASE_DN', 'dc=example,dc=org')
LDAP_AUTHENTICATION_FILTER = os.getenv('LDAP_AUTHENTICATION_FILTER',
                                       '(&(|(objectClass=Pers)(objectClass=gro))(cn={username}))')
LDAP_AUTHORIZATION_FILTER = os.getenv('LDAP_AUTHORIZATION_FILTER',
                                      '(&(objectClass=groupOfNames)(cn=group)(member={user_dn}))')
LDAP_ADMIN_USERNAME = os.getenv('LDAP_ADMIN_USERNAME', 'admin')

SERVER_VERBOSITY = os.getenv('SERVER_VERBOSITY', 'info') or 'info'

SHELL_COMMAND = os.getenv('SHELL_COMMAND', None)
USE_UNIQUE_TERMINAL = os.getenv('USE_UNIQUE_TERMINAL', None)

# sentry environment variables
SENTRY_DSN = os.getenv('SENTRY_DSN', None)
SENTRY_TRACES_SAMPLE_RATE = os.getenv('SENTRY_TRACES_SAMPLE_RATE', 1.0)

DEFAULT_LOCALHOST_URL = 'http://localhost:6789'
MAGE_PUBLIC_HOST = os.getenv('MAGE_PUBLIC_HOST') or DEFAULT_LOCALHOST_URL


MAGE_SETTINGS_ENVIRONMENT_VARIABLES = [
    'DISABLE_NOTEBOOK_EDIT_ACCESS',
    'REQUIRE_USER_AUTHENTICATION',
    'AUTHENTICATION_MODE',
    'LDAP_SERVER',
    'LDAP_BIND_DN',
    'LDAP_BIND_PASSWORD',
    'LDAP_BASE_DN',
    'LDAP_AUTHENTICATION_FILTER',
    'LDAP_AUTHORIZATION_FILTER',
    'LDAP_ADMIN_USERNAME',
    'SERVER_VERBOSITY',
    'SHELL_COMMAND',
    'USE_UNIQUE_TERMINAL',
    'SENTRY_DSN',
    'SENTRY_TRACES_SAMPLE_RATE',
    'MAGE_PUBLIC_HOST',
]
