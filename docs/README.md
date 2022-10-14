# 📚 Documentation

Read more tech docs here. Got questions?

[![Join us on Slack](https://img.shields.io/badge/%20-Join%20us%20on%20Slack-black?style=for-the-badge&logo=slack&labelColor=6B50D7)](https://www.mage.ai/chat)

<img
  alt="Wind mage looking"
  height="200"
  src="https://raw.githubusercontent.com/mage-ai/assets/main/mascots/wind/looking.svg"
/>
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

### Design
- [Core design principles](core/design_principles.md)
- [Core abstractions](core/abstractions.md)
- [Blocks](blocks/README.md)

### Production
- Deploying to cloud
    - [Using Terraform](deploy/terraform/README.md)
        - [Amazon Web Services (AWS)](deploy/terraform/AWS.md)
        - [Microsoft Azure](deploy/terraform/Azure.md)
        - [Google Cloud Platform (GCP)](deploy/terraform/GCP.md)
    - [AWS (without Terraform)](deploy/aws/README.md)
- Version control
    - [Setting up Git on cloud](guides/version_control/Git.md)
- Configuring production settings
    - [Compute resource](production/compute_resource.md)
    - [Runtime variables](production/runtime_variables.md)
- Monitoring and alerting
    - [Status updates in Slack](monitoring/alerting/Slack.md)
    - [Status updates in Email](monitoring/alerting/Email.md)
    - [Logging](features/orchestration/README.md#logs)

### Integrations
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
    - *Data integration pipeline (coming soon)*
- [SQL blocks](guides/blocks/SQL.md)
- [Sensors: blocks depending on external pipelines](guides/blocks/Sensors.md)
- [Triggering pipelines](core/abstractions.md#trigger)
    - [Schedule pipelines to run periodically](tutorials/triggers/schedule.md)
    - [Trigger pipeline from event](core/abstractions.md#event)
    - [Trigger pipeline via API request](triggers/api.md)
    - [Trigger pipeline from AWS Event (WIP)](tutorials/triggers/events/aws.md)
- Testing
    - [Data validation](testing/README.md#data-validation)
- [Templates](#templates)

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
