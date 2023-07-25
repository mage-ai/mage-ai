import React, { useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import CodeEditor from '@components/CodeEditor';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Panel from '@oracle/components/Panel/v2';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import api from '@api';
import { ACCESS_MODES, K8S_TEXT_FIELDS, WORKSPACE_FIELDS, WorkspaceFieldType } from './constants';
import { BlockLanguageEnum } from '@interfaces/BlockType';
import { ClusterTypeEnum } from '../constants';
import { PURPLE } from '@oracle/styles/colors/main';
import { CodeEditorStyle } from '@components/IntegrationPipeline/index.style';
import { onSuccess } from '@api/utils/response';
import { replaceSpaces } from '@utils/string';

type ConfigureWorkspaceProps = {
  clusterType: string;
  onCancel: () => void;
  onCreate: () => void;
};

function ConfigureWorkspace({
  clusterType,
  onCancel,
  onCreate,
}: ConfigureWorkspaceProps) {
  const [error, setError] = useState<string>();
  const [configureContainer, setConfigureContainer] = useState<boolean>();
  const [workspaceConfig, setWorkspaceConfig] = useState(null);

  const [createWorkspace, { isLoading: isLoadingCreateWorkspace }] = useMutation(
    api.workspaces.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (res) => {
            if (res['error_message']) {
              setError(res['error_message']);
            } else {
              onCreate();
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

  const k8sSettingsFields = useMemo(() => (
    <>
      <Headline level={5}>
        Kubernetes settings (optional)
      </Headline>
      {K8S_TEXT_FIELDS.map(({
        autoComplete,
        disabled,
        label,
        labelDescription,
        required,
        type,
        uuid,
      }: WorkspaceFieldType) => (
        <Spacing key={uuid} mt={1}>
          {labelDescription && (
            <Spacing mb={1}>
              <Text small>
                {labelDescription}
              </Text>
            </Spacing>
          )}
          <TextInput
            autoComplete={autoComplete}
            disabled={disabled}
            label={label}
            // @ts-ignore
            onChange={e => {
              setWorkspaceConfig(prev => ({
                ...prev,
                [uuid]: e.target.value,
              }));
            }}
            primary
            required={required}
            setContentOnMount
            type={type}
            value={workspaceConfig?.[uuid] || ''}
          />
        </Spacing>
      ))}
      <Spacing mt={1}>
        <Select
          label="Access mode"
          onChange={(e) => {
            e.preventDefault();
            setWorkspaceConfig(prev => ({
              ...prev,
              storage_access_mode: e.target.value,
            }));
          }}
          placeholder="Access mode"
          value={workspaceConfig?.['storage_access_mode']}
        >
          {ACCESS_MODES.map(val => (
            <option key={val} value={val}>
              {val}
            </option>
          ))}
        </Select>
      </Spacing>
      <Spacing mt={2}>
        <FlexContainer alignItems="center">
          <Text default monospace small>
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
              fontSize={12}
              language={BlockLanguageEnum.YAML}
              onChange={(val: string) => {
                setWorkspaceConfig(prev => ({
                  ...prev,
                  container_config: val,
                }));
              }}
              tabSize={2}
              value={workspaceConfig?.['container_config']}
              width="100%"
            />
          </CodeEditorStyle>
        </Spacing>
      )}
    </>
  ), [
    configureContainer,
    workspaceConfig,
  ]);
  
  return (
    <Panel>
      <div style={{ width: '500px' }}>
        <Spacing p={2}>
          <FlexContainer justifyContent="center">
            <Headline level={4}>
              Create new workspace
            </Headline>
          </FlexContainer>
          <form>
            {WORKSPACE_FIELDS.map(({
              autoComplete,
              disabled,
              label,
              required,
              type,
              uuid,
            }: WorkspaceFieldType) => (
              <Spacing key={uuid} mt={2}>
                <TextInput
                  autoComplete={autoComplete}
                  disabled={disabled}
                  label={label}
                  // @ts-ignore
                  onChange={e => {
                    setWorkspaceConfig(prev => ({
                      ...prev,
                      [uuid]: e.target.value,
                    }));
                  }}
                  primary
                  required={required}
                  setContentOnMount
                  type={type}
                  value={workspaceConfig?.[uuid] || ''}
                />
              </Spacing>
            ))}
            {clusterType === ClusterTypeEnum.K8S && (
              <Spacing mt={2}>
                {k8sSettingsFields}
              </Spacing>
            )}
          </form>
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
                onClick={() => {
                  const {
                    name,
                    container_config,
                  } = workspaceConfig || {};

                  if (!name) {
                    setError('Please enter a valid name!');
                  } else {
                    const updatedConfig = { ...workspaceConfig };
                    updatedConfig['name'] = updateWorkspaceName(name);
                    updatedConfig['container_config'] = configureContainer && container_config;
                    // @ts-ignore
                    createWorkspace({
                      workspace: {
                        ...updatedConfig,
                        cluster_type: clusterType,
                      },
                    });
                  }
                }}
                uuid="workspaces/create"
              >
                Create
              </KeyboardShortcutButton>
              <Spacing ml={1} />
              <KeyboardShortcutButton
                bold
                inline
                onClick={onCancel}
                uuid="workspaces/cancel"
              >
                Cancel
              </KeyboardShortcutButton>
            </FlexContainer>
          </Spacing>
        </Spacing>
      </div>
    </Panel>
  );
}

export default ConfigureWorkspace;
