"""Schema loading."""
# -*- coding: utf-8 -*-
import json
import os

from singer.schema import Schema


def get_abs_path(path: str) -> str:
    """Help function to get the absolute path.

    Arguments:
        path {str} -- Path to directory

    Returns:
        str -- The absolute path
    """
    return os.path.join(
        os.path.dirname(os.path.realpath(__file__)),
        path,
    )


def load_schemas() -> dict:
    """Load schemas from schemas folder.

    Returns:
        dict -- Scemas
    """
    schemas: dict = {}

    # For every file in the schemas directory
    for filename in os.listdir(get_abs_path('schemas')):
        abs_path: str = get_abs_path('schemas')
        file_raw: str = filename.replace('.json', '')

        # Open and load the schema
        with open(f'{abs_path}/{filename}') as schema_file:
            schemas[file_raw] = Schema.from_dict(json.load(schema_file))
    return schemas
