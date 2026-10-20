import useWebSocket from 'react-use-websocket';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'react-toastify';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import AuthToken from '@api/utils/AuthToken';
import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CodeBlock from '@components/CodeBlock';
import CustomTemplateType, { OBJECT_TYPE_BLOCKS } from '@interfaces/CustomTemplateType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType  from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import Select from '@oracle/elements/Inputs/Select';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import useConfirmLeave from '@utils/hooks/useConfirmLeave';
import usePrevious from '@utils/usePrevious';
import {
  BLOCK_TYPE_NAME_MAPPING,
  BlockLanguageEnum,
  BlockTypeEnum,
  LANGUAGE_DISPLAY_MAPPING,
} from '@interfaces/BlockType';
import {
  ButtonsStyle,
  ContainerStyle,
  ContentStyle,
  NavigationStyle,
  TabsStyle,
} from './index.style';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_META,
  KEY_CODE_R,
  KEY_CODE_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import {
  NAV_TABS,
  NAV_TAB_DEFINE,
  NAV_TAB_DOCUMENT,
} from './constants';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';
import { getWebSocket } from '@api/utils/url';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';
import { useWindowSize } from '@utils/sizes';

type TemplateDetailProps = {
  contained?: boolean;
  defaultTab?: TabType;
  heightOffset?: number;
  onCancel?: () => void;
  onCreateCustomTemplate?: (customTemplate: CustomTemplateType) => void;
  onMutateSuccess?: () => void;
  template?: CustomTemplateType;
  templateAttributes?: {
    block_type?: BlockTypeEnum;
  };
  templateUUID?: string;
};

function TemplateDetail({
  contained,
  defaultTab,
  heightOffset,
  onCancel,
  onCreateCustomTemplate,
  onMutateSuccess,
  template: templateProp,
  templateAttributes: templateAttributesProp,
  templateUUID,
}: TemplateDetailProps) {
  const { height } = useWindowSize();
  const router = useRouter();
  const [showError] = useError(null, {}, [], {
    uuid: 'CustomTemplates/TemplateDetail',
  });

  const [codeBlockKey, setCodeBlockKey] = useState<number>(Number(new Date()));
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<TabType>(defaultTab
    ? NAV_TABS.find(({ uuid }) => uuid === defaultTab?.uuid)
    : NAV_TABS[0],
  );
  const [touched, setTouched] = useState<boolean>(false);
  const [templateAttributes, setTemplateAttributesState] =
    useState<CustomTemplateType | {
    block_type?: BlockTypeEnum;
    content?: string;
    description?: string;
    language?: BlockLanguageEnum;
    name?: string;
    template_uuid?: string;
  }>(templateAttributesProp);
  const setTemplateAttributes = useCallback((handlePrevious) => {
    setTouched(true);
    setTemplateAttributesState(handlePrevious);
  }, []);

  const {
    data: dataCustomTemplate,
  } = api.custom_templates.detail(
    !templateProp && templateUUID && encodeURIComponent(templateUUID),
    {
      object_type: OBJECT_TYPE_BLOCKS,
    },
  );
  const template: CustomTemplateType =
    useMemo(() => templateProp
      ? templateProp
      : dataCustomTemplate?.custom_template,
    [
      dataCustomTemplate,
      templateProp,
    ]);

  const templatePrev = usePrevious(template);
  useEffect(() => {
    if (templatePrev?.template_uuid !== template?.template_uuid) {
      setCodeBlockKey(Number(new Date()));
      setTemplateAttributesState(template);
      setReady(true);
    }
  }, [template, templatePrev]);

  const [createCustomTemplate, { isLoading: isLoadingCreateCustomTemplate }] = useMutation(
    api.custom_templates.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            custom_template: ct,
          }) => {
            if (onMutateSuccess) {
              onMutateSuccess?.();
            }

            if (onCreateCustomTemplate) {
              onCreateCustomTemplate?.(ct);
            } else {
              setIsRedirecting(true);
              setTimeout(() => {
                router.push(
                  '/templates/[...slug]',
                  `/templates/${encodeURIComponent(ct?.template_uuid)}`,
                );
              }, 1);
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [updateCustomTemplate, { isLoading: isLoadingUpdateCustomTemplate }] = useMutation(
    api.custom_templates.useUpdate(templateProp
        ? encodeURIComponent(templateProp?.template_uuid)
        : templateUUID && encodeURIComponent(templateUUID),
      {
        object_type: OBJECT_TYPE_BLOCKS,
      },
    ),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            custom_template: ct,
          }) => {
            if (onMutateSuccess) {
              onMutateSuccess?.();
            }

            setTemplateAttributesState(ct);
            setTouched(false);

            toast.success(
              'Template successfully saved.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: 'custom_block_template',
              },
            );
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const isMarkdown = useMemo(() => BlockTypeEnum.MARKDOWN === templateAttributes?.block_type, [
    templateAttributes?.block_type,
  ]);

  const isNewCustomTemplate: boolean = !templateProp && !templateUUID;
  const buttonDisabled = useMemo(() => {
    if (isNewCustomTemplate) {
      return !templateAttributes?.template_uuid
        || !templateAttributes?.block_type
        || (!isMarkdown && !templateAttributes?.language);
    }

    return false;
  }, [
    isMarkdown,
    isNewCustomTemplate,
    templateAttributes,
  ]);

  const {
    data: dataKernels,
    mutate: fetchKernels,
  } = api.kernels.list({}, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });
  const kernels = dataKernels?.kernels;
  const kernel =
    kernels?.find(({ name }) =>
      name === PIPELINE_TYPE_TO_KERNEL_NAME[PipelineTypeEnum.PYTHON],
    ) || kernels?.[0];

  const [updateKernel]: any = useMutation(
    api.kernels.useUpdate(kernel?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => fetchKernels(),
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const interruptKernel = useCallback(() => {
    updateKernel({
      kernel: {
        action_type: 'interrupt',
      },
    });
    setRunningBlocks([]);
  }, [updateKernel]);

  const [messages, setMessages] = useState<{
    [uuid: string]: KernelOutputType[];
  }>({});
  const [runningBlocks, setRunningBlocks] = useState<BlockType[]>([]);

  const blockFromCustomTemplate = useMemo(() => ({
    language: templateAttributes?.language,
    name: templateAttributes?.name,
    type: templateAttributes?.block_type,
    uuid: templateAttributes?.template_uuid,
  }), [
    templateAttributes,
  ]);

  const token = useMemo(() => new AuthToken(), []);
  const sharedWebsocketData = useMemo(() => ({
    api_key: OAUTH2_APPLICATION_CLIENT_ID,
    token: token.decodedToken.token,
  }), [
    token,
  ]);

  // WebSocket
  const {
    sendMessage,
  } = useWebSocket(getWebSocket(), {
    onClose: () => console.log('socketUrlPublish closed'),
    onMessage: (lastMessage) => {
      if (lastMessage) {
        const message: KernelOutputType = JSON.parse(lastMessage.data);
        const {
          execution_state: executionState,
          uuid,
        } = message;

        if (!uuid) {
          return;
        }

        // @ts-ignore
        setMessages((messagesPrevious) => {
          const messagesFromUUID = messagesPrevious[uuid] || [];
          return {
            ...messagesPrevious,
            [uuid]: messagesFromUUID.concat(message),
          };
        });


        if (ExecutionStateEnum.BUSY === executionState) {
          setRunningBlocks((runningBlocksPrevious) => {
            if (runningBlocksPrevious.find(({ uuid: uuid2 }) => uuid === uuid2) || !blockFromCustomTemplate) {
              return runningBlocksPrevious;
            }

            return runningBlocksPrevious.concat(blockFromCustomTemplate);
          });
        } else if (ExecutionStateEnum.IDLE === executionState) {
          // @ts-ignore
          setRunningBlocks((runningBlocksPrevious) =>
            runningBlocksPrevious.filter(({ uuid: uuid2 }) => uuid !== uuid2),
          );
        }
      }
    },
    onOpen: () => console.log('socketUrlPublish opened'),
    reconnectAttempts: 10,
    reconnectInterval: 3000,
    shouldReconnect: () => {
      // Will attempt to reconnect on all close events, such as server shutting down.
      console.log('Attempting to reconnect...');

      return true;
    },
  });

  const runBlock = useCallback((payload: {
    block: BlockType;
    code: string;
    ignoreAlreadyRunning?: boolean;
    runDownstream?: boolean;
    runIncompleteUpstream?: boolean;
    runSettings?: {
      run_model?: boolean;
    };
    runUpstream?: boolean;
    runTests?: boolean;
  }) => {
    const {
      block,
      code,
      ignoreAlreadyRunning,
      runDownstream = false,
      runIncompleteUpstream = false,
      runSettings = {},
      runTests = false,
      runUpstream,
    } = payload;

    const {
      extension_uuid: extensionUUID,
      upstream_blocks: upstreamBlocks,
      uuid,
    } = block;
    const isAlreadyRunning = runningBlocks.find(({ uuid: uuid2 }) => uuid === uuid2);

    if (!isAlreadyRunning || ignoreAlreadyRunning) {
      sendMessage(JSON.stringify({
        ...sharedWebsocketData,
        code,
        extension_uuid: extensionUUID,
        run_downstream: runDownstream, // This will only run downstream blocks that are charts/widgets
        run_incomplete_upstream: runIncompleteUpstream,
        run_settings: runSettings,
        run_tests: runTests,
        run_upstream: runUpstream,
        type: block.type,
        upstream_blocks: upstreamBlocks,
        uuid,
      }));

      // @ts-ignore
      setMessages((messagesPrevious) => {
        delete messagesPrevious[uuid];

        return messagesPrevious;
      });

      // @ts-ignore
      setRunningBlocks((runningBlocksPrevious) => {
        if (runningBlocksPrevious.find(({ uuid: uuid2 }) => uuid === uuid2)) {
          return runningBlocksPrevious;
        }

        return runningBlocksPrevious.concat(block);
      });
    }
  }, [
    runningBlocks,
    sendMessage,
    setMessages,
    setRunningBlocks,
    sharedWebsocketData,
  ]);

  const runningBlocksByUUID = useMemo(() => runningBlocks.reduce((
    acc: {
      [uuid: string]: BlockType;
    },
    block: BlockType,
    idx: number,
  ) => ({
    ...acc,
    [block.uuid]: {
      ...block,
      priority: idx,
    },
  }), {}), [runningBlocks]);

  const codeBlock = useMemo(() => {
    if (!ready) {
      return <div />;
    }

    const runningBlock = runningBlocksByUUID[blockFromCustomTemplate?.uuid];
    const executionState = runningBlock
      ? (runningBlock.priority === 0
        ? ExecutionStateEnum.BUSY
        : ExecutionStateEnum.QUEUED
      )
      : ExecutionStateEnum.IDLE;

    return (
      // @ts-ignore
      <CodeBlock
        block={blockFromCustomTemplate}
        defaultValue={templateAttributes?.content}
        disableDrag
        executionState={executionState}
        hideExtraCommandButtons
        hideExtraConfiguration
        hideHeaderInteractiveInformation
        interruptKernel={interruptKernel}
        key={String(codeBlockKey)}
        messages={messages?.[blockFromCustomTemplate?.uuid]}
        noDivider
        onChange={(value: string) => setTemplateAttributes(prev => ({
          ...prev,
          content: value,
        }))}
        runBlock={runBlock}
        runningBlocks={runningBlocks}
        selected
        setErrors={showError}
        textareaFocused
      />
    );
  }, [
    blockFromCustomTemplate,
    codeBlockKey,
    interruptKernel,
    messages,
    ready,
    runBlock,
    runningBlocks,
    runningBlocksByUUID,
    setTemplateAttributes,
    showError,
    templateAttributes,
  ]);

  const saveCustomTemplate = useCallback(() => {
    const payload = {
      custom_template: {
        ...templateAttributes,
        language: isMarkdown ? BlockLanguageEnum.MARKDOWN : templateAttributes?.language,
        object_type: OBJECT_TYPE_BLOCKS,
      },
    };

    if (isNewCustomTemplate) {
      // @ts-ignore
      createCustomTemplate(payload);
    } else {
      // @ts-ignore
      updateCustomTemplate(payload);
    }
  }, [
    createCustomTemplate,
    isMarkdown,
    isNewCustomTemplate,
    templateAttributes,
    updateCustomTemplate,
  ]);

  const uuidKeyboard = 'CustomTemplates/TemplateDetail';
  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping) => {
      if (touched && onlyKeysPresent([KEY_CODE_META, KEY_CODE_R], keyMapping)) {
        event.preventDefault();
        const warning = 'You have changes that are unsaved. Click cancel and save your changes before reloading page.';
        if (typeof window !== 'undefined' && typeof location !== 'undefined' && window.confirm(warning)) {
          location.reload();
        }
      } else if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_S], keyMapping)
        || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_S], keyMapping)
      ) {
        event.preventDefault();
        saveCustomTemplate();
      }
    },
    [
      saveCustomTemplate,
      touched,
    ],
  );

  const heightFinal = useMemo(() => height - heightOffset, [
    height,
    heightOffset,
  ]);

  const { ConfirmLeaveModal } = useConfirmLeave({
    shouldWarn: !isRedirecting && touched,
    warningMessage: 'You have unsaved changes. Are you sure you want to leave?',
  });

  return (
    <ContainerStyle>
      <ConfirmLeaveModal />
      <NavigationStyle height={contained ? heightFinal : null}>
        <FlexContainer
          flexDirection="column"
          fullHeight
        >
          <TabsStyle>
            <ButtonTabs
              noPadding
              onClickTab={(tab: TabType) => {
                setSelectedTab(tab);
              }}
              selectedTabUUID={selectedTab?.uuid}
              tabs={isNewCustomTemplate ? NAV_TABS.slice(0, 1) : NAV_TABS}
            />
          </TabsStyle>

          <Flex
            // flex={1}
            flexDirection="column"
          >
            {NAV_TAB_DEFINE.uuid === selectedTab?.uuid && (
              <>
                <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
                  <Spacing mb={1}>
                    <Text bold>
                      Template UUID
                    </Text>
                    <Text muted small>
                      Unique identifier for custom template.
                      The UUID will also determine where the custom template file is stored in the
                      project.
                      You can use nested folder names in the template’s UUID.
                    </Text>
                  </Spacing>

                  <TextInput
                    monospace
                    // @ts-ignore
                    onChange={e => setTemplateAttributes(prev => ({
                      ...prev,
                      template_uuid: e.target.value,
                    }))}
                    placeholder="e.g. some_template_name"
                    primary
                    setContentOnMount
                    value={templateAttributes?.template_uuid || ''}
                  />
                </Spacing>

                <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
                  <Select
                    label="Block type"
                    // @ts-ignore
                    onChange={e => setTemplateAttributes(prev => ({
                      ...prev,
                      block_type: e.target.value,
                      language: BlockTypeEnum.MARKDOWN === e.target.value
                        ? BlockLanguageEnum.MARKDOWN
                        : prev?.language,
                    }))}
                    primary
                    value={templateAttributes?.block_type || ''}
                  >
                    {Object.values(BlockTypeEnum).map((v: string) => (
                      <option key={v} value={v}>
                        {BLOCK_TYPE_NAME_MAPPING[v]}
                      </option>
                    ))}
                  </Select>
                </Spacing>

                {!isMarkdown && (
                  <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
                    <Select
                      label="Language"
                      // @ts-ignore
                      onChange={e => setTemplateAttributes(prev => ({
                        ...prev,
                        language: e.target.value,
                      }))}
                      primary
                      value={templateAttributes?.language || ''}
                    >
                      {Object.values(BlockLanguageEnum).map((v: string) => (
                        <option key={v} value={v}>
                          {LANGUAGE_DISPLAY_MAPPING[v]}
                        </option>
                      ))}
                    </Select>
                  </Spacing>
                )}
              </>
            )}

            {NAV_TAB_DOCUMENT.uuid === selectedTab?.uuid && (
              <>
                <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
                  <Spacing mb={1}>
                    <Text bold>
                      Name
                    </Text>
                    <Text muted small>
                      A human readable name for your template.
                    </Text>
                  </Spacing>

                  <TextInput
                    // @ts-ignore
                    onChange={e => setTemplateAttributes(prev => ({
                      ...prev,
                      name: e.target.value,
                    }))}
                    primary
                    setContentOnMount
                    value={templateAttributes?.name || ''}
                  />
                </Spacing>

                <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
                  <TextArea
                    label="Description"
                    // @ts-ignore
                    onChange={e => setTemplateAttributes(prev => ({
                      ...prev,
                      description: e.target.value,
                    }))}
                    primary
                    setContentOnMount
                    value={templateAttributes?.description || ''}
                  />
                </Spacing>
              </>
            )}
          </Flex>

          <ButtonsStyle>
            <Spacing p={PADDING_UNITS}>
              <FlexContainer>
                <Button
                  disabled={buttonDisabled}
                  fullWidth
                  loading={isLoadingCreateCustomTemplate || isLoadingUpdateCustomTemplate}
                  onClick={() => saveCustomTemplate()}
                  primary
                >
                  {!isNewCustomTemplate && 'Save template'}
                  {isNewCustomTemplate && 'Create new template'}
                </Button>

                {onCancel && (
                  <>
                    <Spacing mr={1} />

                    <Button
                      onClick={onCancel}
                      secondary
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </FlexContainer>
            </Spacing>
          </ButtonsStyle>
        </FlexContainer>
      </NavigationStyle>

      <ContentStyle>
        <Spacing p={PADDING_UNITS}>
          <DndProvider backend={HTML5Backend}>
            {codeBlock}
          </DndProvider>
        </Spacing>
      </ContentStyle>
    </ContainerStyle>
  );
}

export default TemplateDetail;
