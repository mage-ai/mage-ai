# Kafka

![](https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Apache_kafka_wordtype.svg/2560px-Apache_kafka_wordtype.svg.png)

<br/>

This destination works by sending each record with JSON format to the designated bootstrap server.

Also, if a `Key Property` is set within the Source Schema, Kafka Destination will use the
selected column as the `key` parameter within Kafka Producer messages.
 
## Config

| Key | Description | Default | Required |
| --- | --- | --- | --- | 
| bootstrap_server | Apache Kafka host with port. Example: 'kafka:9093' | None | Required |
| topic | Apache Kafka topic name | None | Required |
| api_version | Apache Kafka api version | None | Not Required |
