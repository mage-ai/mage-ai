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


def is_disable_pipeline_edit_access(disable_notebook_edit_access_override: int = None):
    value = DISABLE_NOTEBOOK_EDIT_ACCESS
    if disable_notebook_edit_access_override is not None:
        value = disable_notebook_edit_access_override
    return value >= 1


# ------------------------- DISABLE TERMINAL ----------------------

DISABLE_TERMINAL = os.getenv('DISABLE_TERMINAL', '0').lower() in ('true', '1', 't')

# ----------------- Authentication settings ----------------
REQUIRE_USER_AUTHENTICATION = \
    os.getenv('REQUIRE_USER_AUTHENTICATION', 'False').lower() in ('true', '1', 't')
REQUIRE_USER_PERMISSIONS = REQUIRE_USER_AUTHENTICATION and \
    os.getenv('REQUIRE_USER_PERMISSIONS', 'False').lower() in ('true', '1', 't')
AUTHENTICATION_MODE = os.getenv('AUTHENTICATION_MODE', 'LOCAL')
try:
    MAGE_ACCESS_TOKEN_EXPIRY_TIME = int(os.getenv('MAGE_ACCESS_TOKEN_EXPIRY_TIME', '2592000'))
except ValueError:
    MAGE_ACCESS_TOKEN_EXPIRY_TIME = 2592000
LDAP_SERVER = os.getenv('LDAP_SERVER', 'ldaps://127.0.0.1:1636')
LDAP_BIND_DN = os.getenv('LDAP_BIND_DN', 'cd=admin,dc=example,dc=org')
LDAP_BIND_PASSWORD = os.getenv('LDAP_BIND_PASSWORD', 'admin_password')
LDAP_BASE_DN = os.getenv('LDAP_BASE_DN', 'dc=example,dc=org')
LDAP_AUTHENTICATION_FILTER = os.getenv('LDAP_AUTHENTICATION_FILTER',
                                       '(&(|(objectClass=Pers)(objectClass=gro))(cn={username}))')
LDAP_AUTHORIZATION_FILTER = os.getenv('LDAP_AUTHORIZATION_FILTER',
                                      '(&(objectClass=groupOfNames)(cn=group)(member={user_dn}))')
LDAP_ADMIN_USERNAME = os.getenv('LDAP_ADMIN_USERNAME', 'admin')
# values: Viewer, Editor, Admin
LDAP_DEFAULT_ACCESS = os.getenv('LDAP_DEFAULT_ACCESS', None)
LDAP_GROUP_FIELD = os.getenv('LDAP_GROUP_FIELD', 'memberOf')
LDAP_ROLES_MAPPING = os.getenv('LDAP_ROLES_MAPPING', None)

ACTIVE_DIRECTORY_DIRECTORY_ID = os.getenv('ACTIVE_DIRECTORY_DIRECTORY_ID', None)

# ----------------------------------------------------------

HOSTNAME = os.getenv('HOSTNAME')
REDIS_URL = os.getenv('REDIS_URL')
SERVER_VERBOSITY = os.getenv('SERVER_VERBOSITY', 'info') or 'info'

SHELL_COMMAND = os.getenv('SHELL_COMMAND', None)
USE_UNIQUE_TERMINAL = os.getenv('USE_UNIQUE_TERMINAL', None)

# sentry environment variables
SENTRY_DSN = os.getenv('SENTRY_DSN', None)
SENTRY_TRACES_SAMPLE_RATE = os.getenv('SENTRY_TRACES_SAMPLE_RATE', 1.0)

# New relic enable environment variable
ENABLE_NEW_RELIC = os.getenv('ENABLE_NEW_RELIC', False)
NEW_RELIC_CONFIG_PATH = os.getenv('NEW_RELIC_CONFIG_PATH', '')

DEFAULT_LOCALHOST_URL = 'http://localhost:6789'
MAGE_PUBLIC_HOST = os.getenv('MAGE_PUBLIC_HOST') or DEFAULT_LOCALHOST_URL

# All base path variables should not include a leading forward slash
# e.g. MAGE_BASE_PATH = 'test_prefix' -> localhost:6789/test_prefix/pipelines
BASE_PATH = os.getenv('MAGE_BASE_PATH')
# Requests base path is used to configure the base path for the frontend requests. Defaults
# to the MAGE_BASE_PATH environment variable.
REQUESTS_BASE_PATH = os.getenv('MAGE_REQUESTS_BASE_PATH', BASE_PATH)
# Routes base path is used to configure the base path for the backend routes. Defaults
# to the MAGE_BASE_PATH environment variable.
ROUTES_BASE_PATH = os.getenv('MAGE_ROUTES_BASE_PATH', BASE_PATH)

# Sets the trigger interval of the scheduler to a numeric value, in seconds
# Determines how often the scheduler gets invoked
try:
    SCHEDULER_TRIGGER_INTERVAL = float(os.getenv('SCHEDULER_TRIGGER_INTERVAL', '10'))
except ValueError:
    SCHEDULER_TRIGGER_INTERVAL = 10

# List of environment variables used to configure Mage. The value of these settings
# will be copied between workspaces.
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
    'LDAP_DEFAULT_ACCESS',
    'LDAP_GROUP_FIELD',
    'LDAP_ROLES_MAPPING',
    'SERVER_VERBOSITY',
    'SHELL_COMMAND',
    'USE_UNIQUE_TERMINAL',
    'SENTRY_DSN',
    'SENTRY_TRACES_SAMPLE_RATE',
    'MAGE_PUBLIC_HOST',
    'ACTIVE_DIRECTORY_DIRECTORY_ID',
    'SCHEDULER_TRIGGER_INTERVAL'
]
