# 📚 Documentation

Read more tech docs here. Got questions?

[![Join us on Slack](https://img.shields.io/badge/%20-Join%20us%20on%20Slack-black?style=for-the-badge&logo=slack&labelColor=6B50D7)](https://www.mage.ai/chat)


![](https://user-images.githubusercontent.com/78053898/198753334-e47c8494-0289-4f96-9058-f0f2387b23fb.svg)
<img
  referrerpolicy="no-referrer-when-downgrade"
  src="https://static.scarf.sh/a.png?x-pxid=166cb008-7c31-4e95-909a-0f5fdc1d375a"
/>

## Directory

1. [Getting started](#getting-started)
1. [Tutorials](#tutorials)
1. [Design](#design)
1. [Production](#production)
1. [Integrations](#integrations)
1. [Guides](#guides)
1. [About](#about)
1. [Use cases](use_cases/README.md)
1. *Best practices (coming soon)*

<br />

### Getting started
- [Setup and install](tutorials/quick_start/setup.md)
- [Data pipeline management](features/orchestration/README.md)
- [Kernels](kernels/README.md)

### Tutorials
- [Tutorials](tutorials/README.md)
    - [Train model on Titanic dataset](tutorials/quick_start/train_titanic_model/README.md)
    - [Load data from API, transform it, and export it to PostgreSQL](tutorials/quick_start/etl_restaurant/README.md)
    - [Integrate Mage into an existing Airflow project](tutorials/airflow/integrate_into_existing_project/README.md)
    - [Set up DBT models and orchestrate DBT runs](tutorials/dbt/quick_start.md)

### Design
- [Core design principles](core/design_principles.md)
- [Core abstractions](core/abstractions.md)
- [Blocks](blocks/README.md)

### Developing in the cloud
- Version control
    - [Setting up Git on cloud](guides/version_control/Git.md)
- [Multi-development environment in the cloud](development/multi_development_environment/README.md)

### Production
- Deploying to cloud
    - [Using Terraform](deploy/terraform/README.md)
        - [Amazon Web Services (AWS)](deploy/terraform/AWS.md)
        - [Microsoft Azure](deploy/terraform/Azure.md)
        - [Google Cloud Platform (GCP)](deploy/terraform/GCP.md)
    - [AWS (without Terraform)](deploy/aws/README.md)
- Configuring production settings
    - [Compute resource](production/compute_resource.md)
    - [Runtime variables](production/runtime_variables.md)
- Observability
    - [Alerting status updates in Slack](observability/alerting/Slack.md)
    - [Alerting status updates in Email](observability/alerting/Email.md)
    - [Logging](features/orchestration/README.md#logs)
    - [Monitoring](observability/monitoring/README.md)

### Integrations
- [Syncing data between 3rd party sources and destinations](data_integrations/README.md)
- Compute
    - [Spark / PySpark](spark/setup/README.md)
- Databases, data warehouses, data lakes, etc.
    - [BigQuery](integrations/BigQuery.md)
    - [PostgreSQL](integrations/PostgreSQL.md)
    - [Redshift](integrations/Redshift.md)
    - [S3](integrations/S3.md)
    - [Snowflake](integrations/Snowflake.md)
- Existing tools
    - [Airflow](tutorials/airflow/integrate_into_existing_project/README.md)
    - [Prefect](production/prefect.md)

### Guides
- Building pipelines
    - [Batch pipeline](tutorials/quick_start/etl_restaurant/README.md)
    - [Streaming pipeline](guides/pipelines/StreamingPipeline.md)
    - [Data integration pipeline](guides/pipelines/DataIntegrationPipeline.md)
- [SQL blocks](guides/blocks/SQL.md)
- [R blocks](guides/blocks/R.md)
- [Sensors: blocks depending on external pipelines](guides/blocks/Sensors.md)
- [Triggering pipelines](core/abstractions.md#trigger)
    - [Schedule pipelines to run periodically](tutorials/triggers/schedule.md)
    - [Trigger pipeline from event](core/abstractions.md#event)
    - [Trigger pipeline via API request](triggers/api.md)
    - [Trigger pipeline from AWS Event (WIP)](tutorials/triggers/events/aws.md)
- Testing
    - [Data validation](testing/README.md#data-validation)
- [Templates](#templates)
- DBT
    - [Run a single model](guides/dbt/run_model.md)
    - [Run selected models (and optionally exclude others)](guides/dbt/run_models.md)
    - [Connection profiles](guides/dbt/connection_profiles.md)
    - [DBT models depending on other blocks using sources](guides/dbt/dependencies.md)
    - [Running DBT tests](guides/dbt/tests.md)
    - [Add an existing DBT project to Mage](guides/dbt/add_existing_project.md)

### About
- [Features](features/README.md)
- [Roadmap](https://airtable.com/shrJS0cDOmQywb8vp)
- [Changelog](https://mageai.notion.site/What-s-new-7cc355e38e9c42839d23fdbef2dabd2c)

<br />

---

<br />

## Templates

##### `io_config.yaml`

This YAML file contains the information and credentials required to access
databases, data warehouses, and data lakes.

[Example](https://github.com/mage-ai/mage-ai/blob/master/mage_ai/data_preparation/templates/repo/io_config.yaml)
