# Documentation

## Table of contents

- [Spark and Mage](spark/setup/README.md)

## Installing extra packages

Mage also has the following extras:

* **spark**: to use Spark in your Mage pipeline
* **bigquery**: to connect to BigQuery for data import or export
* **hdf5**: to process HDF5 file format
* **postgres**: to connect to PostgreSQL for data import or export
* **redshift**: to connect to Redshift for data import or export
* **s3**: to connect to S3 for data import or export
* **snowflake**: to connect to Snowflake for data import or export
* **all**: to install all of the above to use all functionalities

```bash
pip install "mage-ai[spark]"
```

## Install errors

You may need to install development libraries for MIT Kerberos to use some Mage features.
On Ubuntu, this can be installed as:
```bash
apt install libkrb5-dev
```
