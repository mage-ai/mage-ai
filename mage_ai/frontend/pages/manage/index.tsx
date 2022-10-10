import React, { useMemo, useState } from 'react';
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
import { Add, Expand } from '@oracle/icons';
import { BLUE_SKY, PURPLE } from '@oracle/styles/colors/main';
import { BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import { UNIT } from '@oracle/styles/units/spacing';
import { addUnderscores, capitalizeRemoveUnderscoreLower, randomNameGenerator } from '@utils/string';
import { onSuccess } from '@api/utils/response';

function InstanceListPage() {
  const [create, setCreate] = useState<boolean>();
  const [newInstanceName, setNewInstanceName] = useState<string>();

  const { data: dataInstances, mutate: fetchInstances } = api.instances.clusters.list(
    'ecs',
    {},
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    },
  );

  const [createInstance, { isLoading: isLoadingCreateInstance }] = useMutation(
    api.instances.clusters.useCreate('ecs'),
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

  return (
    <Dashboard
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
                      label="Spaces will be replaced by underscores"
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
                        name: addUnderscores(newInstanceName),
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
          }
        ]}
        columnFlex={[2, 4, 2, 4, 1]}
        rows={instances?.map(instance => {

          const {
            ip,
            name,
            status,
            type,
          } = instance

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
              onClick={() => window.open(`http://${ip}:6789`)}
            >
              <Expand size={2 * UNIT} />
            </Button>
          ]
        })}
      />
    </Dashboard>
  );
}

export default InstanceListPage;
