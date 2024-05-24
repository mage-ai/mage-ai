import os
from typing import List

from mage_ai.services.spark.config import SparkConfig

try:
    from pyspark.conf import SparkConf
    from pyspark.sql import SparkSession
    SPARK_ENABLED = True
except Exception:
    SPARK_ENABLED = False


def get_file_names(jars: List) -> List:
    """
    Extracts file names from a list of jar files.

    Args:
        jars (List): A list of jar files.

    Returns:
        List: A list of file names.
    """
    if jars is None:
        return None

    return [os.path.basename(jar) for jar in jars]


def contains_same_jars(jars_1: List, jars_2: List) -> bool:
    """
    Checks if two lists of jar files contain the same jars.
    The order of the jars in the list does not matter.

    Args:
        jars_1 (List): A list of jar files.
        jars_2 (List): A list of jar files.

    Returns:
        bool: True if the lists contain the same jars, False otherwise.
    """
    if jars_1 is None and jars_2 is None:
        return True

    if jars_1 is None or jars_2 is None:
        return False

    if len(jars_1) != len(jars_2):
        return False

    file_names_1 = get_file_names(jars_1)
    file_names_2 = get_file_names(jars_2)

    return set(file_names_1) == set(file_names_2)


def has_same_spark_config(spark_session, spark_config: SparkConfig) -> bool:
    """
    Checks if the spark session has the same configuration as the spark config.

    Args:
        spark_session (SparkSession): The spark session.
        spark_config (SparkConfig): The spark config.

    Returns:
        bool: True if the spark session has the same configuration as the
        spark config, False otherwise.
    """
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
        if (spark_config.spark_jars and not contains_same_jars(
                spark_config.spark_jars, spark_session.conf.get('spark.jars'))):
            print('Different spark.jars found!')
            return False
        if spark_config.others:
            for key, value in spark_config.others.items():
                if spark_session.conf.get(key) != value:
                    print(f'Different {key} found!')
                    return False
    return True


def get_spark_session(spark_config: SparkConfig):
    """
    Gets a Spark session.
    If the given spark_config is None, then create a Spark session with the
    default configuration.
    If the given spark_config is not None, then check if the active Spark
    session has the same configuration as the given spark_config.
    If the active Spark session has the same configuration as the given
    spark_config, then reuse the active Spark session.
    If the active Spark session does not have the same configuration as the
    given spark_config, then create a new Spark session with the given
    spark_config.

    Args:
        spark_config (SparkConfig): The Spark configuration.

    Returns:
        SparkSession: The Spark session.
    """
    if not SPARK_ENABLED:
        raise ImportError('Spark is not supported in current environment.')

    if spark_config:
        active_session = SparkSession.getActiveSession()
        print('Check the given spark_config against the active Spark session.')
        if spark_config.use_custom_session or has_same_spark_config(
            spark_session=active_session,
            spark_config=spark_config,
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
