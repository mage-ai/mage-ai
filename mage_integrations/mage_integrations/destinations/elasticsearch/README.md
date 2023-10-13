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
| ssl_ca_file | path of the the SSL certificate for cert verification  None | Not Required |
| index_schema_fields | this id map allows you to specify specific record values via jsonpath from the stream to be used in index formulation. | None | Not Required |
| metadata_fields | this should be used to pull out specific fields via jsonpath to be used on for ecs metadata patters| None | Not Required |
