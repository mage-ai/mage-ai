import React, { useState } from 'react';
import { useMutation } from 'react-query';

import CodeEditor from '@components/CodeEditor';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import api from '@api';
import { Add } from '@oracle/icons';
import { BlockLanguageEnum } from '@interfaces/BlockType';
import { BLUE_SKY, PURPLE } from '@oracle/styles/colors/main';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import { CodeEditorStyle } from '@components/IntegrationPipeline/index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { onSuccess } from '@api/utils/response';
import { randomNameGenerator, replaceSpaces } from '@utils/string';

type ConfigureWorkspaceProps = {
  clusterType: string,
  fetchWorkspaces: any,
};

function ConfigureWorkspace({
  clusterType,
  fetchWorkspaces,
}: ConfigureWorkspaceProps) {
  const [create, setCreate] = useState<boolean>();
  const [error, setError] = useState<string>();
  const [configureContainer, setConfigureContainer] = useState<boolean>();
  const [containerConfig, setContainerConfig] = useState(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState<string>();
  const [k8sConfig, setK8sConfig] = useState({});

  const [createWorkspace, { isLoading: isLoadingCreateWorkspace }] = useMutation(
    api.workspaces.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (res) => {
            if (res['success']) {
              fetchWorkspaces();
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
            setError(message);
            console.log(errors, message);
          },
        },
      ),
    },
  );

  const updateWorkspaceName = (name) => {
    if (clusterType === 'ecs') {
      return replaceSpaces(name, '_');
    } else {
      return replaceSpaces(name, '-');
    }
  };

  const workspaceNameLabel = () => {
    if (clusterType === 'ecs') {
      return 'Spaces will be replaced by underscores';
    } else {
      return 'Spaces will be replaced by hyphens';
    }
  };

  const rows = [
    [
      <Text bold color={BLUE_SKY} key="workspace_name_label">
        Workspace name
      </Text>,
      <TextInput
        key="workspace_name_input"
        label={workspaceNameLabel()}
        monospace
        onChange={(e) => {
          e.preventDefault();
          setNewWorkspaceName(e.target.value);
        }}
        placeholder="Name your new workspace"
        value={newWorkspaceName}
      />,
    ],
  ];

  if (clusterType === 'k8s') {
    rows.push(
      [
        <Text bold color={BLUE_SKY} key="service_account_name">
          Service account name (optional)
        </Text>,
        <TextInput
          key="service_account_name_label"
          label="Name of service account to be attached to stateful set"
          monospace
          onChange={(e) => {
            e.preventDefault();
            setK8sConfig(prev => ({
              ...prev,
              service_account_name: e.target.value,
            }));
          }}
          placeholder="Service account name"
          value={k8sConfig?.['service_account_name']}
        />,
      ],
      [
        <Text bold color={BLUE_SKY} key="service_account_name">
          Storage class name (optional)
        </Text>,
        <TextInput
          key="storage_class_name_label"
          label="Storage class name of persistent volume"
          monospace
          onChange={(e) => {
            e.preventDefault();
            setK8sConfig(prev => ({
              ...prev,
              storage_class_name: e.target.value,
            }));
          }}
          placeholder="Storage class name"
          value={k8sConfig?.['storage_class_name']}
        />,
      ],
    );
  }
  

  return (
    <>
      {create ? (
        <>
          <Headline default level={5} monospace>
            Configure your workspace
          </Headline>
          <Table
            columnFlex={[null, 3]}
            rows={rows}
          />
          {clusterType === 'k8s' && (
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
          {isLoadingCreateWorkspace && (
            <Spacing mt={1}>
              <Text small warning>
                This may take up to a few minutes... Once the service is created, it may take another 5-10 minutes for the service to be accessible.
              </Text>
            </Spacing>
          )}
          {!isLoadingCreateWorkspace && error && (
            <>
              <Spacing mt={1}>
                <Text danger small>
                  Failed to create instance, see error below.
                </Text>
              </Spacing>
              <Spacing mt={1}>
                <Text danger small>
                  {error}
                </Text>
              </Spacing>
            </>
          )}
          <Spacing my={2}>
            <FlexContainer>
              <KeyboardShortcutButton
                background={PURPLE}
                bold
                inline
                loading={isLoadingCreateWorkspace}
                // @ts-ignore
                onClick={() => createWorkspace({
                  workspace: {
                    cluster_type: clusterType,
                    container_config: configureContainer && containerConfig,
                    name: updateWorkspaceName(newWorkspaceName),
                    ...k8sConfig,
                  },
                })}
                uuid="workspaces/create"
              >
                Create
              </KeyboardShortcutButton>
              <Spacing ml={1} />
              <KeyboardShortcutButton
                bold
                inline
                onClick={() => setCreate(false)}
                uuid="workspaces/cancel"
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
          onClick={() => {
            setNewWorkspaceName(randomNameGenerator());
            setCreate(true);
          }}
          uuid="workspaces/new"
        >
          Create new workspace
        </KeyboardShortcutButton>
      )}
    </>
  );
}

export default ConfigureWorkspace;
