# Elasticsearch

![](https://static-www.elastic.co/v3/assets/bltefdd0b53724fa2ce/blt280217a63b82a734/6202d3378b1f312528798412/elastic-logo.svg)

<br/>

## Config
By default, table name config is used to set elasticsearch `index` name

| Key | Description | Default | Required |
| --- | --- | --- | --- | 
| scheme | http scheme used for connecting to elasticsearch | http | Required |
| host | host used to connect to elasticsearch | localhost | Required |
| port | port use to connect to elasticsearch | 9200 | Required |
| username | basic auth username | None | Not Required |
| password | basic auth password | None | Not Required |
| bearer_token | Bearer token for bearer authorization | None | Not Required |
| api_key_id | api key id for auth key authorization | None | Not Required |
| api_key | api key for auth key authorization | None | Not Required |
| ssl_ca_file | path of the the SSL certificate for cert verification | None | Not Required |
| index_schema_fields | this id map allows you to specify specific record values via jsonpath from the stream to be used in index formulation. | None | Not Required |
| metadata_fields | this config is used to pull out specific fields from the record to be included in the ES index request. | None | Not Required |
| bulk_kwargs | the arguments of this field will configure the `bulk` operation in the destination. See options below this table | None | Not Required |

`metadata_fields` schema:
```
metadata_fields:
  <stream_name>:
    <field>: <json path to record value>
```

`bulk_kwargs` options. All keys are optional
| Key | Description | Default |
| --- | --- | --- |
| use_parallel | boolean flag to tell the destination to use parallel bulk operations or sequential. Setting this to true can potentially improve performance of the destination | false |
| chunk_size | integer value to set the max number of records that will be inserted into ES in a request | 500 |
| max_chunk_bytes | integer value (in bytes) to set the max size of the `bulk` request. | 104857600 |
| max_retries | (Only when use_parallel is `false`) maximum number of times a document will be retried when `429` response is received  | 0 |
| initial_backoff | (Only when use_parallel is `false`) number of seconds we should wait before the first retry. Any subsequent retries will be powers of `initial_backoff * 2**retry_number` | 2 |
| max_backoff | (Only when use_parallel is `false`) maximum number of seconds a retry will wait | 600 |
| thread_count | (Only when use_parallel is `true`) size of the threadpool to use for the bulk requests | 4 |
| queue_size | (Only when use_parallel is `true`) size of the task queue between the main thread (producing chunks to send) and the processing threads. | 4 |

Example configuration:
```yaml
scheme: http
host: localhost
port: 9200
metadata_fields:
  stream_name:
    _id: my_id  # in each document, the value of the `my_id` field will be set as the `_id` in the index request
bulk_kwargs:
  use_parallel: true
  chunk_size: 500
```
