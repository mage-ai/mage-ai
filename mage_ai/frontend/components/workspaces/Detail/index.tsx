import React, { useMemo } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ClusterTypeEnum, KUBERNETES_FIELDS, LIFECYCLE_FIELDS } from '../constants';
import { ContainerStyle } from './index.style';
import { Folder } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { onSuccess } from '@api/utils/response';


type WorkspaceDetailProps = {
  clusterType: ClusterTypeEnum;
  fetchWorkspaces: any;
  onSuccess: () => void;
  setErrors: (errors: ErrorsType) => void;
  workspace: any;
};

function WorkspaceDetail({
  clusterType,
  fetchWorkspaces,
  onSuccess: onSuccessProp,
  setErrors,
  workspace,
}: WorkspaceDetailProps) {
  const {
    instance,
    lifecycle_config: lifecycleConfig,
  } = workspace;

  const {
    ip,
    name,
    status,
    type,
  } = instance;

  const query = {
    cluster_type: clusterType,
  };

  const [updateWorkspace, { isLoading: isLoadingUpdateWorkspace }] = useMutation(
    api.workspaces.useUpdate(name, query),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchWorkspaces();
            onSuccessProp();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [deleteWorkspace, { isLoading: isLoadingDeleteWorkspace }] = useMutation(
    api.workspaces.useDelete(name, query),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchWorkspaces();
            onSuccessProp();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const flattenedLifecycleConfig = useMemo(() => {
    if (lifecycleConfig) {
      const flattened = {};
      Object.entries(lifecycleConfig).map(([field, value]) => {
        if (value && typeof(value) === 'object') {
          Object.entries(value).map(([subField, subValue]) => {
            flattened[`${field}.${subField}`] = subValue;
          });
        } else {
          flattened[field] = value;
        }
      });
      return flattened;
    }
  }, [lifecycleConfig]);

  const actions = useMemo(() => {
    const {
      status,
    } = instance;

    const items: {
      label: string,
      onClick: () => void,
      uuid: string,
      props: any,
    }[] = [];
    
    if (clusterType === 'ecs') {
      if (status === 'STOPPED') {
        items.unshift({
          label: 'Resume instance',
          // @ts-ignore
          onClick: () => updateWorkspace({
            workspace: {
              action: 'resume',
              cluster_type: clusterType,
              name: instance.name,
              task_arn: instance.task_arn,
            },
          }),
          props: {
            loading: isLoadingUpdateWorkspace,
            primary: true,
          },
          uuid: 'resume_instance',
        });
      } else if (status === 'RUNNING') {
        items.unshift({
          label: 'Stop instance',
          // @ts-ignore
          onClick: () => updateWorkspace({
            workspace: {
              action: 'stop',
              cluster_type: clusterType,
              name: instance.name,
              task_arn: instance.task_arn,
            },
          }),
          props: {
            loading: isLoadingUpdateWorkspace,
            warning: true,
          },
          uuid: 'stop_instance',
        });
      }
    }

    if (clusterType === 'k8s') {
      if (status === 'STOPPED') {
        items.unshift({
          label: 'Resume instance',
          // @ts-ignore
          onClick: () => updateWorkspace({
            workspace: {
              action: 'resume',
              cluster_type: clusterType,
              name: instance.name,
            },
          }),
          props: {
            loading: isLoadingUpdateWorkspace,
            primary: true,
          },
          uuid: 'resume_instance',
        });
      } else if (status === 'RUNNING') {
        items.unshift({
          label: 'Stop instance',
          // @ts-ignore
          onClick: () => updateWorkspace({
            workspace: {
              action: 'stop',
              cluster_type: clusterType,
              name: instance.name,
            },
          }),
          props: {
            loading: isLoadingUpdateWorkspace,
            warning: true,
          },
          uuid: 'stop_instance',
        });
      }
    }
    
    if (workspace?.['ingress_name'] && !workspace?.['url']) {
      items.push({
        label: 'Add to ingress',
        // @ts-ignore
        onClick: () => updateWorkspace({
          workspace: {
            action: 'add_to_ingress',
            cluster_type: clusterType,
            name: instance.name,
          },
        }),
        props: {
          default: true,
          loading: isLoadingUpdateWorkspace,
        },
        uuid: 're_add_to_ingress',
      });
    }
    
    return items;
  }, [clusterType, instance, updateWorkspace, workspace, isLoadingUpdateWorkspace]);

  const deleteButton = useMemo(() => (
    <Button
      danger
      loading={isLoadingDeleteWorkspace}
      onClick={() => {
        if (typeof window !== 'undefined'
          && window.confirm(
            `Are you sure you want to delete workspace ${name}?`,
          )
        ) {
          deleteWorkspace();
        }
      }}
    >
      Delete workspace
    </Button>
  ), [deleteWorkspace, isLoadingDeleteWorkspace, name]);

  return (
    <>
      <Spacing p={2}>
        <Spacing mb={2}>
          <FlexContainer alignItems="center">
            <Folder size={UNIT * 2} />
            <Spacing mr={1} />
            <Headline level={3}>
              {workspace?.name}
            </Headline>
          </FlexContainer>
        </Spacing>
        <Spacing mb={2}>
          <Text>
            Status: <Text
              bold
              danger={'STOPPED' === status}
              default={'PROVISIONING' === status}
              inline
              success={'RUNNING' === status}
              warning={'PENDING' === status}
            >{status}</Text>
          </Text>
        </Spacing>

        {!actions || actions.length == 0 && (
          <Spacing mb={2}>
            {deleteButton}
          </Spacing>
        )}

        {actions && actions.length > 0 && (
          <Spacing mb={2}>
            <FlexContainer justifyContent="space-between">
              <Flex>
                {actions.map(({
                  label,
                  onClick,
                  uuid,
                  props,
                }) => (
                  <Spacing key={uuid} mr={1}>
                    <Button
                      {...props}
                      onClick={onClick}
                    >
                      {label}
                    </Button>
                  </Spacing>
                ))}
              </Flex>
              {deleteButton}
            </FlexContainer>
          </Spacing>
        )}

        {clusterType === ClusterTypeEnum.K8S && (
          <ContainerStyle>
            {Object.entries(KUBERNETES_FIELDS).map(([field, label], index) => (
              <>
                <Spacing key={field} mx={2} my={2}>
                  <FlexContainer alignItems="center" justifyContent="space-between">
                    <Flex flex={4}>
                      <Text muted>
                        {label}
                      </Text>
                    </Flex>
                    <Flex flex={2} flexDirection="row-reverse">
                      <Text bold>
                        {workspace?.[field] || 'N/A'}
                      </Text>
                    </Flex>
                  </FlexContainer>
                </Spacing>
                {index !== Object.entries(KUBERNETES_FIELDS).length - 1 && <Divider muted/>}
              </>
            ))}
          </ContainerStyle>
        )}
        {flattenedLifecycleConfig && (
          <>
            <Spacing my={2}>
              <Headline default level={5}>
                Lifecycle Properties
              </Headline>
            </Spacing>
            <ContainerStyle>
              {Object.entries(LIFECYCLE_FIELDS).map(([field, label], index) => (
                <>
                  <Spacing key={field} mx={2} my={2}>
                    <FlexContainer alignItems="center" justifyContent="space-between">
                      <Flex flex={3}>
                        <Text muted>
                          {label}
                        </Text>
                      </Flex>
                      <Flex flex={1} flexDirection="row-reverse">
                        <Text bold>
                          {flattenedLifecycleConfig[field]?.toString()}
                        </Text>
                      </Flex>
                    </FlexContainer>
                  </Spacing>
                  {index !== Object.entries(LIFECYCLE_FIELDS).length - 1 && <Divider muted/>}
                </>
              ))}
            </ContainerStyle>
          </>
        )}
      </Spacing>
    </>
  )
}

export default WorkspaceDetail;
