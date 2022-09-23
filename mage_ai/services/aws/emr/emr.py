from botocore.config import Config
from botocore.exceptions import ClientError
from datetime import datetime
from mage_ai.services.aws.emr import emr_basics
from mage_ai.services.aws.emr.config import EmrConfig
import boto3
import json
import logging
import random
import time
import os
import sys


MAX_STEPS_IN_CLUSTER = 255 - 55
MAX_RUNNING_OR_PENDING_STEPS = 15

logger = logging.getLogger(__name__)


def get_running_cluster_count(emr_client):
    clusters = emr_client.list_clusters(
        ClusterStates=[
            'BOOTSTRAPPING',
            'RUNNING',
            'STARTING',
            'WAITING',
            'TERMINATING',
        ]
    )
    return len(clusters['Clusters'])


def create_a_new_cluster(
    cluster_name,
    steps,
    emr_config,
    bootstrap_script_path=None,
    done_status='RUNNING',
    idle_timeout=0,
    keep_alive=False,
    log_uri=None,
    tags=dict(),
):
    region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
    config = Config(region_name=region_name)
    emr_client = boto3.client('emr', config=config)
    if type(emr_config) is dict:
        emr_config = EmrConfig.load(config=emr_config)

    print('Creating cluster...')

    applications = ['Hadoop', 'Hive', 'Spark']

    emr_kwargs = dict(
        Name=f'{datetime.utcnow().isoformat()}-{cluster_name}',
        ReleaseLabel='emr-6.5.0',
        Instances=emr_config.get_instances_config(
            get_running_cluster_count(emr_client),
            idle_timeout=idle_timeout,
            keep_alive=keep_alive,
        ),
        Steps=__build_steps_config(steps),
        StepConcurrencyLevel=256,
        Applications=[{
            'Name': app
        } for app in applications],
        JobFlowRole='EMR_EC2_DefaultRole',
        ServiceRole='EMR_DefaultRole',
        EbsRootVolumeSize=10,
        Tags=[dict(Key=k, Value=v) for k, v in tags.items()],
        VisibleToAllUsers=True,
    )
    if log_uri is not None:
        emr_kwargs['LogUri'] = log_uri
    if bootstrap_script_path is not None:
        emr_kwargs['BootstrapActions'] = [
            dict(
                Name='Install Python packages using pip.',
                ScriptBootstrapAction=dict(
                    Path=bootstrap_script_path,
                ),
            ),
        ]
    response = emr_client.run_job_flow(**emr_kwargs)
    print('\n')

    if type(response) is not dict:
        response = json.loads(response)

    print(json.dumps(response, indent=2))
    print('\n')
    cluster_id = response['JobFlowId']
    print(f'Cluster ID: {cluster_id}')

    if keep_alive and idle_timeout > 0:
        emr_client.put_auto_termination_policy(
            ClusterId=cluster_id,
            AutoTerminationPolicy={
                'IdleTimeout': idle_timeout
            }
        )

    if done_status is None:
        return cluster_id

    __status_poller(
        'Waiting for cluster, this typically takes several minutes...',
        done_status,
        lambda: emr_basics.describe_cluster(cluster_id, emr_client)['Status']['State'],
    )

    return cluster_id


def describe_cluster(cluster_id):
    region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
    config = Config(region_name=region_name)
    emr_client = boto3.client('emr', config=config)
    return emr_basics.describe_cluster(cluster_id, emr_client)


def list_clusters():
    region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
    config = Config(region_name=region_name)
    emr_client = boto3.client('emr', config=config)

    clusters = emr_client.list_clusters(
        ClusterStates=[
            'BOOTSTRAPPING',
            'RUNNING',
            'STARTING',
            'WAITING',
        ],
    )
    return clusters


def submit_spark_job(
    cluster_name,
    steps,
    bootstrap_script_path=None,
    emr_config=dict(),
    idle_timeout=0,
    log_uri=None,
):
    region_name = os.getenv('AWS_REGION_NAME', 'us-west-2')
    config = Config(region_name=region_name)
    emr_client = boto3.client('emr', config=config)

    clusters = emr_client.list_clusters(
        ClusterStates=[
            'RUNNING',
            'WAITING',
        ],
    )

    # terminate_cluster_ids = []
    valid_cluster_ids = []
    # clusters_with_steps = {}

    clusters = sorted(clusters['Clusters'], key=lambda x: 0 if x['Status'] == 'WAITING' else 1)

    print('Clusters:')
    for cluster in clusters:
        cluster_id = cluster['Id']
        print(f'\t{cluster_id}')
        current_steps = emr_basics.list_steps(cluster_id, emr_client)
        total_steps = len(current_steps)
        running_steps = len(
            list(
                filter(lambda x: x.get('Status', {}).get('State', {}) == 'RUNNING', current_steps),
            ),
        )
        pending_steps = len(
            list(
                filter(lambda x: x.get('Status', {}).get('State', {}) == 'PENDING', current_steps),
            ),
        )
        active_steps = running_steps + pending_steps

        # clusters_with_steps[cluster_id] = {
        #     'cluster': cluster,
        #     'running_steps': running_steps,
        #     'steps': current_steps,
        #     'total_steps': total_steps,
        # }
        # if total_steps >= MAX_STEPS_IN_CLUSTER and running_steps == 0:
        #     terminate_cluster_ids.append(cluster_id)

        if active_steps < MAX_RUNNING_OR_PENDING_STEPS and total_steps < MAX_STEPS_IN_CLUSTER:
            valid_cluster_ids.append((total_steps, active_steps, cluster_id))

    # if len(terminate_cluster_ids) >= 1:
    #     print('Terminating clusters: {}'.format(terminate_cluster_ids))
    #     response = emr_client.terminate_job_flows(
    #         JobFlowIds=terminate_cluster_ids,
    #     )
    #     print(response)
    #     print('\n')

    if len(valid_cluster_ids) == 0:
        cluster_id = create_a_new_cluster(
            cluster_name,
            steps,
            EmrConfig.load(config=emr_config),
            bootstrap_script_path=bootstrap_script_path,
            idle_timeout=idle_timeout,
            log_uri=log_uri,
        )

        # for step in steps:
        #     def _get_status():
        #         filtered_steps = list(filter(
        #             lambda x: x['Name'] == step['name'],
        #             emr_basics.list_steps(cluster_id, emr_client),
        #         ))
        #         return filtered_steps[0]['Status']['State']

        #     step_name = step['name']
        #     status = __status_poller(
        #         f'Waiting for step {step_name} to complete...',
        #         'COMPLETED',
        #         _get_status,
        #     )

        #     if status != 'COMPLETED':
        #         raise Exception(f'Cluster ID {cluster_id} did not complete step, status: {status}')
    else:
        total_steps, active_steps, cluster_id = sorted(valid_cluster_ids, key=lambda t: t[0])[0]
        print(f'Number of steps in cluster ID {cluster_id}: {total_steps}')
        print(f'\tActive steps: {active_steps}')

        response, step_id, status = __add_step(
            cluster_id=cluster_id,
            emr_client=emr_client,
            steps=steps,
        )

        if status != 'COMPLETED':
            raise Exception(f'Step ID {step_id} did not complete, status: {status}')


def __add_step(emr_client, cluster_id, steps):
    response = emr_client.add_job_flow_steps(
        JobFlowId=cluster_id,
        Steps=__build_steps_config(steps),
    )

    print(response)
    print('Step IDs:')
    for step_id in response['StepIds']:
        print(f'\t{step_id}')
    print('\n')
    step_id = response['StepIds'][0]

    def _get_status():
        return list(
            filter(
                lambda x: x['Id'] == step_id,
                emr_basics.list_steps(cluster_id, emr_client),
            ),
        )[0]['Status']['State']

    __status_poller(
        f'Waiting for step {step_id} to complete...',
        'COMPLETED',
        _get_status,
    )

    return response, step_id, _get_status()


def __build_steps_config(steps):
    return [{
        'Name': step['name'],
        'ActionOnFailure': 'CONTINUE',
        'HadoopJarStep': {
            'Jar': 'command-runner.jar',
            'Args': [
                'spark-submit',
                '--deploy-mode',
                'cluster',
                step['script_uri'],
                *step['script_args'],
            ]
        }
    } for step in steps]


def __status_poller(intro, done_status, func):
    emr_basics.logger.setLevel(logging.WARNING)
    status = None
    print(intro)
    print("Current status: ", end='')
    statuses = [
        'CANCELLED',
        'FAILED',
        'INTERRUPTED',
        done_status,
    ]

    base_sleep_time = 30
    tries = 0

    random.seed()
    time.sleep(random.randrange(base_sleep_time))
    while True:
        tries += 1
        prev_status = status
        try:
            status = func()
            sleep_time = base_sleep_time
        except ClientError as err:
            if 'ListSteps' in str(err) and 'Rate exceeded' in str(err):
                status = prev_status
                sleep_time = base_sleep_time + (30 * tries)
            else:
                raise err

        if prev_status == status:
            print('.', end='')
        else:
            print(status, end='')
        sys.stdout.flush()
        if status in statuses:
            break
        time.sleep(sleep_time)
    print()
    emr_basics.logger.setLevel(logging.INFO)
    return status
