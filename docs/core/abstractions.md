# 🛸 Core abstractions

These are the fundamental concepts that Mage uses to operate.

## Table of contents

- [Project](#project)
- [Pipeline](#pipeline)
- [Block](#block)
- [Data product](#data-product)
- [Trigger](#trigger)
- [Run](#run)
- [Log](#log)
- *Event (WIP)*
- *Metric (WIP)*
- *Partition (WIP)*
- *Version (WIP)*
- *Backfill (WIP)*
- *Service (WIP)*

<br />

## Project

A project is like a repository on GitHub; this is where you write all your code.

Here is a [sample project](https://github.com/mage-ai/demo_etl_pipeline) and
a sample folder structure:

```
📁 charts/
📁 data_exporters/
📁 data_loaders/
📁 pipelines/
  ⌄ 📁 demo/
    📝 __init__.py
    📝 metadata.yaml
📁 scratchpads/
📁 transformers/
📁 utils/
📝 __init__.py
📝 io_config.yaml
📝 metadata.yaml
📝 requirements.txt
```

Code in a project can be shared across the entire project.

You can create a new project by running the following command:

<b>Using Docker</b>

```bash
docker run -it -p 6789:6789 -v $(pwd):/home/src \
  mageai/mageai mage init [project_name]
```

<b>Using `pip`</b>

```bash
mage init [project_name]
```

<br />

##  Pipeline

A pipeline contains references to all the blocks of code you want to run,
charts for visualizing data, and organizes the dependency between each block of code.

Each pipeline is represented by a YAML file. Here is an [example](https://github.com/mage-ai/demo_etl_pipeline/blob/master/pipelines/etl_demo/metadata.yaml).

This is what it could look like in the notebook UI:

<img
  alt="Pipeline"
  src="https://github.com/mage-ai/mage-ai/raw/master/media/data-pipeline-overview.jpg"
/>

You can find all the pipelines in a project under the `[project_name]/pipelines/` folder.

<br />

## Block

A block is a file with code that can be executed independently or within a pipeline.

There are 5 types of blocks.

1. Data loader
1. Transformer
1. Data exporter
1. Scratchpad
1. Chart

<sub>For more information, please see the [<b>documentation on blocks</b>](../blocks/README.md)</sub>

Here is an example of a [data loader block](https://github.com/mage-ai/demo_etl_pipeline/blob/master/data_loaders/load_dataset.py)
and a snippet of its code:

```python
@data_loader
def load_data_from_api() -> DataFrame:
    url = 'https://raw.githubusercontent.com/mage-ai/datasets/master/restaurant_user_transactions.csv'

    response = requests.get(url)
    return pd.read_csv(io.StringIO(response.text), sep=',')
```

Each block file is stored in a folder that matches its respective type
(e.g. transformers are stored in `[project_name]/transformers/`.

<br />

## Data product

Every block produces data after its been executed. These are called <b>data products</b> in Mage.

Data validation occurs whenever a block is executed.

Additionally, each data product produced by a block can be automatically
partitioned, versioned, and backfilled.

Some examples of data products produced by blocks:

- 📋 Dataset/Table in a database, data warehouse, etc.
- 🖼️ Image
- 📹 Video
- 📝 Text file
- 🎧 Audio file

<br />

## Trigger

A trigger is a set of instructions that determine when or how a pipeline should run.
A pipeline can have 1 or more triggers.

There are 2 types of triggers:

1. Schedule
1. Event

#### Schedule

A schedule type trigger will instruct the pipeline to run after a start date and on a set interval.

Currently, the frequency pipelines can be scheduled for include:

- Run exactly once
- Hourly
- Daily
- Weekly
- Monthly
- Every N minutes (coming soon)

#### Event

An event type trigger will instruct the pipeline to run whenever a specific event occurs.

For example, you can have a pipeline start running when a database query is finished executing or
when a new object is created in Amazon S3 or Google Storage.

You can also trigger a pipeline using your own custom event by making a `POST` request to
the `http://localhost/api/events` endpoint with a custom event payload.

<sub>Check out this [<b>tutorial</b>]() on how to create an event trigger.</sub>

<br />

## Run

Every time a pipeline or a block is executed
(outside of the notebook while building the pipeline and block),
a run record is created in a database.

A run record stores information about when it was started, its status, when it was completed,
any runtime variables used in the execution of the pipeline or block, etc.

There are 2 types of runs:

#### Pipeline run

This contain information about the entire pipeline execution

#### Block run

Every time a pipeline is executed, each block in the pipeline will be executed and potentially create a block run record.

<br />

## Log

A log is a file that contains system output information.

It’s created whenever a pipeline or block is ran.

Logs can contain information about the internal state of a run,
text that is outputted by loggers or `print` statements in blocks,
or errors and stack traces during code execution.

Here is an example of a log in the
[<b>Data pipeline management</b>](../features/orchestration/README.md) UI:

<img
  alt="Log detail"
  src="https://github.com/mage-ai/assets/blob/main/logs/log-detail.png?raw=true"
/>

Logs are stored on disk wherever Mage is running.
However, you can configure where you want log files written to (e.g. Amazon S3, Google Storage, etc).

<br />
