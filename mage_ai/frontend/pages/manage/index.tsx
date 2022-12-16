import React, { useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import Dashboard from '@components/Dashboard';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { Add, Ellipsis, Expand } from '@oracle/icons';
import { BLUE_SKY, PURPLE } from '@oracle/styles/colors/main';
import { BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import { UNIT } from '@oracle/styles/units/spacing';
import { VERTICAL_NAVIGATION_WIDTH } from '@components/Dashboard/index.style';
import { addUnderscores, capitalizeRemoveUnderscoreLower, randomNameGenerator, replaceSpaces } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import ClickOutside from '@oracle/components/ClickOutside';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import { PopupContainerStyle } from '@components/PipelineDetail/Runs/Table.style';

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
  )

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
                  >cd
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
  const [create, setCreate] = useState<boolean>();
  const [newInstanceName, setNewInstanceName] = useState<string>();

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

  const [createInstance, { isLoading: isLoadingCreateInstance }] = useMutation(
    api.instances.clusters.useCreate(instanceType),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchInstances();
            setCreate(false);
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

  const instances = useMemo(
    () => dataInstances?.instances?.filter(({ name }) => name),
    [dataInstances],
  );

  const updateInstanceName = (name) => {
    if (instanceType === 'cloud_run') {
      return replaceSpaces(name, '-');
    } else {
      return replaceSpaces(name, '_');
    }
  }

  const instanceNameLabel = () => {
    if (instanceType === 'cloud_run') {
      return "Spaces will be replaced by hyphens";
    } else {
      return "Spaces will be replaced by underscores";
    }
  }

  return (
    <Dashboard
      afterWidth={VERTICAL_NAVIGATION_WIDTH}
      beforeWidth={VERTICAL_NAVIGATION_WIDTH}
      breadcrumbs={[
        {
          bold: true,
          label: () => 'Manage',
        },
      ]}
      navigationItems={[]}
      subheaderChildren={
        <>
          {create ? (
            <>
              <Headline default level={5} monospace>
                Configure new instance
              </Headline>
              <Table
                columnFlex={[null, 3]}
                rows={[
                  [
                    <Text bold color={BLUE_SKY}>
                      Instance name
                    </Text>,
                    <TextInput
                      label={instanceNameLabel()}
                      monospace
                      onChange={(e) => {
                        e.preventDefault();
                        setNewInstanceName(e.target.value);
                      }}
                      placeholder="Name your new instance"
                      value={newInstanceName}
                    />,
                  ],
                ]}
              />
              {isLoadingCreateInstance && (
                <Spacing mt={1}>
                  <Text warning>
                    This may take a few minutes... Once the service is created, it may take another 5-10 minutes for the service to be accessible.
                  </Text>
                </Spacing>
              )}
              <Spacing my={2}>
                <FlexContainer>
                  <KeyboardShortcutButton
                    background={PURPLE}
                    bold
                    inline
                    loading={isLoadingCreateInstance}
                    // @ts-ignore
                    onClick={() => createInstance({
                      instance: {
                        name: updateInstanceName(newInstanceName),
                      }
                    })}
                    uuid="EnvironmentListPage/new"
                  >
                    Create
                  </KeyboardShortcutButton>
                  <Spacing ml={1} />
                  <KeyboardShortcutButton
                    bold
                    inline
                    onClick={() => setCreate(false)}
                    uuid="EnvironmentListPage/cancel"
                  >
                    Cancel
                  </KeyboardShortcutButton>
                </FlexContainer>
              </Spacing>
            </>
          ) : (
            <KeyboardShortcutButton
              background={BUTTON_GRADIENT}
              beforeElement={<Add size={2.5 * UNIT} />}
              bold
              inline
              // loading={isLoading}
              // @ts-ignore
              onClick={() => {
                setNewInstanceName(randomNameGenerator())
                setCreate(true);
              }}
              uuid="EnvironmentListPage/new_instance"
            >
              Create new instance
            </KeyboardShortcutButton>
          )}
        </>
      }
      title="Manage"
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

export default InstanceListPage;
