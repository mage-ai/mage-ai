import os

SERVER_HOST = os.getenv('HOST', 'localhost')
SERVER_PORT = os.getenv('PORT', 5789)

DATA_PREP_SERVER_PORT = os.getenv('DATA_PREP_SERVER_PORT', 6789)

DATAFRAME_OUTPUT_SAMPLE_COUNT = 10

# The last line of this file must be the version number.
# Dockerfile depends on it because it runs ./scripts/install_mage.sh and uses
# the last line to determine the version to install.
VERSION = \
'0.7.74'
