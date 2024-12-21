"""
If you add a new environment variable, make sure to check if it should be added to
the `MAGE_SETTINGS_ENVIRONMENT_VARIABLES` list at the bottom of this file. Also, update
the environment variable documentation at docs/development/variables/environment-variables.mdx
"""

import os

from .secret_generation import generate_jwt_secret


def get_bool_value(value: str) -> bool:
    """
    Helper method to get the boolean value from a string.

    Converts a string environment variable to a bool value. Returns True if the value
    is 'true', '1', or 't' (case insensitive). Otherwise, False
    """
    if value is None:
        return False

    return value.lower() in ('true', '1', 't')


def get_int_value(value: str) -> int:
    if not value:
        return None
    try:
        int_value = int(value)
    except Exception:
        int_value = None
    return int_value


# ----------------------------------
# Debugging and Environment Settings
# ----------------------------------

DEBUG = os.getenv('DEBUG', False)
DEBUG_MEMORY = str(os.getenv('DEBUG_MEMORY', 0) or 0) in ['1', 'true', 'True']
DEBUG_FILE_IO = str(os.getenv('DEBUG_FILE_IO', 0) or 0) in ['1', 'true', 'True']
HIDE_ENV_VAR_VALUES = int(os.getenv('HIDE_ENV_VAR_VALUES', 1) or 1) == 1


# -------------------------
# Server Authentication and Token Settings
# -------------------------

"""
import secrets
secrets.token_urlsafe()

Make sure this value is the same in mage_ai/frontend/api/constants.ts
"""
OAUTH2_APPLICATION_CLIENT_ID = 'zkWlN0PkIKSN0C11CfUHUj84OT5XOJ6tDZ6bDRO2'

QUERY_API_KEY = 'api_key'

# Used for OAUTH
JWT_SECRET = os.getenv('JWT_SECRET', 'materia')
# Used for generating download tokens
JWT_DOWNLOAD_SECRET = os.getenv('JWT_DOWNLOAD_SECRET', generate_jwt_secret())


# -------------------------
# Notebook and Terminal Edit Access
# -------------------------

# valid values: 0, 1, 2
try:
    DISABLE_NOTEBOOK_EDIT_ACCESS = int(os.getenv('DISABLE_NOTEBOOK_EDIT_ACCESS', 0))
except ValueError:
    DISABLE_NOTEBOOK_EDIT_ACCESS = 1 if os.getenv('DISABLE_NOTEBOOK_EDIT_ACCESS') else 0


DISABLE_TERMINAL = get_bool_value(os.getenv('DISABLE_TERMINAL', '0').lower())


def is_disable_pipeline_edit_access(
    disable_notebook_edit_access_override: int = None,
) -> bool:
    value = DISABLE_NOTEBOOK_EDIT_ACCESS
    if disable_notebook_edit_access_override is not None:
        value = disable_notebook_edit_access_override
    return value >= 1


# Limit the image preview size to 5MBs by default. If a block returns an XBoost model
# (e.g.) xgboost.Booster() instance, the preview in the UI is a tree plot of the model.
# The image can be very large in byte size, so we limit the size to prevent the UI from freezing.
MAX_OUTPUT_IMAGE_PREVIEW_SIZE = int(os.getenv('MAX_OUTPUT_IMAGE_PREVIEW_SIZE', 1024 * 1024 * 5))

# -------------------
# User Authentication Settings
# -------------------

REQUIRE_USER_AUTHENTICATION = get_bool_value(os.getenv('REQUIRE_USER_AUTHENTICATION', 'False'))
REQUIRE_USER_PERMISSIONS = REQUIRE_USER_AUTHENTICATION and get_bool_value(
    os.getenv('REQUIRE_USER_PERMISSIONS', 'False')
)
AUTHENTICATION_MODE = os.getenv('AUTHENTICATION_MODE', 'LOCAL')
try:
    MAGE_ACCESS_TOKEN_EXPIRY_TIME = int(os.getenv('MAGE_ACCESS_TOKEN_EXPIRY_TIME', '2592000'))
except ValueError:
    MAGE_ACCESS_TOKEN_EXPIRY_TIME = 2592000

# Default access level to give to users created when authenticated through OAuth
# for the first time. value should be the name of a Mage role (e.g. Viewer, Editor, Admin)
OAUTH_DEFAULT_ACCESS = os.getenv('OAUTH_DEFAULT_ACCESS')

DEFAULT_OWNER_EMAIL = os.getenv('DEFAULT_OWNER_EMAIL') or 'admin@admin.com'
DEFAULT_OWNER_PASSWORD = os.getenv('DEFAULT_OWNER_PASSWORD') or 'admin'
DEFAULT_OWNER_USERNAME = os.getenv('DEFAULT_OWNER_USERNAME') or 'admin'

# ---------------------
# General Server Settings
# ---------------------
CONCURRENCY_CONFIG_BLOCK_RUN_LIMIT = get_int_value(os.getenv('CONCURRENCY_CONFIG_BLOCK_RUN_LIMIT'))
CONCURRENCY_CONFIG_PIPELINE_RUN_LIMIT = get_int_value(
    os.getenv('CONCURRENCY_CONFIG_PIPELINE_RUN_LIMIT')
)
DISABLE_AUTO_BROWSER_OPEN = get_bool_value(os.getenv('DISABLE_AUTO_BROWSER_OPEN', 'False'))
DISABLE_AUTORELOAD = get_bool_value(os.getenv('DISABLE_AUTORELOAD', 'False'))
HIDE_API_TRIGGER_TOKEN = get_bool_value(os.getenv('HIDE_API_TRIGGER_TOKEN', 'False'))

# The hostname in Kubernetes or AWS ECS
HOSTNAME = os.getenv('HOSTNAME')
INITIAL_METADATA = os.getenv('INITIAL_METADATA')
LOGS_DIR_PATH = os.getenv('LOGS_DIR_PATH')
MAGE_CLUSTER_UUID = os.getenv('MAGE_CLUSTER_UUID') or 'mage'
MAX_FILE_CACHE_SIZE = os.getenv('MAX_FILE_CACHE_SIZE') or (1024 * 1024)  # 1 MB
ENABLE_USER_PROJECTS = get_bool_value(os.getenv('ENABLE_USER_PROJECTS'))
REDIS_URL = os.getenv('REDIS_URL')
SERVER_VERBOSITY = os.getenv('SERVER_VERBOSITY', 'info') or 'info'
SERVER_LOGGING_FORMAT = os.getenv('SERVER_LOGGING_FORMAT', 'plaintext')
SERVER_LOGGING_TEMPLATE = os.getenv(
    'SERVER_LOGGING_TEMPLATE',
    '%(levelname)s:%(name)s:%(message)s',
)


# --------------------
# Shell Settings
# --------------------

SHELL_COMMAND = os.getenv('SHELL_COMMAND', None)
USE_UNIQUE_TERMINAL = os.getenv('USE_UNIQUE_TERMINAL', None)


# -------------------------
# Monitoring and Tracing Configuration
# -------------------------

# Sentry Configuration
SENTRY_DSN = os.getenv('SENTRY_DSN')
SENTRY_TRACES_SAMPLE_RATE = os.getenv('SENTRY_TRACES_SAMPLE_RATE', 1.0)

# New Relic Configuration
ENABLE_NEW_RELIC = os.getenv('ENABLE_NEW_RELIC', False)
NEW_RELIC_CONFIG_PATH = os.getenv('NEW_RELIC_CONFIG_PATH', '')

# Prometheus Configuration
# If enabled, the /metrics route will expose Tornado server metrics
ENABLE_PROMETHEUS = get_bool_value(os.getenv('ENABLE_PROMETHEUS', 'False'))

# API switch configuration
# If disabled, those AI APIs will not be used in backend.
ENABLE_OPEN_AI = get_bool_value(os.getenv('ENABLE_OPEN_AI') or 'True')
ENABLE_HUGGING_FACE = get_bool_value(os.getenv('ENABLE_HUGGING_FACE') or 'True')

# OpenTelemetry Configuration
OTEL_EXPORTER_OTLP_ENDPOINT = os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT', None)
OTEL_EXPORTER_OTLP_HTTP_ENDPOINT = os.getenv('OTEL_EXPORTER_HTTP_OTLP_ENDPOINT', None)
OTEL_PYTHON_TORNADO_EXCLUDED_URLS = (
    os.getenv('OTEL_PYTHON_TORNADO_EXCLUDED_URLS') or '/api/statuses'
)

SYSTEM_LOGS_PARTITIONS = [
    str(partition).strip() for partition in os.getenv('SYSTEM_LOGS_PARTITIONS', 'ds').split(',')
]
SYSTEM_LOGS_POLL_INTERVAL = float(os.getenv('SYSTEM_LOGS_POLL_INTERVAL', 0.1))

# -----------------------------
# Mage URL and PATH Settings
# -----------------------------

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


# -------------------------
# Scheduler Settings
# -------------------------

# Sets the trigger interval of the scheduler to a numeric value, in seconds
# Determines how often the scheduler gets invoked
try:
    SCHEDULER_TRIGGER_INTERVAL = float(os.getenv('SCHEDULER_TRIGGER_INTERVAL', '10'))
except ValueError:
    SCHEDULER_TRIGGER_INTERVAL = 10

# -------------------------
# Data processing
# -------------------------

# We need to use os.getenv again or else we can’t mock/patch the value in tests.
DYNAMIC_BLOCKS_VERSION = int(os.getenv('DYNAMIC_BLOCKS_VERSION') or 1)
DYNAMIC_BLOCKS_V2 = int(os.getenv('DYNAMIC_BLOCKS_VERSION') or 1) >= 2
MEMORY_MANAGER_VERSION = int(os.getenv('MEMORY_MANAGER_VERSION') or 1)
MEMORY_MANAGER_V2 = int(os.getenv('MEMORY_MANAGER_VERSION') or 1) >= 2
MEMORY_MANAGER_PANDAS_VERSION = int(os.getenv('MEMORY_MANAGER_PANDAS_VERSION') or 1)
MEMORY_MANAGER_POLARS_VERSION = int(os.getenv('MEMORY_MANAGER_POLARS_VERSION') or 1)
MEMORY_MANAGER_PANDAS_V2 = int(os.getenv('MEMORY_MANAGER_PANDAS_VERSION') or 1) >= 2
MEMORY_MANAGER_POLARS_V2 = int(os.getenv('MEMORY_MANAGER_POLARS_VERSION') or 1) >= 2
VARIABLE_DATA_OUTPUT_META_CACHE = str(os.getenv('VARIABLE_DATA_OUTPUT_META_CACHE', 0) or 0) in [
    '1',
    'true',
    'True',
]

# -------------------------
# IDE settings
# -------------------------

KERNEL_MANAGER = os.getenv('KERNEL_MANAGER', 'default')
KERNEL_MAGIC = os.getenv('KERNEL_MANAGER', 'default') == 'magic'

# -------------------------
# System level features
# -------------------------

# List of environment variables used to configure Mage. The value of these settings
# will be copied between workspaces.
MAGE_SETTINGS_ENVIRONMENT_VARIABLES = [
    'CONCURRENCY_CONFIG_BLOCK_RUN_LIMIT',
    'CONCURRENCY_CONFIG_PIPELINE_RUN_LIMIT',
    'DISABLE_NOTEBOOK_EDIT_ACCESS',
    'DISABLE_AUTO_BROWSER_OPEN',
    'DISABLE_AUTORELOAD',
    'REQUIRE_USER_AUTHENTICATION',
    'AUTHENTICATION_MODE',
    'OAUTH_DEFAULT_ACCESS',
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
    'SERVER_LOGGING_FORMAT',
    'SHELL_COMMAND',
    'USE_UNIQUE_TERMINAL',
    'SENTRY_DSN',
    'SENTRY_TRACES_SAMPLE_RATE',
    'MAGE_PUBLIC_HOST',
    'SCHEDULER_TRIGGER_INTERVAL',
    'REQUIRE_USER_PERMISSIONS',
    'ENABLE_PROMETHEUS',
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    'OTEL_EXPORTER_OTLP_HTTP_ENDPOINT',
    'MAX_FILE_CACHE_SIZE',
    'REDIS_URL',
    # Oauth variables
    'ACTIVE_DIRECTORY_DIRECTORY_ID',
    'ACTIVE_DIRECTORY_CLIENT_ID',
    'ACTIVE_DIRECTORY_CLIENT_SECRET',
    'ACTIVE_DIRECTORY_ROLES_MAPPING',
    'OKTA_DOMAIN_URL',
    'OKTA_CLIENT_ID',
    'OKTA_CLIENT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'OIDC_CLIENT_ID',
    'OIDC_CLIENT_SECRET',
    'OIDC_DISCOVERY_URL',
    'OIDC_ROLES_MAPPING',
    'GHE_CLIENT_ID',
    'GHE_CLIENT_SECRET',
    'GHE_HOSTNAME',
    'BITBUCKET_HOST',
    'BITBUCKET_OAUTH_KEY',
    'BITBUCKET_OAUTH_SECRET',
    'GITLAB_HOST',
    'GITLAB_CLIENT_ID',
    'GITLAB_CLIENT_SECRET',
    'SERVER_LOGGING_TEMPLATE',
    'MAX_OUTPUT_IMAGE_PREVIEW_SIZE',
]
