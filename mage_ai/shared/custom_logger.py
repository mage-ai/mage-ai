import inspect
import logging
from enum import Enum

import simplejson

from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.shared.environments import is_deus_ex_machina
from mage_ai.shared.parsers import encode_complex


class Color(str, Enum):
    BLUE = "\x1b[1;34m"
    BOLD_RED = "\x1b[31;1m"
    GREEN = "\x1b[1;32m"
    GREY = "\x1b[38;20m"
    LIGHT_BLUE = "\x1b[1;36m"
    PINK = "\x1b[35m"
    PURPLE = "\x1b[1;35m"
    RED = "\x1b[31;20m"
    RESET = "\x1b[0m"
    YELLOW = "\x1b[33;21m"


BLOCK_TYPE_COLOR_MAPPING = {
    BlockType.CALLBACK: Color.GREEN,
    BlockType.CONDITIONAL: Color.BLUE,
    BlockType.CHART: Color.GREY,
    BlockType.CUSTOM: Color.LIGHT_BLUE,
    BlockType.DATA_EXPORTER: Color.YELLOW,
    BlockType.DATA_LOADER: Color.BLUE,
    BlockType.DBT: Color.RED,
    BlockType.DYNAMIC_CHILD: Color.GREEN,
    BlockType.EXTENSION: Color,
    BlockType.GLOBAL_DATA_PRODUCT: Color.RED,
    BlockType.HOOK: Color.BLUE,
    BlockType.MARKDOWN: Color.GREY,
    BlockType.SCRATCHPAD: Color.GREY,
    BlockType.SENSOR: Color.PINK,
    BlockType.TRANSFORMER: Color.PURPLE,
}

COLORS = [c for c in Color]


def targets():
    return [
        # 'get_outputs',
        # 'get_callers',
        # 'get_variable',
        # 'get_variables_by_block',
        # 'fetch_input_variables',
        # 'output_variables',
        # 'uuid_for_output_variables',
        # 'dynamic_block_values_and_metadata',
        # 'store_variables',
        # 'dynamic',
        # 'nothing',
    ]


class ColorPrinter:
    def __init__(self):
        self.label = None

    def debug(self, *args, **kwargs):
        self.print(color=Color.PURPLE, *args, **kwargs)

    def info(self, *args, **kwargs):
        self.print(color=Color.BLUE, *args, **kwargs)

    def warning(self, *args, **kwargs):
        self.print(color=Color.GREEN, *args, **kwargs)

    def error(self, *args, **kwargs):
        self.print(color=Color.RED, *args, **kwargs)

    def critical(self, *args, **kwargs):
        self.print(color=Color.BOLD_RED, *args, **kwargs)

    def print(self, *args, **kwargs):
        if not is_deus_ex_machina():
            return

        __uuid = kwargs.pop('__uuid', None)
        targs = targets()
        if targs and __uuid not in targs:
            return

        color = kwargs.pop('color', None)
        block = kwargs.pop('block', None)

        more = None
        if kwargs:
            more = simplejson.dumps(
                kwargs,
                default=encode_complex,
                ignore_nan=True,
                indent=2,
                sort_keys=True,
            )
            more = '\n'.join([f'\t\t{line}' for line in more.split('\n')])

        output = ''.join(args)
        if more:
            output = f'{output}\n{more}'

        label = __uuid or self.label
        if label:
            output = f'[{label}] {output}'

        if not color:
            color = COLORS[len(output) % len(COLORS)]

        block_color = None
        if block:
            block_color = BLOCK_TYPE_COLOR_MAPPING.get(block.type) or color

        print(f'{color}{"_" * 100}{color}')
        print('\n')

        if block:
            print(f'{block_color}{"-" * 30}{block_color}')
            print(f'{block_color}[Block] {block.uuid}{block_color}')
            print(f'{block_color}\t\t Type    : {block.type}{block_color}')
            print(f'{block_color}\t\t Language: {block.type}{block_color}')
            print(f'{block_color}{"-" * 15}{block_color}')

        print(f'{color}{output}{color}')

        print('\n')
        print(f'{color}{"_" * 100}{color}')

    def get_callers(self):
        curframe = inspect.currentframe()
        calframe = inspect.getouterframes(curframe, 2)

        function_name = calframe[1][3]
        callers = []
        for frame_info in calframe[2:]:
            caller = frame_info[3]
            if caller.startswith('<cell'):
                break
            else:
                callers.append(caller)

        self.debug(
            function_name,
            callers=callers,
            __uuid='get_callers'
        )


class CustomFormatter(logging.Formatter):
    # https://stackoverflow.com/a/56944256/1084284
    format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s (%(filename)s:%(lineno)d)"

    FORMATS = {
        logging.CRITICAL: Color.BOLD_RED + format + Color.RESET,
        logging.DEBUG: Color.PURPLE + format + Color.RESET,
        logging.ERROR: Color.RED + format + Color.RESET,
        logging.INFO: Color.BLUE + format + Color.RESET,
        logging.NOTSET: Color.GREY + format + Color.RESET,
        logging.WARNING: Color.GREEN + format + Color.RESET,
    }

    def format(self, record):
        log_fmt = self.FORMATS.get(record.levelno)
        formatter = logging.Formatter(log_fmt)
        return formatter.format(record)

    def debug(self, p: int = 0, *args, **kwargs):
        if is_deus_ex_machina():
            if p:
                self.print(color=Color.PURPLE, *args, **kwargs)
            else:
                super().debug(*args, **kwargs)

    def info(self, p: int = 0, *args, **kwargs):
        if is_deus_ex_machina():
            if p:
                self.print(color=Color.BLUE, *args, **kwargs)
            else:
                super().info(*args, **kwargs)

    def warning(self, p: int = 0, *args, **kwargs):
        if is_deus_ex_machina():
            if p:
                self.print(color=Color.YELLOW, *args, **kwargs)
            else:
                super().warning(*args, **kwargs)

    def error(self, p: int = 0, *args, **kwargs):
        if is_deus_ex_machina():
            if p:
                self.print(color=Color.RED, *args, **kwargs)
            else:
                super().error(*args, **kwargs)

    def critical(self, p: int = 0, *args, **kwargs):
        if is_deus_ex_machina():
            if p:
                self.print(color=Color.BOLD_RED, *args, **kwargs)
            else:
                super().critical(*args, **kwargs)

    def print(self, color: Color, *args, **kwargs):
        more = None
        if kwargs:
            more = simplejson.dumps(
                kwargs,
                default=encode_complex,
                ignore_nan=True,
                indent=2,
                sort_keys=True,
            )
            more = '\n'.join([f'\t\t{line}' for line in more.split('\n')])

        output = ''.join(args)
        if more:
            output = f'{output}\n{more}'

        print(f'{color}{output}{color}')


# create logger with 'spam_application'
DX_LOGGER = logging.getLogger('deus_ex_machina')
DX_LOGGER.setLevel(logging.DEBUG)

# create console handler with a higher log level
ch = logging.StreamHandler()
ch.setLevel(logging.DEBUG)

ch.setFormatter(CustomFormatter())

DX_LOGGER.addHandler(ch)

DX_PRINTER = ColorPrinter()
