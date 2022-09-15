# 🏔️ Core design principles

Every user experience and technical design decision adheres to these principles.

## 💻 Easy developer experience
Open-source engine that comes with a custom notebook UI for building data pipelines.

- Mage comes with a specialized notebook UI for building data pipelines.
- Use Python and SQL (more languages coming soon) together in the same pipeline for ultimate flexibility.
- Set up locally and get started developing with a single command.
- Deploying to production is fast using native integrations with major cloud providers.

<br />

## 🚢 Engineering best practices built-in
Build and deploy data pipelines using modular code. No more writing throwaway code or trying to turn notebooks into scripts.

- Writing reusable code is easy because every block in your data pipeline is a standalone file.
- Data validation is written into each block and tested every time a block is ran.
- Operationalizing your data pipelines is easy with built-in observability, data quality monitoring, and lineage.
- Each block of code has a single responsibility: load data from a source, transform data, or export data anywhere.

<br />

## 💳 Data is a first class citizen
Designed from the ground up specifically for running data-intensive workflows.

- Every block run produces a data product (e.g. dataset, unstructured data, etc.)
- Every data product can be automatically partitioned.
- Each pipeline and data product can be versioned.
- Backfilling data products is a core function and operation.

<br />

## 🪐 Scaling is made simple
Analyze and process large data quickly for rapid iteration.

- Transform very large datasets through a native integration with Spark.
- Handle data intensive transformations with built-in distributed computing (e.g. Dask, Ray) [coming soon].
- Run thousands of pipelines simultaneously and manage transparently through a collaborative UI.
- Execute SQL queries in your data warehouse to process heavy workloads.

<br />
