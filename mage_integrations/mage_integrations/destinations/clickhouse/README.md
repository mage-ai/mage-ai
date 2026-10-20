# Clickhouse

![](https://camo.githubusercontent.com/c3b3424df9a33164786f8645a6f474ab58dfc8531fdaf5d897749a9849ec55c9/68747470733a2f2f636c69636b686f7573652e636f6d2f696d616765732f63685f67685f6c6f676f5f726f756e6465642e706e67)

<br />

## Config

You must enter the following credentials when configuring this destination:

| Key | Description | Sample value
| --- | --- | --- |
| `sqlalchemy_url` | SQLAlchemy URL for clickhouse | `clickhouse://default:@localhost/default` |
| `table_name` | Destination table name (Optional). Defaults to stream name| `abc123` |
