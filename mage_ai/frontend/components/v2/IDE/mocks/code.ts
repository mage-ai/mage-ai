let code = `def test(a=1, b: Optional[bool] = None) -> int:
    # Test this
    return 1

`;

code = `import a
[1, 2, 3]
(1, 2, 3)
variable = 'string'
{
  "a": True,
  'b': False,
  CONSTANT: None,
  variable: 1.0,
  2: 3,
}

import a.b
import a.b.c
import a.b.c.d
import a as b
import a.b as c
import a.b.c as d
import a.b.c.d as e

from a import b
from a.b import c
from a.b.c import d
from a.b.c.d import e
from a import b as c
from a.b import c as d
from a.b.c import d as e
from a.b.c.d import e as f
from a import b.c as d
from a.b import c.d as e
from a.b.c import d.e as f
from a.b.c.d import e.f as g

from a import b, c
from a import b as c, d
from a import b, c as d
from a import b as c, d as e

from typing import Any, Optional

[bool, dict, float, int, str, list, set, tuple]
'boolean'
'dictionary'
'floater'
'integer'
'string'
'list'
'set'
'tuple'

from mage_ai.data_preparation.repo_manager import (
    ProjectType,
    get_cluster_type,
    get_project_type,
    get_project_uuid,
    init_project_uuid,
    asinit_repoin,
    inupdate_settings_on_metadata_changeas,
)
from a.b.c import SAMPLE_SIZE, intestas, Test, TestEnum as TestEnumAgain, aswesomethinin
re.compile(r'\\d+')
re.compile(/(\/)([^\/\\]*(?:\\.[^\/\\]*)*)(\/[asdasfsdgiSASDASD000msuy]*)/)

regex0 = [
    /(from)(\s+)([\w\.]+)(\s+)(import)(\s*\(?)/,
    ['keyword', 'white', 'namespace', 'white', 'keyword', 'brackets.round'],
    '@multiLineImport',
]

regex1 = [
    /(import)(\s+)([\w\.,\s]+)/,
    ['keyword', 'white', 'type'],
]

"www.mage.ai"
"https://mage.ai"
"mage.ai"
"mage.ai:8080"
"mage.ai:8080/api/v1"
"mage.ai:8080/api/v1/endpoint"

path_win = 'C:\\Users\\user\\file.txt'
path_mac = '/Users/dangerous/Code/materia/mage-ai/mage_ai/frontend/mana'

'{} cool'.format('You are')
f"{path_mac}"
'{name} cool {number}'.format('Urza', 40)


from mage_ai.shared.enum import StrEnum


class ExecutionStatus(StrEnum):
    CANCELLED = 'cancelled'
    ERROR = 'error'
    FAILURE = 'failure'
    READY = 'ready'
    RUNNING = 'running'
    SUCCESS = 'success'


class Test(Base):
    pass


class Test(str):
    pass


class Test(Base, str):
    pass


# right now, we are writing the models to local files to reduce dependencies
class Test:
    def __init__(self, id: int = None, df=None, name=None, api_key=None):
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
    elif:
      pass
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

def test(a=1, b: Optional[bool] = None) -> int:
    return 1 + 1

def test(a=1, b: Optional[Any] = None) -> int:
    return 1 + 1
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
export default code;
