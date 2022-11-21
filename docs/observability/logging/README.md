# Logging

By default, logs for each pipeline run will be stored in the `<path_to_project>/pipelines/<pipeline_name>/.logs` folder. 

## Logging to external destination

### S3

To store logs in S3, you need to set the `logging` config in your project's `metadata.yaml` file.

Example S3 logging config:
```
logging_config:
  type: s3
  level: INFO
  destination_config:
    bucket: <bucket_name>
    prefix: <prefix_path>
```

### More destinations TBA