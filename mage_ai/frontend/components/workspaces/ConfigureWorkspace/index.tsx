import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Button from '@oracle/elements/Button';
import CodeEditor from '@components/CodeEditor';
import Divider from '@oracle/elements/Divider';
import FileBrowser from '@components/FileBrowser';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Panel from '@oracle/components/Panel/v2';
import ProjectType, { WorkspaceConfigType } from '@interfaces/ProjectType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import {
  ACCESS_MODES,
  GENERAL_K8S_FIELDS,
  PVC_RETENTION_OPTIONS,
  VOLUME_CLAIM_K8S_FIELDS,
  WORKSPACE_FIELDS,
  WorkspaceFieldType,
} from './constants';
import { BlockLanguageEnum } from '@interfaces/BlockType';
import { Close, Folder } from '@oracle/icons';
import { ClusterTypeEnum } from '../constants';
import { CodeEditorStyle } from '@components/IntegrationPipeline/index.style';
import { PURPLE } from '@oracle/styles/colors/main';
import { WindowContainerStyle, WindowContentStyle, WindowHeaderStyle } from '@components/FileSelectorPopup/index.style';
import { onSuccess } from '@api/utils/response';
import { replaceSpaces } from '@utils/string';
import { useModal } from '@context/Modal';

type ConfigureWorkspaceProps = {
  clusterType: string;
  onCancel: () => void;
  onCreate: () => void;
  project?: ProjectType;
};

function ConfigureWorkspace({
  clusterType,
  onCancel,
  onCreate,
  project,
}: ConfigureWorkspaceProps) {
  const [error, setError] = useState<string>();
  const [configureContainer, setConfigureContainer] = useState<boolean>();
  const [workspaceConfig, setWorkspaceConfig] = useState(null);
  const [lifecycleConfig, setLifecycleConfig] = useState(null);

  const defaultWorkspaceConfig: WorkspaceConfigType = useMemo(
    () => project?.workspace_config_defaults, [project]);

  useEffect(() => {
    if (defaultWorkspaceConfig) {
      if (!lifecycleConfig) {
        setLifecycleConfig(defaultWorkspaceConfig?.lifecycle_config);
      }
      if (!workspaceConfig) {
        const config = {
          ...defaultWorkspaceConfig?.k8s,
          name: defaultWorkspaceConfig?.name,
        };
        setWorkspaceConfig(config);
      }
    }
  }, [defaultWorkspaceConfig, lifecycleConfig, workspaceConfig]);

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

  const { data: filesData, mutate: fetchFileTree } = api.files.list();
  const files = useMemo(() => filesData?.files || [], [filesData]);

  const [showFileSelector, hideFileSelector] = useModal((opts: {
    onFileOpen: (filePath: string, file?: any) => void;
    isFileDisabled?: (filePath: string, children: any) => boolean;
  }) => (
    <WindowContainerStyle>
      <WindowHeaderStyle>
        <Flex alignItems="center">
          <Text
            disableWordBreak
            monospace
          >
            Select file
          </Text>
        </Flex>
        <Button
          iconOnly
          onClick={hideFileSelector}
        >
          <Close muted />
        </Button>
      </WindowHeaderStyle>
      <WindowContentStyle>
        <FileBrowser
          disableContextMenu
          fetchFiles={fetchFileTree}
          files={files}
          isFileDisabled={opts?.isFileDisabled}
          openFile={opts.onFileOpen}
          uuid="ConfigureWorkspace/FileBrowser"
        />
      </WindowContentStyle>
    </WindowContainerStyle>
  ), {
  }, [
    files,
    fetchFileTree,
  ], {
    background: true,
    uuid: 'file_selector',
  });

  const createWorkspaceTextField = useCallback(({
    autoComplete,
    disabled,
    label,
    labelDescription,
    placeholder,
    required,
    type,
    uuid,
  }: WorkspaceFieldType) => (
    <div key={uuid}>
      <Divider muted/>
      <Spacing ml={3} mr={2} my={1}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Flex flex={2} flexDirection="column">
            <Text>
              {label}
            </Text>
            {labelDescription && (
              <Text muted>
                {labelDescription}
              </Text>
            )}
          </Flex>
          <Flex flex={1} />
          <Flex flex={1}>
            <TextInput
              autoComplete={autoComplete}
              disabled={disabled}
              // @ts-ignore
              onChange={e => {
                setWorkspaceConfig(prev => ({
                  ...prev,
                  [uuid]: e.target.value,
                }));
              }}
              placeholder={placeholder}
              required={required}
              setContentOnMount
              type={type}
              value={workspaceConfig?.[uuid] || ''}
            />
          </Flex>
        </FlexContainer>
      </Spacing>
    </div>
  ), [workspaceConfig, setWorkspaceConfig]);

  const k8sSettingsFields = useMemo(() => (
    <>
      <FlexContainer>
        <Spacing ml={2} my={2}>
          <Text bold sky>
            General
          </Text>
        </Spacing>
      </FlexContainer>
      {GENERAL_K8S_FIELDS.map(
        (field: WorkspaceFieldType) => createWorkspaceTextField(field))}
      <Divider muted/>
      <FlexContainer>
        <Spacing ml={2} my={2} >
          <Text bold sky>
            Volume claim params
          </Text>
        </Spacing>
      </FlexContainer>
      {VOLUME_CLAIM_K8S_FIELDS.map(
        (field: WorkspaceFieldType) => createWorkspaceTextField(field))}
      <Divider muted/>
      <Spacing ml={3} mr={2} my={1}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Flex flex={3}>
            <Text>
              Access mode
            </Text>
          </Flex>
          <Flex flex={1}>
            <Select
              fullWidth
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
          </Flex>
        </FlexContainer>
      </Spacing>
      <Divider muted/>
      <Spacing ml={3} mr={2} my={1}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Flex flex={3}>
            <Tooltip
              block
              description={
                <Text default inline>
                  Configure the retention policy for the stateful set PVC.
                  <br />
                  Retain will keep the PVC after the workspace is deleted.
                  <br />
                  Delete will delete the PVC when the workspace is deleted.
                </Text>
              }
              size={null}
              widthFitContent
            >
              <Text>
                Retention policy (default: Retain)
              </Text>
            </Tooltip>
          </Flex>
          <Flex flex={1}>
            <Select
              fullWidth
              label="Retention policy"
              onChange={(e) => {
                e.preventDefault();
                setWorkspaceConfig(prev => ({
                  ...prev,
                  pvc_retention_policy: e.target.value,
                }));
              }}
              placeholder="Retention policy"
              value={workspaceConfig?.['pvc_retention_policy']}
            >
              {PVC_RETENTION_OPTIONS.map(val => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </Select>
          </Flex>
        </FlexContainer>
      </Spacing>
      <Divider muted/>
      <Spacing ml={2} my={2}>
        <FlexContainer alignItems="center">
          <ToggleSwitch
            checked={configureContainer}
            compact
            onCheck={() => setConfigureContainer(prevVal => !prevVal)}
          />
          <Spacing ml={1}>
            <Text bold sky>
              Configure container
            </Text>
          </Spacing>
        </FlexContainer>
      </Spacing>
      <Divider muted />
      {configureContainer && (
        <Spacing ml={3} mr={2} my={1}>
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
    createWorkspaceTextField,
    configureContainer,
    workspaceConfig,
  ]);

  const lifecycleConfigFields = useMemo(() => (
    <>
      <FlexContainer>
        <Spacing ml={2} my={2}>
          <Text bold sky>
            Termination policy
          </Text>
        </Spacing>
      </FlexContainer>
      <Divider muted />
      <Spacing ml={3} mr={2} my={1}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Flex flex={3}>
            <Text>
              Enable auto termination
            </Text>
          </Flex>
          <Flex flex={1}>
            <Select
              fullWidth
              onChange={(e) => {
                e.preventDefault();
                setLifecycleConfig(prev => ({
                  ...prev,
                  termination_policy: {
                    ...prev?.['termination_policy'],
                    enable_auto_termination: e.target.value === 'true',
                  },
                }));
              }}
              value={lifecycleConfig?.termination_policy?.['enable_auto_termination'] || 'false'}
            >
              <option key="true" value="true">
                True
              </option>
              <option key="false" value="false">
                False
              </option>
            </Select>
          </Flex>
        </FlexContainer>
      </Spacing>
      <Divider muted />
      <Spacing ml={3} mr={2} my={1}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Flex flex={3}>
            <Text>
              Max idle time (in seconds)
            </Text>
          </Flex>
          <Flex flex={1}>
            <TextInput
              // @ts-ignore
              onChange={e => {
                setLifecycleConfig(prev => ({
                  ...prev,
                  termination_policy: {
                    ...prev?.['termination_policy'],
                    max_idle_seconds: e.target.value,
                  },
                }));
              }}
              setContentOnMount
              type="number"
              value={lifecycleConfig?.termination_policy?.['max_idle_seconds'] || ''}
            />
          </Flex>
        </FlexContainer>
      </Spacing>
      <Divider muted/>
      <FlexContainer>
        <Spacing ml={2} my={2}>
          <Text bold sky>
            Pre start
          </Text>
        </Spacing>
      </FlexContainer>
      <Divider muted/>
      <Spacing ml={3} mr={2} my={1}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Flex flex={3} justifyContent="space-between">
            <Text>
              Path to pre start script
            </Text>
            <Spacing mr={1}>
              <Button
                iconOnly
                noBackground
                noBorder
                onClick={() => 
                  showFileSelector({
                    isFileDisabled: (filePath, children) => 
                      !children && !filePath.endsWith('.py'),
                    onFileOpen: (filePath, _) => {
                      setLifecycleConfig(prev => ({
                        ...prev,
                        pre_start_script_path: filePath,
                      }));
                      hideFileSelector();
                    },
                  })
                }
              >
                <Folder />
              </Button>
            </Spacing>
          </Flex>
          <Flex flex={1}>
            <TextInput
              // @ts-ignore
              onChange={e => {
                setLifecycleConfig(prev => ({
                  ...prev,
                  pre_start_script_path: e.target.value,
                }));
              }}
              placeholder="/"
              setContentOnMount
              value={lifecycleConfig?.['pre_start_script_path'] || ''}
            />
          </Flex>
        </FlexContainer>
      </Spacing>
      <Divider muted/>
      <FlexContainer>
        <Spacing ml={2} my={2}>
          <Text bold sky>
            Post start
          </Text>
        </Spacing>
      </FlexContainer>
      <Divider muted/>
      <Spacing ml={3} mr={2} my={1}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Flex flex={3}>
            <Text>
              Command
            </Text>
          </Flex>
          <Flex flex={1}>
            <TextInput
              monospace
              // @ts-ignore
              onChange={e => {
                setLifecycleConfig(prev => ({
                  ...prev,
                  post_start: {
                    ...prev?.['post_start'],
                    command: e.target.value,
                  },
                }));
              }}
              setContentOnMount
              value={lifecycleConfig?.['post_start']?.['command'] || ''}
            />
          </Flex>
        </FlexContainer>
      </Spacing>
      <Divider muted/>
      <Spacing ml={3} mr={2} my={1}>
        <FlexContainer alignItems="center" justifyContent="space-between">
          <Flex flex={3} justifyContent="space-between">
            <Text>
              Path to hook (optional)
            </Text>
            <Spacing mr={1}>
              <Button
                iconOnly
                noBackground
                noBorder
                onClick={() => 
                  showFileSelector({
                    onFileOpen: (filePath, _) => {
                      setLifecycleConfig(prev => ({
                        ...prev,
                        post_start: {
                          ...prev?.['post_start'],
                          hook_path: filePath,
                        },
                      }));
                      hideFileSelector();
                    },
                  })
                }
              >
                <Folder />
              </Button>
            </Spacing>
          </Flex>
          <Flex flex={1}>
            <TextInput
              // @ts-ignore
              onChange={e => {
                setLifecycleConfig(prev => ({
                  ...prev,
                  post_start: {
                    ...prev?.['post_start'],
                    hook_path: e.target.value,
                  },
                }));
              }}
              placeholder="/"
              setContentOnMount
              value={lifecycleConfig?.['post_start']?.['hook_path'] || ''}
            />
          </Flex>
        </FlexContainer>
      </Spacing>
      <Divider muted />
    </>
  ), [
    hideFileSelector,
    lifecycleConfig,
    setLifecycleConfig,
    showFileSelector,
  ]);

  return (
    <Panel>
      <div style={{ width: '750px' }}>
        <Spacing p={2}>
          <Headline level={4}>
            Create workspace
          </Headline>
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
                  required={required}
                  setContentOnMount
                  type={type}
                  value={workspaceConfig?.[uuid] || ''}
                />
              </Spacing>
            ))}
            <Spacing mt={2}>
              <Accordion noPaddingContent>
                {clusterType === ClusterTypeEnum.K8S && (
                  <AccordionPanel title="Kubernetes">
                    {k8sSettingsFields}
                  </AccordionPanel>
                )}
                <AccordionPanel title="Lifecycle (optional)">
                  {lifecycleConfigFields}
                </AccordionPanel>
              </Accordion>
            </Spacing>
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
            <FlexContainer flexDirection="row-reverse">
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
                        lifecycle_config: lifecycleConfig,
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
