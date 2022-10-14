# Setup and install

- [Setup](#setup)
- [Install](#install)
- [Development environment](#development-environment)

<br />

## Setup
You can install Mage using Docker or `pip`:

### Using Docker

##### 1. Create new project and launch tool

```bash
docker run -it -p 6789:6789 -v $(pwd):/home/src \
  mageai/mageai mage start [project_name]
```

Open [http://localhost:6789](http://localhost:6789) in your browser and build a pipeline.

##### 2. Run pipeline after building it in the tool
```bash
docker run -it -p 6789:6789 -v $(pwd):/home/src \
  mageai/mageai mage run [project_name] [pipeline]
```

##### Initialize new project
If you want to create a different project with a different name, run the following:

```bash
docker run -it -p 6789:6789 -v $(pwd):/home/src \
  mageai/mageai mage init [project_name]
```

<br />

### Using `pip` or [`conda`](https://github.com/conda-forge/mage-ai-feedstock)

##### 1. Install Mage
```bash
pip install mage-ai
```

or

```bash
conda install -c conda-forge mage-ai
```

<sub>If you run into errors, see the [errors section](#errors) below.</sub>

##### 2. Create new project and launch tool
```bash
mage start [project_name]
```

Open [http://localhost:6789](http://localhost:6789) in your browser and build a pipeline.

##### 3. Run pipeline after building it in the tool
```bash
mage run [project_name] [pipeline]
```

##### Initialize new project
If you want to create a different project with a different name, run the following:
```bash
mage init [project_name]
```

<br />

## Install

### Installing extra packages

Mage also has the following extras:

* **spark**: to use Spark in your Mage pipeline
* **bigquery**: to connect to BigQuery for data import or export
* **hdf5**: to process HDF5 file format
* **postgres**: to connect to PostgreSQL for data import or export
* **redshift**: to connect to Redshift for data import or export
* **s3**: to connect to S3 for data import or export
* **snowflake**: to connect to Snowflake for data import or export
* **all**: to install all of the above to use all functionalities

Example:

```bash
pip install "mage-ai[spark]"
```

<br />

### Errors

You may need to install development libraries for MIT Kerberos to use some Mage features.

On Ubuntu, this can be installed as:
```bash
apt install libkrb5-dev
```

<br />

## Development environment

To setup a development environment for editing source code,
please check out this [document](../../contributing/README.md).

<br />

## Building your own Docker image

```bash
docker build -t mage/dangerous .
```

<br />
