{% extends "data_loaders/pyspark/default.jinja" %}
{% block imports %}
{{ super() -}}
{% endblock %}


{% block content %}
@data_loader
def load_from_s3_bucket(**kwargs):
    """
    Template for loading data from a S3 bucket.
    """
    s3_bucket = 'your_s3_bucket_name'
    s3_path_prefix = 'your_s3_path_prefix'
    df = (kwargs['spark'].read
        .format('csv')
        .option('header', 'true')
        .option('inferSchema', 'true')
        .option('delimiter', ',')
        .load(f's3://{s3_bucket}/{s3_path_prefix}/*')
    )

    return df
{% endblock %}
