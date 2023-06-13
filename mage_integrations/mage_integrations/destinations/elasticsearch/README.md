# Elasticsearch

![](https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Elasticsearch_logo.svg/1280px-Elasticsearch_logo.svg.png)

<br/>

## Config

| Key | Description | Default | Required |
| --- | --- | --- | --- | 
| scheme | http scheme used for connecting to elasticsearch | http | True |
| host | host used to connect to elasticsearch | localhost | True |
| port | port use to connect to elasticsearch | 9200 | True |
| username | basic auth username | None | False |
| password | basic auth password | None | False |
| bearer_token | Bearer token for bearer authorization | None | False |
| api_key_id | api key id for auth key authorization | None | False |
| api_key | api key for auth key authorization | None | False |
| ssl_ca_file | path of the the SSL certificate for cert verification  None | False |
| index_format |  handle custom index formatting,  Default options: Daily {{ current_timestamp_daily }}, Monthly {{ current_timestamp_monthly }}, or Yearly {{ current_timestamp_yearly }}. You should use fields specified in index_schema_fields such as {{ _id }} or {{ timestamp }} . There are also helper fuctions such as {{ to_daily(timestamp) }}`. | ecs-{{ stream_name }}-{{ current_timestamp_daily }} | False |
| index_schema_fields | this id map allows you to specify specific record values via jsonpath from the stream to be used in index formulation. | None | False |
| metadata_fields | this should be used to pull out specific fields via jsonpath to be used on for ecs metadata patters| None | False |
