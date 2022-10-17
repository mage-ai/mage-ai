from mage_integrations.utils.dictionary import extract
from typing import Dict

SYSTEM_QUERY_END_DATE = '_end_date'
SYSTEM_QUERY_EXECUTION_DATE = '_execution_date'
SYSTEM_QUERY_EXECUTION_PARTITION = '_execution_partition'
SYSTEM_QUERY_START_DATE = '_start_date'


def get_end_date(query: Dict) -> Dict:
    return query.get(SYSTEM_QUERY_END_DATE)


def get_execution_date(query: Dict) -> Dict:
    return query.get(SYSTEM_QUERY_EXECUTION_DATE)


def get_execution_partition(query: Dict) -> Dict:
    return query.get(SYSTEM_QUERY_EXECUTION_PARTITION)


def get_start_date(query: Dict) -> Dict:
    return query.get(SYSTEM_QUERY_START_DATE)
