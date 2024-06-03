export default `from typing import Any, Optional

from mage_ai.data_preparation.repo_manager import (
    ProjectType,
    get_cluster_type,
    get_project_type,
    get_project_uuid,
    init_project_uuid,
    init_repo,
    update_settings_on_metadata_change,
)
from mage_ai.shared.constants import SAMPLE_SIZE


import re

re.compile(r'\\d+')

# right now, we are writing the models to local files to reduce dependencies
class Test:
    def __init__(self, id=None, df=None, name=None, api_key=None):
        """
        Docs
        \n
        \\{t\\}
        \'cool\'
        """
        self.project_type = get_project_type()
        self._power: int = 1
        self.__fire = 1 if True else None

    @classmethod
    def get_instance(cls) -> 'Test':
        return cls()

    def get_project_type(self):
        return self.project_type + 1

while False:
    if 1 > 2 or 2 < 3 or 3 == 4 or 4 != 5 or 5 >= 6 or 6 <= 7:
      break
    else:
      continue

    return gettr(1, 'a')


test = Test()
test.get_project_type()

if True:
  '''
  Looks good?
  '''
    print('Hello, world!')


def test(a=1, b: Optional[Any] = None) -> int:
    return 1 + 1


from enum import Enum


class ExecutionStatus(str, Enum):
    CANCELLED = 'cancelled'
    ERROR = 'error'
    FAILURE = 'failure'
    READY = 'ready'
    RUNNING = 'running'
    SUCCESS = 'success'

{
    "key": "value",
    ExecutionStatus.CANCELLED: "cancelled",
}


# JSON-like strings

valid_string = "This is a properly closed string."
valid_single_string = 'This is another properly closed string.'
multiline_string = """This is a
properly closed
multiline string."""
single_line_triple_double = """This is a properly closed single-line triple-quoted string."""
single_line_triple_single = '''This is a properly closed single-line triple-quoted string.'''
json_example = {
    "key": "value",
    ExecutionStatus.CANCELLED: "cancelled",
}


## Invalid Strings (without closing quotes):

invalid_string = "is this invalid?
1 + 1 == 2
invalid_single_string = 'I think so
invalid_triple_double = """This is an unclosed triple-quoted string
invalid_triple_single = '''This is an unclosed single-quoted string
`;
