COLUMN_NAME_QUOTE_CHARS = '+=-*&^%$! ?~|<>(){}[],.'


def wrap_column_name(name: str) -> str:
    if any(symbol in name for symbol in COLUMN_NAME_QUOTE_CHARS):
        name = f'"{name}"'
    return name
