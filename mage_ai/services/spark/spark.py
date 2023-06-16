from mage_ai.services.spark.config import SparkConfig
import os


def has_same_spark_config(spark_session, spark_config: SparkConfig) -> bool:
    if spark_session is None:
        return False

    if spark_config:
        if (spark_config.app_name and spark_config.app_name
                != spark_session.conf.get('spark.app.name')):
            print('Different spark.app.name found!')
            return False
        if (spark_config.spark_master and spark_config.spark_master
                != spark_session.conf.get('spark.master')):
            print('Different spark.master found!')
            return False
        if (spark_config.spark_home and spark_config.spark_home
                != spark_session.conf.get('spark.home')):
            print('Different spark.home found!')
            return False
        if spark_config.executor_env:
            for key, value in spark_config.executor_env.items():
                if spark_session.conf.get(f'spark.executorEnv.{key}') != value:
                    print(f'Different spark.executorEnv.{key} found!')
                    return False
        if (spark_config.spark_jars and spark_config.spark_jars
                != spark_session.conf.get('spark.jars')):
            print('Different spark.jars found!')
            return False
        if spark_config.others:
            for key, value in spark_config.others.items():
                if spark_session.conf.get(key) != value:
                    print(f'Different {key} found!')
                    return False
    return True


def get_spark_session(spark_config: SparkConfig):
    from pyspark.conf import SparkConf
    from pyspark.sql import SparkSession

    if spark_config:
        active_session = SparkSession.getActiveSession()
        print('Check the given spark_config against the active Spark session.')
        if has_same_spark_config(
            spark_session=active_session,
            spark_config=spark_config
        ):
            print('Reuse the active Spark session.')
            return active_session
        else:
            print('Create a new Spark session.')
            if active_session:
                active_session.stop()
            conf = SparkConf()
            if spark_config.app_name:
                conf.setAppName(spark_config.app_name)
            if spark_config.spark_master:
                conf.setMaster(spark_config.spark_master)
            if spark_config.spark_home:
                conf.setSparkHome(spark_config.spark_home)
            if spark_config.executor_env:
                env_kv_pairs = list(spark_config.executor_env.items())
                conf.setExecutorEnv(key=None, value=None, pairs=env_kv_pairs)
            if spark_config.spark_jars:
                conf.set('spark.jars', ','.join(spark_config.spark_jars))
            if spark_config.others:
                others_kv_pairs = list(spark_config.others.items())
                conf.setAll(others_kv_pairs)

            return SparkSession.builder.config(conf=conf).getOrCreate()
    else:
        return SparkSession.builder.master(
            os.getenv('SPARK_MASTER_HOST', 'local')).getOrCreate()
