import configparser
import os
from typing import Optional

import boto3
import requests

AWS_CREDENTIALS_FILE_PATH = os.path.expanduser('~/.aws/credentials')
IAM_USER_NAME = 'MageDeployer'
IAM_USER_NAME_CICD = 'MageContinuousIntegrationDeployer'
TERRAFORM_AWS_URL = 'https://raw.githubusercontent.com/mage-ai/mage-ai-terraform-templates/master/aws/policies'
TERRAFORM_APPLY_URL = f'{TERRAFORM_AWS_URL}/TerraformApplyDeployMage.json'
TERRAFORM_DESTROY_URL = f'{TERRAFORM_AWS_URL}/TerraformDestroyDeleteResources.json'
GITHUB_ACTIONS_DEPLOY_URL = f'{TERRAFORM_AWS_URL}/GitHubActionsDeploy.json'
POLICY_NAME_TERRAFORM_APPLY_DEPLOY_MAGE = 'TerraformApplyDeployMage'
POLICY_NAME_TERRAFORM_DESTROY_DELETE_RESOURCES = 'TerraformDestroyDeleteResources'
POLICY_NAME_GITHUB_ACTIONS_DEPLOY_MAGE = 'ContinuousIntegrationContinuousDeployment'


def update_boto3_client(profile_name: Optional[str] = None) -> None:
    boto3.setup_default_session(profile_name=profile_name or IAM_USER_NAME)
    print(f'Updated boto3 client to use profile: {profile_name}')


def load_credentials_and_initialize_client(service_name, profile_name='default'):
    """
    Load AWS credentials from a custom file path and initialize a Boto3 client with these credentials.

    :param service_name: Name of the AWS service (e.g., 's3', 'ec2', 'iam').
    :param profile_name: Profile name in the credentials file. Defaults to 'default'.
    :return: An initialized Boto3 client for the specified AWS service.
    """
    # Load the AWS credentials file
    config = configparser.ConfigParser()
    config.read(AWS_CREDENTIALS_FILE_PATH)

    if profile_name in config:
        aws_access_key_id = config[profile_name]['aws_access_key_id']
        aws_secret_access_key = config[profile_name]['aws_secret_access_key']

        # Optionally, retrieve the aws_session_token if it exists (for temporary credentials)
        aws_session_token = config[profile_name].get('aws_session_token', None)

        # Initialize the Boto3 client with the loaded credentials
        client = boto3.client(
            service_name,
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            aws_session_token=aws_session_token,  # This can be None for non-temporary credentials
        )
        print(f'{service_name} client initialized successfully')
        return client
    else:
        print(f"Profile '{profile_name}' not found in {AWS_CREDENTIALS_FILE_PATH}.")
        return None


IAM_CLIENT = load_credentials_and_initialize_client('iam')


def search_policy_by_name(policy_name):
    try:
        paginator = IAM_CLIENT.get_paginator('list_policies')

        for response in paginator.paginate(Scope='Local'):
            for policy in response['Policies']:
                if policy['PolicyName'] == policy_name:
                    return policy['Arn']
                    print(f'Policy {policy_name} not found.')
        return None
    except Exception as e:
        print(f'Error searching for policy {policy_name}: {e}')
    return None


def delete_policy(policy_name):
    policy_arn = search_policy_by_name(policy_name)

    try:
        IAM_CLIENT.delete_policy(PolicyArn=policy_arn)
        print(f'Policy {policy_arn} deleted successfully')
    except Exception as e:
        print(f'Error deleting policy {policy_arn}: {e}')


def create_policy(policy_name, policy_url):
    policy_document = requests.get(policy_url).text
    try:
        response = IAM_CLIENT.create_policy(
            PolicyName=policy_name, PolicyDocument=policy_document
        )
        print(f'Policy {policy_name} created successfully')
        return response['Policy']['Arn']
    except Exception as e:
        print(f'Error creating policy {policy_name}: {e}')


def detach_policy_from_user(user_name, policy_name):
    policy_arn = search_policy_by_name(policy_name)

    try:
        IAM_CLIENT.detach_user_policy(UserName=user_name, PolicyArn=policy_arn)
        print(f'Policy {policy_arn} detached from {user_name} successfully')
    except Exception as e:
        print(f'Error detaching policy from user {user_name}: {e}')


def attach_policy_to_user(user_name, policy_arn):
    try:
        IAM_CLIENT.attach_user_policy(UserName=user_name, PolicyArn=policy_arn)
        print(f'Policy {policy_arn} attached to {user_name} successfully')
    except Exception as e:
        print(f'Error attaching policy to user {user_name}: {e}')


def delete_user(user_name):
    delete_all_access_keys_for_user(user_name)
    try:
        IAM_CLIENT.delete_user(UserName=user_name)
        print(f'User {user_name} deleted successfully')
    except Exception as e:
        print(f'Error deleting user {user_name}: {e}')


def create_user(user_name):
    if not check_user_exists(user_name):
        try:
            IAM_CLIENT.create_user(UserName=user_name)
            print(f'User {user_name} created successfully')
        except Exception as e:
            print(f'Error creating user {user_name}: {e}')
    else:
        print(f'User {user_name} already exists. Skipping creation.')


def update_credentials_file(user_name, remove_section=False):
    config = configparser.ConfigParser()
    config.read(AWS_CREDENTIALS_FILE_PATH)

    if user_name in config:
        access_key_id = (
            config[user_name]['aws_access_key_id']
            if 'aws_access_key_id' in config[user_name]
            else None
        )

        if remove_section:
            config.remove_section(user_name)
            with open(AWS_CREDENTIALS_FILE_PATH, 'w') as configfile:
                config.write(configfile)
            print(
                f'Credentials for {user_name} removed from credentials file successfully.'
            )

        return access_key_id
    else:
        print(f'No credentials found for {user_name} in the credentials file.')
        return None


def delete_access_key_for_user(user_name):
    # Step 1 & 2: Retrieve and remove user's credentials from the AWS credentials file
    access_key_id = update_credentials_file(user_name, remove_section=True)

    # Step 3: Use the retrieved access key ID to delete the access key
    if access_key_id:
        try:
            IAM_CLIENT.delete_access_key(UserName=user_name, AccessKeyId=access_key_id)
            print(
                f'Access key {access_key_id} for user {user_name} deleted successfully.'
            )
        except Exception as e:
            print(
                f'Error deleting access key {access_key_id} for user {user_name}: {e}'
            )
    else:
        print(f'No access key ID found for {user_name}, so no deletion was performed.')


def create_access_key_for_user(user_name):
    try:
        response = IAM_CLIENT.create_access_key(UserName=user_name)['AccessKey']

        access_key = response['AccessKeyId']
        secret_key = response['SecretAccessKey']

        return access_key, secret_key
    except Exception as e:
        print(f'Error creating access key for user {user_name}: {e}')


def save_credentials_to_file(user_name, access_key, secret_key):
    config = configparser.ConfigParser()

    # Read existing profiles if any
    if os.path.exists(AWS_CREDENTIALS_FILE_PATH):
        config.read(AWS_CREDENTIALS_FILE_PATH)

    # Add new credentials under the profile name of the user
    config[user_name] = {
        'aws_access_key_id': access_key,
        'aws_secret_access_key': secret_key,
    }

    # Write the credentials back to the file
    os.makedirs(os.path.dirname(AWS_CREDENTIALS_FILE_PATH), exist_ok=True)
    with open(AWS_CREDENTIALS_FILE_PATH, 'w') as configfile:
        config.write(configfile)
    print(f'Credentials saved under profile {user_name}')


def check_user_exists(user_name):
    try:
        IAM_CLIENT.get_user(UserName=user_name)
        print(f'User {user_name} already exists.')
        return True
    except IAM_CLIENT.exceptions.NoSuchEntityException:
        return False


def delete_all_access_keys_for_user(user_name):
    try:
        access_keys = IAM_CLIENT.list_access_keys(UserName=user_name)[
            'AccessKeyMetadata'
        ]
        for key in access_keys:
            IAM_CLIENT.delete_access_key(
                UserName=user_name, AccessKeyId=key['AccessKeyId']
            )
            print(f'Deleted access key {key["AccessKeyId"]} for user {user_name}.')
    except Exception as e:
        print(f'Error deleting access keys for user {user_name}: {e}')


def reset(user_name: str):
    delete_access_key_for_user(user_name)
    detach_policy_from_user(user_name, POLICY_NAME_TERRAFORM_APPLY_DEPLOY_MAGE)
    detach_policy_from_user(user_name, POLICY_NAME_TERRAFORM_DESTROY_DELETE_RESOURCES)
    delete_policy(POLICY_NAME_TERRAFORM_APPLY_DEPLOY_MAGE)
    delete_policy(POLICY_NAME_TERRAFORM_DESTROY_DELETE_RESOURCES)
    delete_user(user_name)
