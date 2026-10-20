from mage_ai.services.spark.api.constants import SPARK_UI_HOST, SPARK_UI_PORT_AWS_EMR

SSH_USERNAME_DEFAULT = 'hadoop'
SSH_DEFAULTS = dict(
    spark_ui_host_local=SPARK_UI_HOST,
    spark_ui_host_remote=SPARK_UI_HOST,
    spark_ui_port_local=SPARK_UI_PORT_AWS_EMR,
    spark_ui_port_remote=SPARK_UI_PORT_AWS_EMR,
    ssh_username=SSH_USERNAME_DEFAULT,
)
