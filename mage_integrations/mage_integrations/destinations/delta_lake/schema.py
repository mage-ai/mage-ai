from typing import TYPE_CHECKING, Tuple, Union

import pyarrow as pa

if TYPE_CHECKING:
    import pandas as pd


def delta_arrow_schema_from_pandas(
    data: "pd.DataFrame",
) -> Tuple[pa.Table, pa.Schema]:
    """
    Infers the schema for the delta table from the Pandas DataFrame.
    Necessary because of issues such as:  https://github.com/delta-io/delta-rs/issues/686

    :param data: Data to write.
    :return: A PyArrow Table and the inferred schema for the Delta Table
    """

    table = pa.Table.from_pandas(data)
    schema = table.schema
    schema_out = []
    for field in schema:
        if isinstance(field.type, pa.TimestampType):
            f = pa.field(
                name=field.name,
                type=pa.timestamp("us"),
                nullable=field.nullable,
                metadata=field.metadata,
            )
            schema_out.append(f)
        else:
            schema_out.append(field)
    schema = pa.schema(schema_out, metadata=schema.metadata)
    data = pa.Table.from_pandas(data, schema=schema)
    return data, schema
