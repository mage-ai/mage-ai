def is_pyspark_code(code: str):
    return '\'spark\'' in code or '"spark"' in code
