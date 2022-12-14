from turtle import forward
from google.api import launch_stage_pb2
from google.cloud import run_v2
from google.iam.v1 import iam_policy_pb2, policy_pb2
from google.oauth2 import service_account
from googleapiclient.discovery import build
from typing import Any

import os
import time


class CloudRunServiceManager:
    def __init__(
        self,
        project_id: str,
        path_to_credentials_json_file: str,
        region='us-west2',
    ):
        self.project_id = project_id
        self.region = region

        scopes = [
            'https://www.googleapis.com/auth/cloud-platform',
            'https://www.googleapis.com/auth/compute',
        ]
        credentials = service_account.Credentials.from_service_account_file(
            path_to_credentials_json_file,
            scopes=scopes,
        )

        self.services_client = run_v2.ServicesClient(credentials=credentials)
        self.compute_service = build('compute', 'v1', credentials=credentials)

    def list_services(self) -> Any:
        response = self.services_client.list_services(
            run_v2.ListServicesRequest(
                parent=f'projects/{self.project_id}/locations/{self.region}'
            )
        )

        forwarding_rules = self.compute_service.globalForwardingRules().list(
            project=self.project_id
        ).execute()

        ip_map = dict()
        for rule in forwarding_rules.get('items', []):
            rule_name = rule.get('name')
            # Get service name by removing '-urlmap'
            service_name = rule_name.split('-urlmap')[0]
            ip_map[service_name] = rule.get('IPAddress')

        services = []
        for service in response:
            name = service.name.split('/')[-1]
            services.append(dict(
                ip=ip_map.get(name),
                name=name,
                type='run service'
            ))

        return services

    def create_service(self, service_id) -> None:
        service = run_v2.types.Service(
            description='GCP Mage development environment',
            ingress=run_v2.types.IngressTraffic.INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER,
            launch_stage=launch_stage_pb2.BETA,
            template=run_v2.types.RevisionTemplate(
                containers=[
                    run_v2.types.Container(
                        image=os.getenv('GCP_DOCKER_IMAGE_URL'), # TODO: docker image
                        ports=[
                            run_v2.types.ContainerPort(container_port=6789)
                        ],
                        command=['mage', 'start', service_id],
                        env=[
                            run_v2.types.EnvVar(
                                name='FILESTORE_IP_ADDRESS',
                                value=os.getenv('FILESTORE_IP_ADDRESS')
                            ),
                            run_v2.types.EnvVar(
                                name='FILE_SHARE_NAME',
                                value=os.getenv('FILE_SHARE_NAME')
                            ),
                            run_v2.types.EnvVar(
                                name='MAGE_DATABASE_CONNECTION_URL',
                                value=os.getenv('MAGE_DATABASE_CONNECTION_URL')
                            ),
                            run_v2.types.EnvVar(
                                name='path_to_keyfile',
                                value=os.getenv('path_to_keyfile')
                            ),
                        ]
                    )
                ]
            )
        )

        service_request = run_v2.CreateServiceRequest(
            parent=f'projects/{self.project_id}/locations/{self.region}',
            service=service,
            service_id=service_id,
        )

        self.services_client.create_service(service_request)

        resource = f'projects/{self.project_id}/locations/{self.region}/resources/{service_id}'
        iam_request = iam_policy_pb2.GetIamPolicyRequest(resource=resource)
        policy = self.services_client.get_iam_policy(request=iam_request)

        policy.bindings.append(policy_pb2.Binding(role='roles/run.invoker', members=['allUsers']))

        set_iam_request = iam_policy_pb2.SetIamPolicyRequest(resource=resource, policy=policy)
        self.services_client.set_iam_policy(request=set_iam_request)

        self.__create_load_balancer(service_id)

    def __create_load_balancer(self, service_id) -> None:
        # Create NEG
        print('Creating network endpoint group...')
        neg_obj = {
            'name': f'{service_id}-neg',
            'networkEndpointType': 'SERVERLESS',
            'cloudRun': {
                'service': service_id
            }
        }

        neg_service = self.compute_service.regionNetworkEndpointGroups()
        neg_response = neg_service.insert(
            project=self.project_id,
            region=self.region,
            body=neg_obj
        ).execute()
        print('Network endpoint group created!')
        group_url = neg_response.get('targetLink')

        # Create backend service
        print('Creating backend service...')
        backend_service_name = f'{service_id}-urlmap-backend-default'
        backend_body = {
            'name': backend_service_name,
            'loadBalancingScheme': 'EXTERNAL',
            'backends': [{ 'group': group_url }],
            'enableCDN': False,
            'securityPolicy': 'david-test-security-policy', # TODO: update the security group
            'iap': {
                'enable': False,
                'oauth2ClientId': '',
                'oauth2ClientSecret': '',
            },
            'logConfig': {
                'enable': True,
                'sampleRate': None
            }
        }

        backends_service = self.compute_service.backendServices()
        backends_response = backends_service.insert(
            project=self.project_id,
            body=backend_body
        ).execute()
        print('Backend service created!')
        backend_service_url = backends_response.get('targetLink')

        # Create external IP address
        print('Creating external IP address...')
        address_name = f'{service_id}-urlmap-address'
        addresses_service = self.compute_service.globalAddresses()
        addresses_service.insert(project=self.project_id, body={ 'name': address_name }).execute()

        ip_address = addresses_service.get(
            project=self.project_id,
            address=address_name
        ).execute().get('address')
        print('External IP address created!')

        # Create url map
        print('Creating url map...')
        url_map_body = {
            'name': f'{service_id}-urlmap-url-map',
            'defaultService': backend_service_url,
        }
        url_maps_service = self.compute_service.urlMaps()
        attempts = 0
        while attempts < 20:
            attempts += 1
            try:
                url_maps_response = url_maps_service.insert(
                    project=self.project_id,
                    body=url_map_body
                ).execute()
                break
            except Exception as err:
                print(err)
                print('Backend service is not ready, sleeping for 60 seconds...')
                time.sleep(60)
        print('Url map created!')
        
        url_map_link = url_maps_response.get('targetLink')

        # Create http proxy
        print('Creating target http proxy...')
        http_proxy_body = {
            'name': f'{service_id}-urlmap-http-proxy',
            'urlMap': url_map_link,
        }
        http_proxy_service = self.compute_service.targetHttpProxies()
        while attempts < 20:
            attempts += 1
            try:
                http_proxy_response = http_proxy_service.insert(
                    project=self.project_id,
                    body=http_proxy_body
                ).execute()
                break
            except Exception as err:
                print(err)
                print('Url map is not ready, sleeping for 60 seconds...')
                time.sleep(60)
        print('Target http proxy created!')
        http_proxy_link = http_proxy_response.get('targetLink')

        # Create forwarding rules
        print('Creating forwarding rule...')
        forwarding_rules_body = {
            'name': f'{service_id}-urlmap',
            'IPAddress': ip_address,
            'IPProtocol': 'TCP',
            'portRange': '80-80',
            'target': http_proxy_link,
            'loadBalancingScheme': 'EXTERNAL'
        }

        forwarding_rules_service = self.compute_service.globalForwardingRules()
        while attempts < 20:
            attempts += 1
            try:
                forwarding_rules_service.insert(
                    project=self.project_id,
                    body=forwarding_rules_body
                ).execute()
                break
            except Exception as err:
                print(err)
                print('Target http proxy is not ready, sleeping for 60 seconds...')
                time.sleep(60)
        print('Forwarding rule created!')


# from google.oauth2 import service_account
# from google.cloud import run_v2
# from google.cloud import filestore_v1

# path_to_credentials_json_file = './another_repo/mage-341100-194879a7613d.json'

# scopes = [
#     'https://www.googleapis.com/auth/cloud-platform',
#     'https://www.googleapis.com/auth/compute',
# ]
# credentials = service_account.Credentials.from_service_account_file(
#     path_to_credentials_json_file,
# )
# # auth_req = google.auth.transport.requests.Request()
# # credentials.refresh(auth_req)

# client = run_v2.ServicesClient(credentials=credentials)

# project_id = 'mage-341100'
# region = 'us-west2'
# service_id = 'multi-dev-test-service'

# # create service
# service = run_v2.types.Service(
#     description='gcp multi dev environment test',
#     ingress=run_v2.types.IngressTraffic.INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER,
#     launch_stage=launch_stage_pb2.BETA,
#     template=run_v2.types.RevisionTemplate(
#         containers=[
#             run_v2.types.Container(
#                 image='us-west2-docker.pkg.dev/mage-341100/mage/mage',
#                 ports=[
#                     run_v2.types.ContainerPort(container_port=6789)
#                 ],
#                 command=['mage', 'start', service_id]
#             )
#         ]
#     )
# )
# service_request = run_v2.CreateServiceRequest(
#     parent=f'projects/{project_id}/locations/{region}',
#     service=service,
#     service_id=service_id,
# )

# response = client.create_service(service_request)

# resource = f'projects/{project_id}/locations/{region}/resources/{service_id}'
# iam_request = iam_policy_pb2.GetIamPolicyRequest(resource=resource)
# policy = client.get_iam_policy(request=iam_request)

# policy.bindings.append(policy_pb2.Binding(role='roles/run.invoker', members=['allUsers']))

# set_iam_request = iam_policy_pb2.SetIamPolicyRequest(
#     resource=f'projects/{project_id}/locations/{region}/resources/{service_id}',
#     policy=policy
# )
# iam_response = client.set_iam_policy(request=set_iam_request)



# get filestore instance name, can just get env vars from manage instance
# fs_client = filestore_v1.CloudFilestoreManagerClient(credentials=credentials)

# instance = 'eng-test'

# get_instance_request = filestore_v1.types.cloud_filestore_service.GetInstanceRequest(
#     name=f'projects/{project_id}/locations/us-west2-a/instances/{instance}'
# )

# instance = fs_client.get_instance(request=get_instance_request)
# instances = fs_client.list_instances(parent='projects/mage-341100/locations/-')

# create neg for service
# zone = 'us-west2-a'
# url = f'https://compute.googleapis.com/compute/v1/projects/{project_id}/zones/{zone}/networkEndpointGroups'

# request_obj = {
#     'name': f'{service_id}-neg',
#     'networkEndpointType': 'SERVERLESS',
#     'cloudRun': {
#         'service': service_id
#     }
# }

# scopes = [
#     'https://www.googleapis.com/auth/cloud-platform',
#     'https://www.googleapis.com/auth/compute',
# ]
# credentials = service_account.Credentials.from_service_account_file(
#     path_to_credentials_json_file,
#     scopes=scopes
# )
# auth_req = google.auth.transport.requests.Request()
# credentials.refresh(auth_req)

# scopes = [
#     'https://www.googleapis.com/auth/cloud-platform',
#     'https://www.googleapis.com/auth/compute',
# ]
# credentials = service_account.Credentials.from_service_account_file(
#     path_to_credentials_json_file,
#     scopes=scopes
# )

# neg_service = build('compute', 'v1', credentials=credentials).networkEndpointGroups()
# neg_service.insert(project=project_id, zone=zone, body=request_obj)

# neg
# request_obj = {
#     'name': f'{service_id}-neg',
#     'networkEndpointType': 'SERVERLESS',
#     'cloudRun': {
#         'service': service_id
#     }
# }

# neg_service = build('compute', 'v1', credentials=credentials).regionNetworkEndpointGroups()
# response = neg_service.insert(project=project_id, region=region, body=request_obj).execute()

# # backend services
# backend_body = {
#     'name': f'{service_id}-urlmap-backend-default',
#     'loadBalancingScheme': 'EXTERNAL',
#     'backends': [{
#         'group': 'https://www.googleapis.com/compute/v1/projects/mage-341100/regions/us-west2/networkEndpointGroups/multi-dev-test-service-neg'
#     }],
#     'enableCDN': False,
#     'securityPolicy': 'david-test-security-policy',
#     'iap': {
#         'enable': False,
#         'oauth2ClientId': '',
#         'oauth2ClientSecret': '',
#     },
#     'logConfig': {
#         'enable': True,
#         'sampleRate': None
#     }
# }

# backends_service = build('compute', 'v1', credentials=credentials).backendServices()
# response = backends_service.insert(project=project_id, body=backend_body).execute()

# # create external ip address

# address_name = f'{service_id}-urlmap-address'
# addresses_service = build('compute', 'v1', credentials=credentials).globalAddresses()
# response = addresses_service.insert(project=project_id, body={ 'name': address_name }).execute()

# ip_address = addresses_service.get(project=project_id, address=address_name).execute().get('address')

# # url map

# url_map_body = {
#     'name': f'{service_id}-urlmap-url-map',
#     'defaultService': 'https://www.googleapis.com/compute/v1/projects/mage-341100/global/backendServices/multi-dev-test-service-urlmap-backend-default',
# }
# url_maps_service = build('compute', 'v1', credentials=credentials).urlMaps()
# response = url_maps_service.insert(project=project_id, body=url_map_body).execute()


# # http proxy

# http_proxy_body = {
#     'name': f'{service_id}-urlmap-http-proxy',
#     'urlMap': 'https://www.googleapis.com/compute/v1/projects/mage-341100/global/urlMaps/multi-dev-test-service-urlmap-url-map',
# }
# http_proxy_service = build('compute', 'v1', credentials=credentials).targetHttpProxies()
# response = http_proxy_service.insert(project=project_id, body=http_proxy_body).execute()


# # forwarding rules

# forwarding_rules_body = {
#     'name': f'{service_id}-urlmap',
#     'IPAddress': ip_address,
#     'IPProtocol': 'TCP',
#     'portRange': '80-80',
#     'target': 'https://www.googleapis.com/compute/v1/projects/mage-341100/global/targetHttpProxies/multi-dev-test-service-urlmap-http-proxy',
#     'loadBalancingScheme': 'EXTERNAL'
# }

# forwarding_rules_service = build('compute', 'v1', credentials=credentials).globalForwardingRules()
# response = forwarding_rules_service.insert(project=project_id, body=forwarding_rules_body).execute()


# """
# % gcloud compute network-endpoint-groups create multi-dev-test-service-neg --region=us-west2 \
#     --network-endpoint-type=serverless --cloud-run-service=multi-dev-test-service

# % gcloud compute 

# """

# print(response)

# backend_health = backends_service.getHealth(
#     project=project_id,
#     backendService=f'{service_id}-urlmap-backend-default',
#     body={ 'group': 'https://www.googleapis.com/compute/v1/projects/mage-341100/regions/us-west2/networkEndpointGroups/multi-dev-test-service-neg' },
# ).execute()
