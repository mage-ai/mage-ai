# 🪄 Spark

Want to become a [Sparkmage](https://c1.scryfall.com/file/scryfall-cards/large/front/0/3/030f4058-54e5-4333-bd6c-2789c334bf12.jpg)?

This is a guide for using Spark (PySpark) with Mage in different cloud providers (see a specific section for the cloud provider you use).

## AWS

Here is an overview of the steps required to use Mage locally with Spark in AWS:

1. [Create an EC2 key pair](#1-create-an-ec2-key-pair)
1. [Create an S3 bucket for Spark](#2-create-an-s3-bucket-for-spark)
1. [Start Mage](#3-start-mage)
1. [Configure project’s metadata settings](#4-configure-projects-metadata-settings)
1. [Launch EMR cluster](#5-launch-emr-cluster)
1. [SSH into EMR master node](#6-ssh-into-emr-master-node)
1. [Sample pipeline with PySpark code](#7-sample-pipeline-with-pyspark-code)
1. [Debugging](#8-debugging)
1. [Clean up](#9-clean-up)

If you get stuck, run into problems, or just want someone to walk you through these steps, please join our
[<img alt="Slack" height="20" src="https://thepostsportsbar.com/wp-content/uploads/2017/02/Slack-Logo.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)
and someone will help you ASAP.

[![Join us on Slack](https://img.shields.io/badge/%20-Join%20us%20on%20Slack-black?style=for-the-badge&logo=slack&labelColor=6B50D7)](https://www.mage.ai/chat)

### 1. Create an EC2 key pair

If you don’t have an existing EC2 key pair that you use to SSH into EC2 instances,
follow [AWS’s guide](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html)
on how to create an EC2 key pair.

Once you created an EC2 key pair, note the name of the EC2 key pair and
the full path of where you saved it on your local machine (we’ll need it later).

### 2. Create an S3 bucket for Spark

Using Spark on AWS EMR requires an AWS S3 bucket to store logs, scripts, etc.

Follow [AWS’s guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html)
to create an S3 bucket. You don’t need to add any special permissions or policies
to this bucket.

Once you created an S3 bucket, note the name of the bucket (we’ll need it later).

### 3. Start Mage

Using Mage with Spark is much easier if you use Docker.

Type this command in your terminal to start Mage using docker
(Note: `demo_project` is the name of your project, you can change it to anything you want):

```bash
docker run -it -p 6789:6789 -v $(pwd):/home/src mageai/mageai \
  mage start demo_project
```

### 4. Configure project’s metadata settings

Open your project’s `metadata.yaml` file located at the root of your project’s directory:
`demo_project/metadata.yaml` (presuming your project is named `demo_project`).

Change the values for the keys mentioned in the following steps.

#### 4a. `ec2_key_name`

Change the value for key `ec2_key_name` to equal the name of the EC2 key pair you created
in an earlier step.

For example, if your EC2 key pair is named `aws-ec2.pem` or `aws-ec2.pub`,
then the value for the key `ec2_key_name` should be `aws-ec2`.

#### 4b. `remote_variables_dir`

Change the value for key `remote_variables_dir` to equal the S3 bucket you created in an earlier
step.

For example, if your S3 bucket is named `my-awesome-bucket`, then the value for the key
`remote_variables_dir` should be `s3://my-awesome-bucket`.

#### 4c. Remove optional settings

You can remove the following 2 keys:

1. `master_security_group`
1. `slave_security_group`

<br />

Your final `metadata.yaml` file could look like this:

```yaml
variables_dir: ./
remote_variables_dir: s3://my-awesome-bucket

emr_config:
  master_instance_type: 'r5.4xlarge'
  slave_instance_type: 'r5.4xlarge'
  ec2_key_name: aws-ec2
```

### 5. Launch EMR cluster

You’ll need an AWS Access Key ID and an AWS Secret Access Key.
This is provided from AWS’s IAM Management console.

Once you’ve acquired those credentials, do the following:

#### 5a. Create IAM roles for EMR

The following steps will create 2 IAM roles required for EMR.

1. Install [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).
1. Run this command in your terminal ([reference](https://docs.aws.amazon.com/cli/latest/reference/emr/create-default-roles.html))
```bash
aws emr create-default-roles
```

#### 5b. Run script in Docker container
Using your AWS Access Key ID and an AWS Secret Access Key,
run the following command in your terminal to launch an EMR cluster:

```bash
docker run -it \
  -v $(pwd):/home/src mageai/mageai \
  --env AWS_ACCESS_KEY_ID=your_key_id \
  --env AWS_SECRET_ACCESS_KEY=your_access_key \
  mage create_spark_cluster demo_project
```

This script will take a few minutes to complete.
Once finished, your terminal will output something like this:

```bash
Creating EMR cluster for project: /home/src/demo_project
Creating cluster...

{
  "JobFlowId": "j-3500M6WJOND9Q",
  "ClusterArn": "...",
  "ResponseMetadata": {
    "RequestId": "...,
    "HTTPStatusCode": 200,
    "HTTPHeaders": {
      "x-amzn-requestid": "...,
      "content-type": "application/x-amz-json-1.1",
      "content-length": "118",
      "date": "Wed, 17 Aug 2022 04:32:33 GMT"
    },
    "RetryAttempts": 0
  }
}

Cluster ID: j-3500M6WJOND9Q
Waiting for cluster, this typically takes several minutes...
Current status: STARTING..BOOTSTRAPPING.....WAITING
Cluster j-3500M6WJOND9Q is created
```

### 6. SSH into EMR master node

#### 6a. Allow SSH access to EMR

Add an inbound rule to the EMR master node’s security group to allow SSH access by following these steps:

1. Go to [Amazon EMR](https://us-west-2.console.aws.amazon.com/elasticmapreduce/home).
1. Click on the cluster you just created.
1. Under the section **Security and access**, click the link next to **Security groups for Master:**. The link could look like this `sg-0bb79fd041def8c5d` (depending on your security group ID).
1. In the "Security Groups" page that just opened up, click on the row with the "Security group name" value of "ElasticMapReduce-master".
1. Under the section "Inbound rules", click the button on the right labeled "Edit inbound rules".
1. Scroll down and click "Add rule".
1. Change the "type" dropdown from `Custom TCP` to `SSH`.
1. Change the "Source" dropdown from `Custom` to `My IP`.
1. Click "Save rules" in the bottom right corner of the page.

#### 6b. SSH into master node
1. Go to [Amazon EMR](https://us-west-2.console.aws.amazon.com/elasticmapreduce/home).
1. Click on the cluster you just created.
1. Find the **Master public DNS**, it should look something like this: `ec2-some-ip.us-west-2.compute.amazonaws.com`.
1. Make sure your EC2 key pair is read-only. Run the following command (change the location to wherever you saved your EC2 key pair locally):
```bash
chmod 400 ~/.ssh/aws-ec2.pem
```
1. In a separate terminal session, run the following command:
```bash
ssh -i [location of EC2 key pair file] \
  -L 0.0.0.0:9999:localhost:8998 \
  hadoop@[Master public DNS]
```

The command could look like this:
```bash
ssh -i ~/.ssh/aws-ec2.pem \
  -L 0.0.0.0:9999:localhost:8998 \
  hadoop@ec2-44-234-41-39.us-west-2.compute.amazonaws.com
```

### 7. Sample pipeline with PySpark code

1. Create a new pipeline by going to `File` in the top left corner of the page and then clicking `New pipeline`.
1. Change the pipeline’s kernel from `python` to `pyspark`. Click the button with the green dot and the word `python` next to it. This is located at the top of the page on the right side of your header.
1. Click `+ Data loader`, then `Generic (no template)` to add a new data loader block.
1. Paste the following sample code in the new data loader block:
```python
from pandas import DataFrame
import io
import pandas as pd
import requests


if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


def data_from_internet():
    url = 'https://raw.githubusercontent.com/mage-ai/datasets/master/restaurant_user_transactions.csv'

    response = requests.get(url)
    return pd.read_csv(io.StringIO(response.text), sep=',')


@data_loader
def load_data(**kwargs) -> DataFrame:
    df_spark = kwargs['spark'].createDataFrame(data_from_internet())

    return df_spark
```
1. Click `+ Data exporter`, then `Generic (no template)` to add a new data exporter block.
1. Paste the following sample code in the new data exporter block (change the `s3://bucket-name` to the bucket you created from a previous step):
```python
from pandas import DataFrame

if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data(df: DataFrame, **kwargs) -> None:
    (
        df.write
        .option('delimiter', ',')
        .option('header', 'True')
        .mode('overwrite')
        .csv('s3://mage-spark-cluster/demo_project/demo_pipeline/')
    )
```

#### Verify everything worked

Let’s load the data from S3 that we just created using Spark:

1. Click `+ Data loader`, then `Generic (no template)` to add a new data loader block.
1. Paste the following sample code in the new data loader block (change the `s3://bucket-name` to the bucket you created from a previous step):

```python
from pandas import DataFrame


if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def load_data(**kwargs) -> DataFrame:
    df = (
        kwargs['spark'].read
        .format('csv')
        .option('header', 'true')
        .option('inferSchema', 'true')
        .option('delimiter', ',')
        .load('s3://mage-spark-cluster/demo_project/demo_pipeline/*')
    )

    return df
```

### 8. Debugging

If you run into any problems, 1st thing to try is restarting the kernel: `Run` > `Restart kernel`.

If that doesn’t work, restart the app by stopping the docker container and starting it again.

### 9. Clean up

Please make sure to terminate your EMR cluster when you’re done using it so you can save money.

## [WIP] GCP
Coming soon...

## [WIP] Azure
Coming soon...
