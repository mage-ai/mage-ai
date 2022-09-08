# 🛸 Core abstractions

These are the fundamental concepts that Mage uses to operate.

## Table of contents

- [Project](#project)
- [Pipeline](#pipeline)
- [Block](#block)
- [Run](#run)
- [Trigger](#trigger)
- [Data product](#data-product)
- [Version](#version)
- [Partition](#partition)
- [Event](#event)
- [Log](#log)
- [Metric](#metric)
- [Service](#service)
- [Backfill](#backfill)

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

## Run

<br />

## Trigger

<br />

## Data product

<br />

## Version

<br />

## Partition

<br />

## Event

<br />

## Log

<br />

## Metric

<br />

## Service

<br />

## Backfill

<br />
