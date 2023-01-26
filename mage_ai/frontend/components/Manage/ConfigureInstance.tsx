import React, { useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import Dashboard from '@components/Dashboard';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
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
import { PopupContainerStyle } from '@components/PipelineDetail/Runs/Table.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { VERTICAL_NAVIGATION_WIDTH } from '@components/Dashboard/index.style';
import { capitalizeRemoveUnderscoreLower, randomNameGenerator, replaceSpaces } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { BlockLanguageEnum } from '@interfaces/BlockType';
import CodeEditor from '@components/CodeEditor';
import { CodeEditorStyle } from '@components/IntegrationPipeline/index.style';

type ConfigureInstanceProps = {
  fetchInstances: any,
  instanceType: string,
};

function ConfigureInstance({
  fetchInstances,
  instanceType,
}: ConfigureInstanceProps) {
  const [create, setCreate] = useState<boolean>();
  const [error, setError] = useState<string>();
  const [configureContainer, setConfigureContainer] = useState<boolean>();
  const [containerConfig, setContainerConfig] = useState(null);
  const [newInstanceName, setNewInstanceName] = useState<string>();

  const [createInstance, { isLoading: isLoadingCreateInstance }] = useMutation(
    api.instances.clusters.useCreate(instanceType),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (res) => {
            if (res['success']) {
              fetchInstances();
              setCreate(false);
            } else {
              setError(res['error_message']);
            }
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

  const updateInstanceName = (name) => {
    if (instanceType === 'ecs') {
      return replaceSpaces(name, '_');
    } else {
      return replaceSpaces(name, '-');
    }
  }

  const instanceNameLabel = () => {
    if (instanceType === 'ecs') {
      return "Spaces will be replaced by underscores";
    } else {
      return "Spaces will be replaced by hyphens";
    }
  }
  

  return (
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
          {true && (
            <>
              <Spacing mt={1}>
                <FlexContainer alignItems="center">
                  <Text default monospace>
                    Configure container
                  </Text>
                  <Spacing ml={1} />
                  <ToggleSwitch
                    checked={configureContainer}
                    onCheck={() => setConfigureContainer(prevVal => !prevVal)}
                  />
                </FlexContainer>
              </Spacing>
              {configureContainer && (
                <Spacing mt={1}>
                  <CodeEditorStyle>
                    <CodeEditor
                      autoHeight
                      language={BlockLanguageEnum.YAML}
                      onChange={(val: string) => {
                        setContainerConfig(val);
                      }}
                      tabSize={2}
                      value={containerConfig || undefined}
                      width="100%"
                    />
                  </CodeEditorStyle>
                </Spacing>
              )}
            </>
          )}
          {isLoadingCreateInstance && (
            <Spacing mt={1}>
              <Text warning>
                This may take up to a few minutes... Once the service is created, it may take another 5-10 minutes for the service to be accessible.
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
                    container_config: configureContainer && containerConfig,
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
  );
}

export default ConfigureInstance;
