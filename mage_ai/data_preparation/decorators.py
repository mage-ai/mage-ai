"""Static definition of block decorators.
These decorators definitions are added to avoid python compilation errors.
The actual definitions of the decorators are generated at runtime dynamically in
execute_block method of mage_ai/data_preparation/models/block.py file.
"""


def callback(function):
    return function


def condition(function):
    return function


def custom(function):
    return function


def data_exporter(function):
    return function


def data_loader(function):
    return function


def extension(function):
    return function


def sensor(function):
    return function


def transformer(function):
    return function


def test(function):
    return function


def on_success(function):
    return function


def on_failure(function):
    return function


def data_source(function):
    return function


def xy(function):
    return function


def x(function):
    return function


def y(function):
    return function


def configuration(function):
    return function


def render(function):
    return function


def columns(function):
    return function


def data_integration_destination(function):
    return function


def data_integration_source(function):
    return function


def data_integration_catalog(function):
    return function


def data_integration_config(function):
    return function


def data_integration_selected_streams(function):
    return function


def data_integration_query(function):
    return function


def preprocesser_functions(function):
    return function


def streaming_source(cls):
    return cls


def collect_decorated_objs(decorated_objs):
    """
    Method to collect the decorated objects (function or class)
    """
    def custom_code(obj):
        decorated_objs.append(obj)
        return obj

    return custom_code
