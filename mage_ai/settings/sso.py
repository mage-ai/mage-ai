import os

# Environment variable settings used to set up authentication for single
# sign on.

# Okta settings

OKTA_DOMAIN_URL = os.getenv('OKTA_DOMAIN_URL')
OKTA_CLIENT_ID = os.getenv('OKTA_CLIENT_ID')
OKTA_CLIENT_SECRET = os.getenv('OKTA_CLIENT_SECRET')

# Google settings

GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

# Active directory settings

ACTIVE_DIRECTORY_CLIENT_ID = os.getenv('ACTIVE_DIRECTORY_CLIENT_ID')
ACTIVE_DIRECTORY_CLIENT_SECRET = os.getenv('ACTIVE_DIRECTORY_CLIENT_SECRET')
