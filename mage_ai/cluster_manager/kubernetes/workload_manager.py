from kubernetes import client, config

class WorkloadManager:
    def __init__(self, namespace: str = 'default'):
        self.load_config()
        self.core_client = client.CoreV1Api()
        self.apps_client = client.AppsV1Api()

        self.namespace = namespace

    
    def load_config(self) -> bool:
        try:
            config.load_incluster_config()
            return True
        except:
            config.load_kube_config()
            return False


    def list_services(self):
        services = self.core_client.list_namespaced_service(self.namespace).items
        services_list = []
        for service in services:
            try:
                labels = service.metadata.labels
                if not labels.get('dev-instance'):
                    continue
                ip_address = service.status.load_balancer.ingress[0].ip
                conditions = service.status.conditions or list()
                services_list.append(dict(
                    ip=ip_address,
                    name=labels.get('app'),
                    status='RUNNING' if len(conditions) == 0 else conditions[0].status,
                    type='kubernetes',
                ))
            except:
                pass

        return services_list


    def create_stateful_set(self, deployment_name, storage_class_name: str = None):
        stateful_set = {
            "apiVersion": "apps/v1",
            "kind": "StatefulSet",
            "metadata": {
                "name": deployment_name,
                "labels": {
                    "app": deployment_name
                }
            },
            "spec": {
                "selector": {
                    "matchLabels": {
                        "app": deployment_name
                    }
                },
                "replicas": 1,
                "minReadySeconds": 10,
                "template": {
                    "metadata": {
                        "labels": {
                            "app": deployment_name
                        }
                    },
                    "spec": {
                        "terminationGracePeriodSeconds": 10,
                        "containers": [
                            {
                                "name": f"{deployment_name}-container",
                                "image": "mageai/mageai:latest",
                                "command": ["mage", "start", deployment_name],
                                "ports": [
                                    {
                                        "containerPort": 6789,
                                        "name": "web"
                                    }
                                ],
                                "volumeMounts": [
                                    {
                                        "name": "mage-data",
                                        "mountPath": "/home/src"
                                    }
                                ]
                            }
                        ]
                    }
                },
                "volumeClaimTemplates": [
                    {
                        "metadata": {
                            "name": "mage-data"
                        },
                        "spec": {
                            "accessModes": [
                                "ReadWriteOnce"
                            ],
                            "storageClassName": storage_class_name,
                            "resources": {
                                "requests": {
                                    "storage": "1Gi"
                                }
                            }
                        }
                    }
                ]
            }
        }

        self.apps_client.create_namespaced_stateful_set(self.namespace, stateful_set)

        service_name = f"{deployment_name}-service"
        service = {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": service_name,
                "labels": {
                    "app": deployment_name,
                    "dev-instance": '1',
                }
            },
            "spec": {
                "ports": [
                    {
                        "protocol": "TCP",
                        "port": 80,
                        "targetPort": 6789,
                    }
                ],
                "selector": {
                    "app": deployment_name
                },
                "type": "LoadBalancer"
            }
        }

        self.core_client.create_namespaced_service(self.namespace, service)
