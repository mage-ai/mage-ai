if 'data_exporter' not in globals():
    from mage_ai.data_preparation.decorators import data_exporter


@data_exporter
def export_data_to_s3(df, **kwargs):
    """
    Template for exporting data to a S3 bucket.
    """
    s3_bucket = 'your_s3_bucket_name'
    s3_path_prefix = 'your_s3_path_prefix'
    (
        df.write
        .option('header', 'True')
        .mode('overwrite')
        # Use csv or parquet format
        .csv(f's3://{s3_bucket}/{s3_path_prefix}')
    )
