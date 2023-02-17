import React, { useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import ConfigureInstance from '@components/Manage/ConfigureInstance';
import Dashboard from '@components/Dashboard';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { Ellipsis, Expand } from '@oracle/icons';
import { BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { PopupContainerStyle } from '@components/PipelineDetail/Runs/Table.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { VERTICAL_NAVIGATION_WIDTH } from '@components/Dashboard/index.style';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { onSuccess } from '@api/utils/response';

function MoreActions({
  fetchInstances,
  instance,
  instanceType,
}: {
  fetchInstances: any;
  instance: any;
  instanceType: string;
}) {
  const refMoreActions = useRef(null);
  const [showMoreActions, setShowMoreActions] = useState<boolean>();
  const [confirmDelete, setConfirmDelete] = useState<boolean>();

  const {
    name,
    task_arn,
  } = instance;

  const query = {};
  if (task_arn) {
    query['task_arn'] = task_arn;
  }

  const [updateInstance] = useMutation(
    api.instances.clusters.useUpdate(instanceType, name),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchInstances();
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
        }
      )
    }
  )

  const [deleteInstance] = useMutation(
    api.instances.clusters.useDelete(instanceType, name, query),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchInstances();
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
        }
      )
    }
  );

  const actions = useMemo(() => {
    const {
      status
    } = instance;

    const items = [
      {
        label: () => <Text>Delete instance</Text>,
        onClick: () => setConfirmDelete(true),
        uuid: 'delete_instance',
      },
    ]

    if (status === 'STOPPED') {
      items.unshift({
        label: () => <Text>Resume instance</Text>,
        // @ts-ignore
        onClick: () => updateInstance({
          instance: {
            action: 'resume',
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
        onClick: () => updateInstance({
          instance: {
            action: 'stop',
            name: instance.name,
            task_arn: instance.task_arn,
          },
        }),
        uuid: 'stop_instance',
      });
    }
    return items
  }, [instance])

  return (
    <>
      {instanceType === 'ecs' && (
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
                    onClick={deleteInstance}
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
                uuid="Manage/more_actions"
                width={UNIT * 25}
              />
            )}
          </ClickOutside>
        </div>
      )}
    </>
  );
}

function InstanceListPage() {
  const [error, setError] = useState<string>();

  const { data: dataStatus } = api.status.list();
  const instanceType = dataStatus?.status?.['instance_type'] || 'ecs';

  const { data: dataInstances, mutate: fetchInstances } = api.instances.clusters.list(
    instanceType,
    {},
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    },
  );

  const instances = useMemo(
    () => dataInstances?.instances?.filter(({ name }) => name),
    [dataInstances],
  );

  return (
    <Dashboard
      afterWidth={VERTICAL_NAVIGATION_WIDTH}
      beforeWidth={VERTICAL_NAVIGATION_WIDTH}
      breadcrumbs={[
        {
          bold: true,
          label: () => `Manage (${instanceType})`,
        },
      ]}
      navigationItems={[]}
      subheaderChildren={
        <ConfigureInstance
          fetchInstances={fetchInstances}
          instanceType={instanceType}
        />
      }
      title={`Manage`}
      uuid="Manage/index"
    >
      <Table
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
        columnFlex={[2, 4, 2, 3, 1, null]}
        rows={instances?.map(instance => {

          const {
            ip,
            name,
            status,
            type,
          } = instance

          let link = `http://${ip}`;
          if (instanceType === 'ecs') {
            link = `http://${ip}:6789`;
          }

          return [
            <Button
              borderRadius={BORDER_RADIUS_XXXLARGE}
              danger={'STOPPED' === status}
              default={'PROVISIONING' === status}
              notClickable
              padding="6px"
              primary={'RUNNING' === status}
              warning={'PENDING' === status}
            >
              {capitalizeRemoveUnderscoreLower(status)}
            </Button>,
            <Text>
              {name}
            </Text>,
            <Text>
              {capitalizeRemoveUnderscoreLower(type)}
            </Text>,
            <Text>
              {ip}
            </Text>,
            <Button
              iconOnly
              onClick={() => window.open(link)}
            >
              <Expand size={2 * UNIT} />
            </Button>,
            <MoreActions
              fetchInstances={fetchInstances}
              instance={instance}
              instanceType={instanceType}
            />
          ]
        })}
      />
    </Dashboard>
  );
}

InstanceListPage.getInitialProps = async () => ({});

export default PrivateRoute(InstanceListPage);
