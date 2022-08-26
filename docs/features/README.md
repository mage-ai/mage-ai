# 🔮 Features

<img
  alt="Mage"
  src="media/tool-overview.png"
/>

## 🏔️ Core design principles

### 💻 Easy developer experience
Open-source engine that comes with a custom notebook UI for building data pipelines.

- Mage comes with a specialized notebook UI for building data pipelines.
- Use Python and SQL (more languages coming soon) together in the same pipeline for ultimate flexibility.
- Set up locally and get started developing with a single command.
- Deploying to production is fast using native integrations with major cloud providers.

### 🚢 Engineering best practices built-in
Build and deploy data pipelines using modular code. No more writing throwaway code or trying to turn notebooks into scripts.

- Writing reusable code is easy because every block in your data pipeline is a standalone file.
- Data validation is written into each block and tested every time a block is ran.
- Operationalizing your data pipelines is easy with built-in observability, data quality monitoring, and lineage.
- Each block of code has a single responsibility: load data from a source, transform data, or export data anywhere.

### 💳 Data is a first class citizen
Designed from the ground up specifically for running data-intensive workflows.

- Every block run produces a data product (e.g. dataset, unstructured data, etc.)
- Every data product can be automatically partitioned.
- Each pipeline and data product can be versioned.
- Backfilling data products is a core function and operation.

### 🪐 Scaling made simple
Analyze and process large data quickly for rapid iteration.

- Transform very large datasets through a native integration with Spark.
- Handle data intensive transformations with built-in distributed computing (e.g. Dask, Ray).
- Run thousands of pipelines simultaneously and manage transparently through a collaborative UI.
- Execute SQL queries in your data warehouse to process heavy workloads.

## More features

1. [Data centric editor](#1-data-centric-editor)
1. [Production ready code](#2-production-ready-code)
1. [Extensible](#3-extensible)

### 1. Data centric editor
An interactive coding experience designed for preparing data to train ML models.

Visualize the impact of your code every time you load, clean, and transform data.

<img
  alt="Data centric editor"
  src="media/data-centric-editor.png"
/>

### 2. Production ready code
No more writing throw away code or trying to turn notebooks into scripts.

Each block (aka cell) in this editor is a modular file that can be tested, reused,
and chained together to create an executable data pipeline locally or in any environment.

Read more about <b>[blocks](docs/blocks/README.md)</b> and how they work.

<img
  alt="Production ready code"
  src="media/data-pipeline.png"
/>

Run your data pipeline end-to-end using the command line function: `$ mage run [project] [pipeline]`

You can run your pipeline in production environments with the orchestration tools
* [Airflow](docs/production/airflow.md)
* [Prefect](docs/production/prefect.md)
* Dagster (Tutorial coming soon)

### 3. Extensible
Easily add new functionality directly in the source code or through plug-ins (coming soon).

Adding new API endpoints ([Tornado](https://www.tornadoweb.org/en/stable/)),
transformations (Python, PySpark, SQL),
and charts (using [React](https://reactjs.org/)) is easy to do (tutorial coming soon).

<img
  alt="Extensible charts"
  src="media/extensible-charts.gif"
/>

### New features and changelog
Check out what’s new [here](https://mageai.notion.site/What-s-new-7cc355e38e9c42839d23fdbef2dabd2c).
