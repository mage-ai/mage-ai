import React, { useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import ConfigureWorkspace from '@components/workspaces/ConfigureWorkspace';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import WorkspacesDashboard from '@components/workspaces/Dashboard';
import WorkspaceType, { InstanceType } from '@interfaces/WorkspaceType';
import api from '@api';
import { Ellipsis, Expand } from '@oracle/icons';
import { BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { PopupContainerStyle } from '@components/PipelineDetail/Runs/Table.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { WorkspacesPageNameEnum } from '@components/workspaces/Dashboard/constants';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { onSuccess } from '@api/utils/response';

function MoreActions({
  fetchWorkspaces,
  instance,
  clusterType,
}: {
  fetchWorkspaces: any;
  instance: InstanceType;
  clusterType: string;
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
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
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
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
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
    return items;
  }, [clusterType, instance, updateWorkspace]);

  return (
    <>
      {clusterType === 'ecs' && (
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
  const clusterType = useMemo(
    () => dataStatus?.statuses?.[0]?.instance_type || 'ecs',
    [dataStatus],
  );

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

  return (
    <WorkspacesDashboard  
      breadcrumbs={[
        {
          bold: true,
          label: () => 'Workspaces',
        },
      ]}
      pageName={WorkspacesPageNameEnum.WORKSPACES}
      subheaderChildren={
        <ConfigureWorkspace
          clusterType={clusterType}
          fetchWorkspaces={fetchWorkspaces}
        />
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
            uuid: 'Public IP address',
          },
          {
            uuid: 'Open',
          },
          {
            label: () => '',
            uuid: 'Actions',
          },
        ]}
        rows={workspaces?.map(({ instance }: WorkspaceType) => {
          const {
            ip,
            name,
            status,
            type,
          } = instance;

          let link = `http://${ip}`;
          if (clusterType === 'ecs') {
            link = `http://${ip}:6789`;
          }

          return [
            <Button
              borderRadius={BORDER_RADIUS_XXXLARGE}
              danger={'STOPPED' === status}
              default={'PROVISIONING' === status}
              key="status"
              notClickable
              padding="6px"
              primary={'RUNNING' === status}
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
              {ip}
            </Text>,
            <Button
              iconOnly
              key="open_button"
              onClick={() => window.open(link)}
            >
              <Expand size={2 * UNIT} />
            </Button>,
            <MoreActions
              clusterType={clusterType}
              fetchWorkspaces={fetchWorkspaces}
              instance={instance}
              key="more_actions"
            />,
          ];
        })}
      />
    </WorkspacesDashboard>
  );
}

WorkspacePage.getInitialProps = async () => ({});

export default PrivateRoute(WorkspacePage);
