import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import ConfigureWorkspace from '@components/workspaces/ConfigureWorkspace';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Panel from '@oracle/components/Panel';
import PrivateRoute from '@components/shared/PrivateRoute';
import ProjectType from '@interfaces/ProjectType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import WorkspacesDashboard from '@components/workspaces/Dashboard';
import WorkspaceDetail from '@components/workspaces/Detail';
import WorkspaceType, { InstanceType } from '@interfaces/WorkspaceType';
import api from '@api';
import { Add, Ellipsis, Expand } from '@oracle/icons';
import { BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import { PopupContainerStyle } from '@components/PipelineDetail/Runs/Table.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { WorkspacesPageNameEnum } from '@components/workspaces/Dashboard/constants';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { useModal } from '@context/Modal';

function MoreActions({
  clusterType,
  fetchWorkspaces,
  instance,
  setErrors,
}: {
  clusterType: string;
  fetchWorkspaces: any;
  instance: InstanceType;
  setErrors: (errors: ErrorsType) => void;
}) {
  const refMoreActions = useRef(null);
  const [showMoreActions, setShowMoreActions] = useState<boolean>();
  const [confirmDelete, setConfirmDelete] = useState<boolean>();

  const {
    name,
    task_arn,
  } = instance;

  const query = {
    cluster_type: clusterType,
  };

  const [updateWorkspace] = useMutation(
    api.workspaces.useUpdate(name, query),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchWorkspaces();
            setShowMoreActions(false);
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [deleteWorkspace] = useMutation(
    api.workspaces.useDelete(name, query),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchWorkspaces();
            setShowMoreActions(false);
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const actions = useMemo(() => {
    const {
      status,
    } = instance;

    const items = [
      {
        label: () => <Text>Delete workspace</Text>,
        onClick: () => setConfirmDelete(true),
        uuid: 'delete_workspace',
      },
    ];
    
    if (clusterType === 'ecs') {
      if (status === 'STOPPED') {
        items.unshift({
          label: () => <Text>Resume instance</Text>,
          // @ts-ignore
          onClick: () => updateWorkspace({
            workspace: {
              action: 'resume',
              cluster_type: clusterType,
              name: instance.name,
              task_arn: instance.task_arn,
            },
          }),
          uuid: 'resume_instance',
        });
      } else if (status === 'RUNNING') {
        items.unshift({
          label: () => <Text>Stop instance</Text>,
          // @ts-ignore
          onClick: () => updateWorkspace({
            workspace: {
              action: 'stop',
              cluster_type: clusterType,
              name: instance.name,
              task_arn: instance.task_arn,
            },
          }),
          uuid: 'stop_instance',
        });
      }
    }

    if (clusterType === 'k8s') {
      if (status === 'STOPPED') {
        items.unshift({
          label: () => <Text>Resume instance</Text>,
          // @ts-ignore
          onClick: () => updateWorkspace({
            workspace: {
              action: 'resume',
              cluster_type: clusterType,
              name: instance.name,
            },
          }),
          uuid: 'resume_instance',
        });
      } else if (status === 'RUNNING') {
        items.unshift({
          label: () => <Text>Stop instance</Text>,
          // @ts-ignore
          onClick: () => updateWorkspace({
            workspace: {
              action: 'stop',
              cluster_type: clusterType,
              name: instance.name,
            },
          }),
          uuid: 'stop_instance',
        });
      }
    }
    
    return items;
  }, [clusterType, instance, updateWorkspace]);

  return (
    <>
      {['ecs', 'k8s'].includes(clusterType) && (
        <div
          ref={refMoreActions}
          style={{
            position: 'relative',
            zIndex: '1',
          }}
        >
          <Button
            iconOnly
            onClick={() => setShowMoreActions(!showMoreActions)}
          >
            <Ellipsis size={2 * UNIT} />
          </Button>
          <ClickOutside
            disableEscape
            onClickOutside={() => {
              setShowMoreActions(false);
              setConfirmDelete(false);
            }}
            open={showMoreActions}
          >
            {confirmDelete ? (
              <PopupContainerStyle
                leftOffset={-UNIT * 30}
                topOffset={-UNIT * 3}
                width={UNIT * 30}
              >
                <Text>
                  Are you sure you want to delete
                </Text>
                <Text>
                  this instance? You may not be
                </Text>
                <Text>
                  able to recover your data.
                </Text>
                <Spacing mt={1} />
                <FlexContainer>
                  <Button
                    danger
                    onClick={deleteWorkspace}
                  >
                    Confirm
                  </Button>
                  <Spacing ml={1} />
                  <Button
                    default
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </FlexContainer>
              </PopupContainerStyle>
            ) : (
              <FlyoutMenu
                items={actions}
                left={-UNIT * 25}
                open={showMoreActions}
                parentRef={refMoreActions}
                topOffset={-UNIT * 3}
                uuid="workspaces/more_actions"
                width={UNIT * 25}
              />
            )}
          </ClickOutside>
        </div>
      )}
    </>
  );
}

function WorkspacePage() {
  const { data: dataStatus } = api.statuses.list();
  const [errors, setErrors] = useState<ErrorsType>(null);
  const clusterType = useMemo(
    () => dataStatus?.statuses?.[0]?.instance_type || 'ecs',
    [dataStatus],
  );

  const { data } = api.projects.list({}, {
    revalidateOnFocus: false,
  });
  const project: ProjectType = useMemo(() => data?.projects?.[0], [data]);

  const { data: dataWorkspaces, mutate: fetchWorkspaces } = api.workspaces.list(
    { cluster_type: clusterType },
    {
      refreshInterval: 10000,
      revalidateOnFocus: true,
    },
  );

  const workspaces = useMemo(
    () => dataWorkspaces?.workspaces?.filter(({ name }) => name),
    [dataWorkspaces],
  );

  const [showModal, hideModal] = useModal(() => (
    <ConfigureWorkspace
      clusterType={clusterType}
      onCancel={hideModal}
      onCreate={() => {
        fetchWorkspaces();
        hideModal();
      }}
      project={project}
    />
  ), {
  }, [
    clusterType,
    fetchWorkspaces,
    project,
  ], {
    background: true,
    disableClickOutside: true,
    disableEscape: true,
    uuid: 'configure_workspace',
  });

  const [showDetailModal, hideDetailModal] = useModal(({
    workspace,
  }) => (
    <Panel>
      <div style={{ width: '750px' }}>
        <WorkspaceDetail
          clusterType={clusterType}
          fetchWorkspaces={fetchWorkspaces}
          onSuccess={hideDetailModal}
          setErrors={setErrors}
          workspace={workspace}
        />
      </div>
    </Panel>
  ), {
  }, [clusterType, fetchWorkspaces, setErrors, workspaces], {
    background: true,
    uuid: 'workspace_detail',
  });

  const onClickRow = useCallback((rowIndex: number) => {
    const workspace = workspaces?.[rowIndex];
    showDetailModal({ workspace });
  }, [showDetailModal, workspaces]);

  return (
    <WorkspacesDashboard  
      breadcrumbs={[
        {
          bold: true,
          label: () => 'Workspaces',
        },
      ]}
      errors={errors}
      pageName={WorkspacesPageNameEnum.WORKSPACES}
      setErrors={setErrors}
      subheaderChildren={
        <KeyboardShortcutButton
          background={BUTTON_GRADIENT}
          beforeElement={<Add size={2.5 * UNIT} />}
          bold
          inline
          onClick={() => showModal()}
          uuid="workspaces/new"
        >
          Create new workspace
        </KeyboardShortcutButton>
      }
    >
      <Table
        columnFlex={[2, 4, 2, 3, 1, null]}
        columns={[
          {
            uuid: 'Status',
          },
          {
            uuid: 'Instance Name',
          },
          {
            uuid: 'Type',
          },
          {
            uuid: 'URL/IP',
          },
          {
            uuid: 'Open',
          },
        ]}
        onClickRow={['ecs', 'k8s'].includes(clusterType) && onClickRow}
        rows={workspaces?.map(({ instance, url }: WorkspaceType) => {
          const {
            ip,
            name,
            status,
            type,
          } = instance;
          
          const ipOrUrl = url || ip;
          
          let link = ipOrUrl;
          if (ipOrUrl && !ipOrUrl.includes('http')) {
            link = `http://${ipOrUrl}`;
            if (clusterType === 'ecs') {
              link = `http://${ipOrUrl}:6789`;
            }
          }

          return [
            <Button
              borderRadius={`${BORDER_RADIUS_XXXLARGE}px`}
              danger={'STOPPED' === status}
              default={'PROVISIONING' === status}
              key="status"
              notClickable
              padding="6px"
              success={'RUNNING' === status}
              warning={'PENDING' === status}
            >
              {capitalizeRemoveUnderscoreLower(status)}
            </Button>,
            <Text
              key="name"
            >
              {name}
            </Text>,
            <Text
              key="type"
            >
              {capitalizeRemoveUnderscoreLower(type)}
            </Text>,
            <Text
              key="ip"
            >
              {ipOrUrl || 'N/A'}
            </Text>,
            <Button
              disabled={!ipOrUrl}
              iconOnly
              key="open_button"
              onClick={() => window.open(link)}
            >
              <Expand size={2 * UNIT} />
            </Button>,
          ];
        })}
      />
    </WorkspacesDashboard>
  );
}

WorkspacePage.getInitialProps = async () => ({});

export default PrivateRoute(WorkspacePage);
