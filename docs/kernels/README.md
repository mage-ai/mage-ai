# Kernels

We support multiple kernels in the code editor.

1. [Python3](#debugging)
1. [PySpark](#guides)

## Python3 kernel
Python3 is the default kernel. You can prototype and transform small to medium size datasets with this kernel. Pipelines built with this kernel can be executed in Python environments.

## PySpark kernel
We support running PySpark kernel to prototype with large datasets and build pipelines to transform large datasets.

Instructions for running PySpark kernel
* Launch a remote AWS EMR Spark cluster. Install mage_ai library in bootstrap actions. Make sure the EMR cluster is publicly accessible.
* Connect to the remote spark kernel with command `ssh -i path_to_key_pair -L 0.0.0.0:9999:localhost:8998 master_ec2_public_dns_name`
* Update the default kernel to PySpark kernel in [code](https://github.com/mage-ai/mage-ai/blob/master/mage_ai/server/kernels.py#L11).
* Launch editor with command: `./scripts/start.sh [project_name]`

When using PySpark kernel, we need to specify a s3 path as the variables dir, which will be used to store the output of each block. The vairables dir can be set in project's metadata.yaml file. Example:
```yaml
variables_dir: s3://bucket/path
```

Pipelines built with this kernel can be executed in PySpark environments.
