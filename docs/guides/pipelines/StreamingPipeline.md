#  Streaming pipeline

Build pipelines that ingest data from event streaming sources like Kafka.

<img
  alt="Streaming pipeline"
  src="https://c.tenor.com/sezVCSw-n7sAAAAC/waterfall-stream.gif"
/>

1. [Set up Kafka](#set-up-kafka)
1. [Build streaming pipeline](#build-streaming-pipeline)
1. [Test pipeline](#test-pipeline)
1. [Run in production](#run-in-production)

<br />

## Set up Kafka

If you don’t have Kafka already setup, here is a quick guide on how to run and use Kafka locally:

### Using Kafka locally

1. In your terminal, clone this repository: `git clone https://github.com/wurstmeister/kafka-docker.git`.
1. Change directory into that repository: `cd kafka-docker`.
1. Edit the `docker-compose.yml` file to match this:
    ```yaml
    version: '2'
    services:
      zookeeper:
        image: wurstmeister/zookeeper:3.4.6
        ports:
         - "2181:2181"
      kafka:
        build: .
        ports:
         - "9092:9092"
        expose:
         - "9093"
        environment:
          KAFKA_ADVERTISED_LISTENERS: INSIDE://kafka:9093,OUTSIDE://localhost:9092
          KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INSIDE:PLAINTEXT,OUTSIDE:PLAINTEXT
          KAFKA_LISTENERS: INSIDE://0.0.0.0:9093,OUTSIDE://0.0.0.0:9092
          KAFKA_INTER_BROKER_LISTENER_NAME: INSIDE
          KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
        volumes:
         - /var/run/docker.sock:/var/run/docker.sock
    ```
1. Start Docker: `docker-compose up`
1. Start a terminal session in the running container:
    ```bash
    docker exec -i -t -u root $(docker ps | grep docker_kafka | cut -d' ' -f1) /bin/bash
    ```
1. Create a topic:
    ```bash
    $KAFKA_HOME/bin/kafka-topics.sh --create --partitions 4 --bootstrap-server kafka:9092 --topic test
    ```
1. List all available topics in Kafka instance:
    ```bash
    $KAFKA_HOME/bin/kafka-topics.sh --bootstrap-server kafka:9092 --list
    ```
1. Start a producer on topic named `test`:
    ```bash
    $KAFKA_HOME/bin/kafka-console-producer.sh --broker-list kafka:9092 --topic=test
    ```
1. Send messages to the topic named `test` by typing the following in the terminal:
    ```bash
    >hello
    >this is a test
    >test 1
    >test 2
    >test 3
    ```
1. Open another terminal and start a consumer on the topic named `test`:
    ```bash
    $KAFKA_HOME/bin/kafka-console-consumer.sh --from-beginning --bootstrap-server kafka:9092 --topic=test
    ```
1. The output should look something like this:
    ```bash
    hello
    test 1
    test 3
    this is a test
    test 2
    ```

<sub>Original [source](https://towardsdatascience.com/introduction-to-kafka-stream-processing-in-python-e30d34bf3a12)
of instructions.</sub>

<br />

## Build streaming pipeline

### Start Mage

#### Using Kafka locally in a Docker container

Start Mage using Docker. Run the following command to run Docker in network mode:

```bash
docker run -it -p 6789:6789 -v $(pwd):/home/src \
  --env AWS_ACCESS_KEY_ID=your_access_key_id \
  --env AWS_SECRET_ACCESS_KEY=your_secret_access_key \
  --env AWS_REGION=your_region \
  --network kafka-docker_default \
  mageai/mageai mage start default_repo
```

> NOTE: different cloud providers
>
> Change the environment variables argument depending on your cloud provider.

If the network named `kafka-docker_default` doesn’t exist, create a new network:

```bash
docker network create -d bridge kafka-docker_default
```

Check that it exists:

```bash
docker network ls
```

<br />

If you can’t connect to Kafka locally in a Docker container using Mage in a Docker container,
do the following:

1. Clone Mage: `git clone https://github.com/mage-ai/mage-ai.git`.
1. Change directory into Mage: `cd mage-ai`.
1. Run the following script in your terminal: `./scripts/dev.sh`.

This will run Mage in development mode; which runs it in a Docker container using `docker compose`
instead of `docker run`.

#### Using Kafka without a Docker container

Start Mage using Docker. If you haven’t done this before,
refer to the [setup guide](../../tutorials/quick_start/setup.md).

### Create a new pipeline

1. Open Mage in your browser.
1. Click <b>`+ New pipeline`</b>, then select `Streaming`.
1. Add a data loader block, select `Kafka`, and paste the following:
    ```yaml
    connector_type: kafka
    bootstrap_server: "localhost:9092"
    topic: test
    consumer_group: unique_consumer_group
    ```
    1. By default, the `bootstrap_server` is set to `localhost:9092`.
    If you’re running Mage in a container, the `bootstrap_server` should be `kafka:9093`.
1. Add a transformer block and paste the following:
    ```python
    from typing import Dict, List

    if 'transformer' not in globals():
        from mage_ai.data_preparation.decorators import transformer


    @transformer
    def transform(messages: List[Dict], *args, **kwargs):
        for msg in messages:
            print(msg)

        return messages
    ```
1. Add a data exporter block, select `OpenSearch` and paste the following:
    ```yaml
    connector_type: opensearch
    host: https://search-something-abcdefg123456.us-west-1.es.amazonaws.com/
    index_name: python-test-index
    ```
    1. Change the `host` to match your OpenSearch domain’s endpoint.
    1. Change the `index_name` to match the index you want to export data into.

<br />

## Test pipeline

Open the streaming pipeline you just created, and in the right side panel near the bottom,
click the button <b>`Execute pipeline`</b> to test the pipeline.

You should see an output like this:

```
[streaming_pipeline_test] Start initializing kafka consumer.
[streaming_pipeline_test] Finish initializing kafka consumer.
[streaming_pipeline_test] Start consuming messages from kafka.
```

### Publish messages using Python

1. Open a terminal on your local workstation.
1. Install `kafka-python`:
    ```bash
    pip install kafka-python
    ```
1. Open a Python shell and write the following code to publish messages:
    ```python
    from kafka import KafkaProducer
    from random import random
    import json


    topic = 'test'
    producer = KafkaProducer(
        bootstrap_servers='localhost:9092',
    )


    def publish_messages(limit):
        for i in range(limit):
            data = {
                'title': 'test_title',
                'director': 'Bennett Miller',
                'year': '2011',
                'rating': random(),
            }
            producer.send(topic, json.dumps(data).encode('utf-8'))

    publish_messages(5)
    ```

Once you run the code snippet above, go back to your streaming pipeline in Mage and
the output should look like this:

```
[streaming_pipeline_test] Start initializing kafka consumer.
[streaming_pipeline_test] Finish initializing kafka consumer.
[streaming_pipeline_test] Start consuming messages from kafka.
[streaming_pipeline_test] [Kafka] Receive message 2:16: v=b'{"title": "test_title", "director": "Bennett Miller", "year": "2011", "rating": 0.7010424523477785}', time=1665618592.226788
[streaming_pipeline_test] [Kafka] Receive message 0:16: v=b'{"title": "test_title", "director": "Bennett Miller", "year": "2011", "rating": 0.7886308380991354}', time=1665618592.2268753
[streaming_pipeline_test] [Kafka] Receive message 0:17: v=b'{"title": "test_title", "director": "Bennett Miller", "year": "2011", "rating": 0.0673276352704153}', time=1665618592.2268832
[streaming_pipeline_test] [Kafka] Receive message 3:10: v=b'{"title": "test_title", "director": "Bennett Miller", "year": "2011", "rating": 0.37935417366095525}', time=1665618592.2268872
[streaming_pipeline_test] [Kafka] Receive message 3:11: v=b'{"title": "test_title", "director": "Bennett Miller", "year": "2011", "rating": 0.21110511524126563}', time=1665618592.2268918
[streaming_pipeline_test] {'title': 'test_title', 'director': 'Bennett Miller', 'year': '2011', 'rating': 0.7010424523477785}
[streaming_pipeline_test] {'title': 'test_title', 'director': 'Bennett Miller', 'year': '2011', 'rating': 0.7886308380991354}
[streaming_pipeline_test] {'title': 'test_title', 'director': 'Bennett Miller', 'year': '2011', 'rating': 0.0673276352704153}
[streaming_pipeline_test] {'title': 'test_title', 'director': 'Bennett Miller', 'year': '2011', 'rating': 0.37935417366095525}
[streaming_pipeline_test] {'title': 'test_title', 'director': 'Bennett Miller', 'year': '2011', 'rating': 0.21110511524126563}
[streaming_pipeline_test] [Opensearch] Batch ingest data [{'title': 'test_title', 'director': 'Bennett Miller', 'year': '2011', 'rating': 0.7010424523477785}, {'title': 'test_title', 'director': 'Bennett Miller', 'year': '2011', 'rating': 0.7886308380991354}, {'title': 'test_title', 'director': 'Bennett Miller', 'year': '2011', 'rating': 0.0673276352704153}, {'title': 'test_title', 'director': 'Bennett Miller', 'year': '2011', 'rating': 0.37935417366095525}, {'title': 'test_title', 'director': 'Bennett Miller', 'year': '2011', 'rating': 0.21110511524126563}], time=1665618592.2294626
```

### Consume messages using Python

If you want to programmatically consume messages from a Kafka topic, here is a code snippet:

```python
from kafka import KafkaConsumer
import time


topic = 'test'
consumer = KafkaConsumer(
    topic,
    group_id='test',
    bootstrap_servers='localhost:9092',
)

for message in consumer:
    print(f"{message.partition}:{message.offset}: v={message.value}, time={time.time()}")
```

<br />

## Run in production

1. [Create a trigger](../../features/orchestration/README.md#create-trigger).
1. Once trigger is created, click the <b>`Start trigger`</b> button at the top of the page to make
the streaming pipeline active.

<br />
