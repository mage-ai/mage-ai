# import numpy as np
# import pandas as pd
# import pyarrow as pa
# import pyarrow.parquet


# def read_table(filename: str) -> 'DataFrame':
#     table_read = pyarrow.parquet.read_table(filename)
#     return table_read.to_pandas()


# def write_table(df: 'DataFrame', filename: str):
#     df_cleaned, schema = build_schema_from_dataframe(df)
#     table_write = pa.Table.from_pandas(df_cleaned, schema=schema, preserve_index=False)
#     pyarrow.parquet.write_table(table_write, filename)


# def arrow_type(item):
#     column_type = pa.string()
#     column_type_df = type(item)

#     if list is column_type_df:
#         if len(item) >= 1:
#             column_type = pa.list_(arrow_type(item[0]))
#         else:
#             column_type = pa.list_(pa.string())
#     elif numpy.issubdtype(column_type_df, bool):
#         column_type = pa.bool_()
#     elif np.issubdtype(column_type_df, int):
#         column_type = pa.int64()
#     elif np.issubdtype(column_type_df, float):
#         column_type = pa.float64()
#     elif dict is column_type_df:
#         column_type = pa.map_(pa.string(), pa.string())
#     elif pd.Timestamp is column_type_df:
#         column_type = pa.timestamp()
#     elif str is column_type_df:
#         column_type = pa.string()

#     return column_type


# def build_schema_from_dataframe(df: 'DataFrame'):
#     df_output = df.copy()

#     number_of_rows = len(df.index)

#     schema_out = []
#     for column_name in df_output.columns:
#         series_non_null = df_output[column_name].dropna()

#         column_type = pa.string()
#         column_type_df = str

#         if len(series_non_null.index) >= 1:
#             item = series_non_null.iloc[0]
#             column_type = arrow_type(item)
#             column_type_df = type(item)

#         # non_null = df_output[column_name].notnull()
#         # try:
#         #     df_output.loc[non_null, [column_name]] = df_output[non_null][column_name].apply(
#         #         lambda x: str(column_type_df(x)),
#         #     )
#         # except Exception:
#         #     pass

#         if df_output[column_name].dropna().count() != number_of_rows:
#             df_output[column_name] = df_output[column_name].fillna('')
#             column_type = pa.string()
#             column_type_df = str

#         # try:
#         #     df_output[column_name] = df_output[column_name].map(column_type_df)
#         # except Exception:
#         #     pass

#         f = pa.field(
#             name=column_name,
#             type=column_type,
#             nullable=True,
#             metadata={},
#         )
#         schema_out.append(f)

#     schema = pa.schema(schema_out, metadata={})

#     return df_output, schema
