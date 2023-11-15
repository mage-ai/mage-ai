from mage_ai.services.spark.api.constants import SPARK_UI_HOST, SPARK_UI_PORT_AWS_EMR
from mage_ai.services.spark.api.local import LocalAPI
from mage_ai.services.ssh.aws.emr.models import SSHTunnel


class AwsEmrAPI(LocalAPI):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        if not self.application_id:
            applications = self.applications_sync()
            if applications:
                applications = sorted(applications, key=lambda x: x.id, reverse=True)
                application = applications[0]
                self.application_id = application.calculated_id()

    @property
    def spark_ui_url(self) -> str:
        url = f'http://{SPARK_UI_HOST}:{SPARK_UI_PORT_AWS_EMR}'

        tunnel = SSHTunnel()
        if tunnel:
            connection_details = tunnel.connection_details()
            host = connection_details.get('host')
            port = connection_details.get('port')
            url = f'http://{host or SPARK_UI_HOST}:{port or SPARK_UI_PORT_AWS_EMR}'

        if self.application_spark_ui_url:
            url = self.application_spark_ui_url
        elif self.spark_session:
            url = self.spark_session.sparkContext.uiWebUrl

        return url

    def ready_for_requests(self, **kwargs) -> bool:
        tunnel = SSHTunnel()
        ready = tunnel and tunnel.is_active()
        return True if ready else False
