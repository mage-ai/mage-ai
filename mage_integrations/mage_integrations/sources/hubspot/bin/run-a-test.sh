set -exu
TEST_FILE=$1
TEST_CLASS=$2
TEST_NAME=$3
nosetests tap_hubspot/tests/$TEST_FILE:$TEST_CLASS.$TEST_NAME
