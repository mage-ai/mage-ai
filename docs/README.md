# 📚 Documentation

## Table of contents

- <b>Development experience</b>
    - [Setup and install](tutorials/quick_start/setup.md)
    - [Tutorials](tutorials/README.md)
    - Concepts
        - [Core abstractions](core/abstractions.md)
        - [Blocks](blocks/README.md)
    - [Kernels](kernels/README.md)
        - [Spark and PySpark](spark/setup/README.md)
    - [Install](#install)
    - [Templates](#templates)

- <b>Operating in production</b>
    - Deploying to cloud
        - [Using Terraform](deploy/terraform/README.md)
        - [AWS](deploy/aws/README.md)
    - Configuring production settings
        - [Compute resource](production/compute_resource.md)
        - [Runtime variables](production/runtime_variables.md)
    - Integrating with other tools
        - [Airflow](tutorials/airflow/integrate_into_existing_project/README.md)
        - [Prefect](production/prefect.md)

<br />

## Templates

### `io_config.yaml`

This YAML file contains the information and credentials required to access
databases, data warehouses, and data lakes.

[Example](https://github.com/mage-ai/mage-ai/blob/master/mage_ai/data_preparation/templates/repo/io_config.yaml)

<br />
