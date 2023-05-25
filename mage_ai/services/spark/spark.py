from mage_ai.data_preparation.repo_manager import RepoConfig
from mage_ai.services.spark.config import SparkConfig
import os


def get_spark_session(config: SparkConfig):
    from pyspark.conf import SparkConf
    from pyspark.sql import SparkSession

    repo_config = RepoConfig(repo_path=config.repo_path)
    spark_config = repo_config.spark_config

    if spark_config:
        conf = SparkConf()
        if spark_config.get('app_name'):
            conf.setAppName(spark_config.get('app_name'))
        if spark_config.get('spark_master'):
            conf.setMaster(spark_config.get('spark_master'))
        if spark_config.get('spark_home'):
            conf.setSparkHome(spark_config.get('spark_home'))
        if spark_config.get('executor_env'):
            list_kv_pairs = []
            for key, value in spark_config.get('executor_env').items():
                list_kv_pairs.append((key, value))
            conf.setExecutorEnv(key=None, value=None, pairs=list_kv_pairs)
        if spark_config.get('spark_jars'):
            conf.set('spark.jars', ','.join(spark_config.get('spark_jars')))
        if spark_config.get('others'):
            conf.setAll(spark_config.get('others'))

        return SparkSession.builder.config(conf=conf).getOrCreate()
    else:
        return SparkSession.builder.master(
            os.getenv('SPARK_MASTER_HOST', 'local')).getOrCreate()
