# Spark

This is a guide for using Spark (PySpark) with Mage in different cloud providers.

See a specific section for the cloud provider you use.

## AWS

Here is an overview of the steps required to use Mage locally with Spark in AWS:

1. [Create an EC2 key pair](#1-create-an-ec2-key-pair)
1. Create an S3 bucket for Spark
1. Start Mage
1. Configure project’s metadata settings
1. Launch EMR cluster
1. SSH into EMR master node
1. Sample pipeline with PySpark code

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

The steps create the same default roles
described in this [AWS API documentation](https://docs.aws.amazon.com/cli/latest/reference/emr/create-default-roles.html)
for the `create-default-roles` function.

##### EMR_EC2_DefaultRole
1. Go to the Roles page in the IAM Management Console and click "Create role".
1. Under "Trusted entity type", select "Custom trust policy".
1. Paste the following code in the "Custom trust policy" textarea:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      }
    }
  ]
}
```
1. Click "Next" at the bottom right.
1. On the "Add permissions" step, click "Create policy".
1. Under "Role name", enter "EMR_EC2_DefaultRole".
1. Click "Create role" at the bottom right of the page to create role.
1. On the Roles page, search for the role named "EMR_EC2_DefaultRole" and click it.
1. Click the "Add permissions" dropdown and click "Attach policies".
1. Enter "AmazonElasticMapReduceforEC2Role" in the search bar and press "Enter".
1. Click the checkbox next to the policy named "AmazonElasticMapReduceforEC2Role".
1. Click "Attach policies" at the bottom right of the page.

##### EMR_DefaultRole
1. Go to the Roles page in the IAM Management Console and click "Create role".
1. Under "Trusted entity type", select "Custom trust policy".
1. Paste the following code in the "Custom trust policy" textarea:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "elasticmapreduce.amazonaws.com"
      }
    }
  ]
}
```
1. Click "Next" at the bottom right.
1. On the "Add permissions" step, click "Create policy".
1. Under "Role name", enter "EMR_DefaultRole".
1. Click "Create role" at the bottom right of the page to create role.
1. On the Roles page, search for the role named "EMR_DefaultRole" and click it.
1. Click the "Add permissions" dropdown and click "Create inline policy".
1. Click the "JSON" tab and paste in the following JSON:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:CancelSpotInstanceRequests",
        "ec2:CreateSecurityGroup",
        "ec2:CreateTags",
        "ec2:DeleteTags",
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeAccountAttributes",
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:DescribeKeyPairs",
        "ec2:DescribePrefixLists",
        "ec2:DescribeRouteTables",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSpotInstanceRequests",
        "ec2:DescribeSpotPriceHistory",
        "ec2:DescribeSubnets",
        "ec2:DescribeVpcAttribute",
        "ec2:DescribeVpcEndpoints",
        "ec2:DescribeVpcEndpointServices",
        "ec2:DescribeVpcs",
        "ec2:ModifyImageAttribute",
        "ec2:ModifyInstanceAttribute",
        "ec2:RequestSpotInstances",
        "ec2:RunInstances",
        "ec2:TerminateInstances",
        "iam:GetRole",
        "iam:GetRolePolicy",
        "iam:ListInstanceProfiles",
        "iam:ListRolePolicies",
        "iam:PassRole",
        "s3:CreateBucket",
        "s3:Get*",
        "s3:List*",
        "sdb:BatchPutAttributes",
        "sdb:Select",
        "sqs:CreateQueue",
        "sqs:Delete*",
        "sqs:GetQueue*",
        "sqs:ReceiveMessage"
      ],
      "Resource": "*",
      "Effect": "Allow"
    }
  ]
}
```
1. Click "Review policy".
1. Under "Name", enter "EMR_DefaultRole_policy".
1. Click "Create policy".

#### 5a. Clone the Mage GitHub repository

Clone the repository, move your `demo_project/` folder into the `mage-ai/` folder,
and change directory into the `mage-ai` folder:

```bash
git clone https://github.com/mage-ai/mage-ai.git && mv demo_project mage-ai && cd mage-ai
```

#### 5b. Run script in Docker container
Using your AWS Access Key ID and an AWS Secret Access Key,
run the following command in your terminal to launch an EMR cluster:

```bash
docker run \
  --env AWS_ACCESS_KEY_ID=your_key_id \
  --env AWS_SECRET_ACCESS_KEY=your_access_key \
  -v $(pwd):/home/src mageai/mageai \
  python3 scripts/spark/create_cluster.py demo_project
```

This script will take a few minutes to complete.
Once finished, your terminal will output something like this:

```bash
TBD
```

### 6. SSH into EMR master node

- Get the master_ec2_public_dns_name

### 7. Sample pipeline with PySpark code

- Change the kernel in the UI
- Code

## [WIP] GCP
Coming soon.

## [WIP] Azure
Coming soon.
