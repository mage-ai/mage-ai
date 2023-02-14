"""Static definition of block decorators.
These decorators definitions are added to avoid python compilation errors.
The actual definitions of the decorators are generated at runtime dynamically in
execute_block method of mage_ai/data_preparation/models/block.py file.
"""


def custom(function):
    return function


def data_exporter(function):
    return function


def data_loader(function):
    return function


def sensor(function):
    return function


def transformer(function):
    return function


def test(function):
    return function
