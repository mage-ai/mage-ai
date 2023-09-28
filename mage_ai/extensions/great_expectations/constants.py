EXTENSION_DESCRIPTION = 'Create data quality checks for your data products.'
EXTENSION_NAME = 'Great Expectations'
EXTENSION_UUID = 'great_expectations'

EXTENSION_TEMPLATES = [
    dict(
        description='Base template with no additional code.',
        name='Empty template',
        path='extensions/great_expectations/default.jinja',
        uuid='default',
    ),
]
