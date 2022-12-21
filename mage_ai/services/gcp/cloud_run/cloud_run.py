from google.cloud import run_v2
from google.oauth2 import service_account
from mage_ai.services.gcp.cloud_run.config import CloudRunConfig
import json
import os


def run_job(command: str, cloud_run_config: CloudRunConfig) -> None:
    if type(cloud_run_config) is dict:
        cloud_run_config = CloudRunConfig.load(config=cloud_run_config)

    scopes = [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/compute',
    ]
    credentials = service_account.Credentials.from_service_account_file(
        cloud_run_config.path_to_credentials_json_file,
        scopes=scopes,
    )

    # Get existing service
    resource_prefix = f'projects/{cloud_run_config.project_id}/locations/{cloud_run_config.region}'
    existing_service_name = os.getenv('GCP_SERVICE_NAME')
    services_client = run_v2.ServicesClient(credentials=credentials)
    existing_service = services_client.get_service(
        run_v2.GetServiceRequest(
            name=f'{resource_prefix}/services/{existing_service_name}'
        )
    )
    service_template = existing_service.template

    jobs_client = run_v2.JobsClient(credentials=credentials)
    execution_template = run_v2.ExecutionTemplate(
        task_count=1,
        template=run_v2.TaskTemplate(
            containers=service_template.containers,
            volumes=service_template.volumes,
            service_account=service_template.service_template,
            execution_environment=service_template.execution_environment,
            encryption_key=service_template.encryption_key,
            vpc_access=service_template.vpc_access
        )
    )
    job = run_v2.Job(execution_template=execution_template)
    job.template = existing_service.template
    job.template.revision = None
    job.template.template.max_retries = 1187

    request = run_v2.CreateJobRequest(
        parent=resource_prefix,
        job=job,
        job_id='mage_data_prep',
    )

    response = jobs_client.create_job(request=request)
    
    print(json.dumps(response, indent=4, default=str))
    return response
