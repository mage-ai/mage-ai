import * as osPath from 'path';
import { newMessageRequestUUID } from '@utils/events';
import { getLineID } from '@components/v2/Apps/PipelineCanvas/Lines/LineManagerV2';
import { ShowNodeType } from '@components/v2/Apps/PipelineCanvas/interfaces';
import { EventEnum, KeyEnum } from '@mana/events/enums';
import { removeANSI, removASCII } from '@utils/string';
import { getBlockColor } from '@mana/themes/blocks';
import BlockNodeComponent, { BADGE_HEIGHT, PADDING_VERTICAL } from './BlockNode';
import {
  EnvironmentTypeEnum,
  EnvironmentUUIDEnum,
  EnvironmentType,
  ExecutionOutputType,
} from '@interfaces/CodeExecutionType';
import Circle from '@mana/elements/Circle';
import { menuItemsForTemplates } from './utils';
import { generateUUID } from '@utils/uuids/generator';
import { getUpDownstreamColors } from './Blocks/utils';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import { copyToClipboard } from '@utils/clipboard';
import { indexBy, sortByKey } from '@utils/array';
import { ClientEventType, EventOperationEnum } from '@mana/shared/interfaces';
import OutputGroups from './CodeExecution/OutputGroups';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import ContextProvider from '@context/v2/ContextProvider';
import EditorAppNode from './Apps/EditorAppNode';
import EventStreamType, {
  ExecutionResultType,
  ExecutionStatusEnum,
  ServerConnectionStatusType,
  KernelOperation,
  ResultType,
} from '@interfaces/EventStreamType';
import React, { useState, useCallback, useContext, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { AppConfigType } from '../../Apps/interfaces';
import { AppSubtypeEnum, AppTypeEnum } from '@components/v2/Apps/constants';
import { ElementRoleEnum } from '@mana/shared/types';
import { EventContext } from '../../Apps/PipelineCanvas/Events/EventContext';
import { FileType } from '@components/v2/IDE/interfaces';
import { AppNodeType, NodeType, OutputNodeType } from '../interfaces';
import {
  AISparkle,
  DeleteCircle,
  CopyV2,
  Monitor,
  OpenInSidekick,
  Delete,
  Explain,
  AddBlock,
  Code,
  Lightning,
} from '@mana/icons';
import { ThemeContext } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';
import { executionDone } from '@components/v2/ExecutionManager/utils';
import { getClosestRole } from '@utils/elements';
import { getFileCache, updateFileCache } from '../../IDE/cache';
import { useMutate } from '@context/v2/APIMutation';
import { objectSize, setNested } from '@utils/hash';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import Divider from '@mana/elements/Divider';
import { gridTemplateColumns } from 'styled-system';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { useDragControls } from 'framer-motion';

type BlockNodeType = {
  block: BlockType;
  dragRef?: React.MutableRefObject<HTMLDivElement>;
  index?: number;
  groupSelection?: boolean;
  recentlyAddedBlocksRef?: React.MutableRefObject<Record<string, boolean>>;
  node: NodeType;
  showApp?: ShowNodeType;
  showOutput?: ShowNodeType;
};

const STEAM_OUTPUT_DIR = 'code_executions';

function BlockNode(
  { block, dragRef, node, groupSelection, showApp, recentlyAddedBlocksRef, showOutput, ...rest }: BlockNodeType,
  ref: React.MutableRefObject<HTMLElement>,
) {
  const appDragControls = useDragControls();
  const outputDragControls = useDragControls();

  const themeContext = useContext(ThemeContext);
  const { animateLineRef, handleMouseDown, renderLineRef } = useContext(EventContext);
  const { selectedGroupsRef } = useContext(SettingsContext);
  const { blockMappingRef, blocksByGroupRef, groupMappingRef, groupsByLevelRef } =
    useContext(ModelContext);

  const { configuration, name, type } = block;
  const { file } = configuration ?? {};

  const codeExecutionEnvironment = useMemo(
    () => ({
      type: block?.pipeline?.uuid ? EnvironmentTypeEnum.PIPELINE : EnvironmentTypeEnum.CODE,
      uuid: block?.pipeline?.uuid ?? EnvironmentUUIDEnum.EXECUTION,
    }),
    [block],
  );

  const consumerIDRef = useRef<string>(null);
  const timeoutRef = useRef(null);
  const timeoutLaunchEditorAppOnMountRef = useRef(null);
  const connectionErrorRef = useRef(null);
  const connectionStatusRef = useRef<ServerConnectionStatusType>(null);
  const handleOnMessageRef = useRef<Record<string, (event: EventStreamType) => void>>({});

  const [apps, setApps] = useState<Record<string, AppNodeType>>({});

  // Status
  const appOpenRef = useRef<boolean>(false);

  // Models
  const appNodeRef = useRef<AppNodeType>(null);
  const outputNodeRef = useRef<OutputNodeType>(null);
  const launchOutputCallbackOnceRef = useRef<() => void>(null);

  // Roots
  const appRootRef = useRef<Root>(null);
  const outputRootRef = useRef<Root>(null);

  // Open/Close callbacks
  const onCloseAppRef = useRef<() => void>(null);
  const onCloseOutputRef = useRef<() => void>(null);

  // Appended child element to mount root onto
  const appAppendedChildElementRef = useRef<HTMLDivElement>(null);
  const outputAppendedChildElementRef = useRef<HTMLDivElement>(null);

  // Element attached to root
  const appMountRef = useRef<React.RefObject<HTMLElement>>(null);
  const outputMountRef = useRef<React.RefObject<HTMLElement>>(null);

  const { mutations } = useContext(ModelContext);

  const {
    handleContextMenu,
    removeContextMenu,
    setSelectedGroup,
    useExecuteCode,
    useRegistration,
  } = useContext(EventContext);

  const executionOutputs = useMutate({
    resource: 'execution_outputs',
  });

  function setHandleOnMessage(consumerID: string, handler) {
    handleOnMessageRef.current[consumerID] = handler;
  }

  function hideLinesToOutput(opts?: {
    editorOnly?: boolean;
  }) {
    const appNode = appNodeRef.current;
    const outputNode = outputNodeRef.current;
    if (outputNode) {
      const ids = [];

      if (!opts?.editorOnly) {
        ids.push(getLineID(block.uuid, outputNode.id));
      }

      if (appNode && appOpenRef.current) {
        ids.push(getLineID(appNode.id, outputNode.id));
      }

      ids.filter(Boolean).forEach((id) => {
        [id, `${id}-background`].forEach(i => {
          const el = document.getElementById(i);

          if (el) {
            el.style.display = 'none';
            el.style.opacity = '0';
            el.style.strokeDasharray = '0';
          }
        });
      });
    }
  }

  function showLinesToOutput() {
    const appNode = appNodeRef.current;
    const outputNode = outputNodeRef.current;
    if (outputNode) {
      const ids = [
        getLineID(block.uuid, outputNode.id),
      ];

      if (appNode && appOpenRef.current) {
        ids.push(getLineID(appNode.id, outputNode.id));
      }

      ids.filter(Boolean).forEach((id) => {
        [id, `${id}-background`].forEach(i => {
          const el = document.getElementById(i);

          if (el) {
            el.style.display = '';
            el.style.opacity = '';
            el.style.strokeDasharray = '';
          }
        });
      });
    }
  }

  const outputGroupsProps = useMemo(
    () => ({
      handleContextMenu: (
        event: any,
        executionOutput: ExecutionOutputType,
        opts?: {
          onDelete: (xo: ExecutionOutputType) => void;
          onDeleteAll: () => void;
        },
      ) => {
        if (event.metaKey) return;

        event.preventDefault();
        event.stopPropagation();
        handleContextMenu(
          event,
          [
            {
              Icon: DeleteCircle,
              onClick: (event2: ClientEventType) => {
                removeContextMenu(event2);
                closeOutput();
              },
              uuid: 'Close output',
            },
            ...((executionOutput?.uuid && executionOutput?.messages) ? [
              {
                Icon: CopyV2,
                onClick: (event2: ClientEventType) => {
                  removeContextMenu(event2);
                  let text = '';

                  if (executionOutput && executionOutput?.output) {
                    text = JSON.stringify(executionOutput?.output, null, 2);
                  } else {
                    const results: ExecutionResultType[] = sortByKey(
                      executionOutput?.messages ?? [],
                      (result: ExecutionResultType) => result?.timestamp,
                    );
                    text = results
                      ?.map((result: ExecutionResultType) =>
                        removASCII(removeANSI(
                          result?.error
                            ? JSON.stringify(result?.error ?? '', null, 2)
                            : (result?.output_text ?? '')?.trim() ?? '',
                        )),
                      )
                      .join('\n');
                  }
                  copyToClipboard(text);
                },
                uuid: 'Copy output',
              },
              {
                Icon: Delete,
                onClick: (event: ClientEventType) => {
                  executionOutputs.delete.mutate({
                    event,
                    id: executionOutput?.uuid,
                    onSuccess: () => {
                      removeContextMenu(event);
                      renderLineRef?.current?.({
                        ...dragRef?.current?.getBoundingClientRect(),
                        ...node?.rect,
                      });

                      opts?.onDelete?.(executionOutput);

                      animateLineRef?.current?.(outputNodeRef?.current?.id, null, { stop: true });
                    },
                    query: {
                      namespace: encodeURIComponent(
                        [codeExecutionEnvironment.type, codeExecutionEnvironment.uuid].join(
                          osPath.sep,
                        ),
                      ),
                      path: encodeURIComponent(fileRef.current?.path),
                    },
                  });
                },
                uuid: 'Delete output',
              },
              {
                Icon: Delete,
                onClick: (event: ClientEventType) => {
                  executionOutputs.delete.mutate({
                    event,
                    id: executionOutput?.uuid,
                    onSuccess: () => {
                      removeContextMenu(event);
                      opts?.onDeleteAll?.();
                    },
                    payload: {
                      all: true,
                    },
                    query: {
                      namespace: encodeURIComponent(
                        [codeExecutionEnvironment.type, codeExecutionEnvironment.uuid].join(
                          osPath.sep,
                        ),
                      ),
                      path: encodeURIComponent(fileRef.current?.path),
                    },
                  });
                },
                uuid: 'Delete all outputs',
              },
              { divider: true },
              {
                Icon: AISparkle,
                items: [
                  {
                    Icon: Monitor,
                    disabled: true,
                    uuid: 'Fix error',
                  },
                  {
                    Icon: Explain,
                    disabled: true,
                    uuid: 'Explain error',
                  },
                ],
                uuid: 'AI Sidekick',
              },
            ] : []),
          ],
          {
            reduceItems: i1 => i1,
          },
        );
      },
      setHandleOnMessage,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleContextMenu, removeContextMenu, executionOutputs, codeExecutionEnvironment],
  );

  const handleEditorContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      event.stopPropagation();

      handleContextMenu(
        event,
        [
          {
            Icon: DeleteCircle,
            onClick: (event2: ClientEventType) => {
              removeContextMenu(event2);
              closeEditorApp();
            },
            uuid: 'Close editor',
          },
        ],
        {
          reduceItems: i1 => i1,
        },
      );
    },
    [handleContextMenu, removeContextMenu],
  );

  // APIs
  const fileRef = useRef<FileType>(file);

  const [loadingKernelMutation, setLoadingKernelMutation] = useState(false);
  const kernelProcess = useMutate(
    {
      id: block.uuid,
      resource: 'kernel_processes',
    },
    {
      handlers: {
        update: {
          onError: () => {
            setExecuting(false);
            setLoadingKernelMutation(false);
          },
          onSuccess: () => {
            setLoadingKernelMutation(false);

            Object.values(handleOnMessageRef.current ?? {}).forEach(handler =>
              handler({
                result: {
                  process: {
                    uuid: block.uuid,
                  },
                  status: ExecutionStatusEnum.INTERRUPTED,
                  type: ResultType.STATUS,
                } as ExecutionResultType,
              } as EventStreamType),
            );
          },
        },
      },
    },
  );

  const interruptExecution = useCallback(
    (opts?: { onError?: () => void; onSuccess?: () => void }) => {
      setLoadingKernelMutation(true);
      kernelProcess.update.mutate({
        ...opts,
        payload: {
          [KernelOperation.INTERRUPT]: true,
        },
      });
    },
    [kernelProcess],
  );

  // Attributes
  const isGroup = useMemo(
    () => !type || [BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(type),
    [type],
  );
  const [executing, setExecuting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Controls
  const timerStatusRef = useRef(null);

  // Methods
  const channel = useMemo(() => block.uuid, [block]);
  const { executeCode } = useExecuteCode(channel, STEAM_OUTPUT_DIR);
  const { subscribe, unsubscribe } = useRegistration(channel, STEAM_OUTPUT_DIR);

  function getFile(event: any, callback?: () => void) {
    const { configuration } = block ?? {};
    const { file } = configuration ?? {};

    mutations.files.detail.mutate({
      id: file?.path,
      onError: () => {
        setLoading(false);
      },
      onSuccess: ({ data }) => {
        fileRef.current = data?.browser_item;

        const fmodel = data?.browser_item;
        updateFileCache({
          server: fmodel,
          ...(getCode()
            ? {}
            : {
                client: fmodel,
              }),
        });
        callback && callback?.();
      },
    });
  }

  function handleError(error: Event) {
    console.log('[BlockNodeWrapper] connection.error:', error);
    connectionErrorRef.current = error;
    console.error('[BlockNodeWrapper] connection.error:', error);
  }

  function handleOpen(status: ServerConnectionStatusType) {
    console.log('[BlockNodeWrapper] connection.status:', status);
    connectionStatusRef.current = status;
  }

  function handleSubscribe(consumerID: string) {
    handleOnMessageRef.current[consumerIDRef.current] = (event: EventStreamType) => {
      const done = executionDone(event);
      setExecuting(!done);
      animateLineRef?.current?.(outputNodeRef?.current?.id, null, { stop: done });
    };

    subscribe(consumerID, {
      onError: handleError,
      onMessage: (event: EventStreamType) => {
        Object.values(handleOnMessageRef.current ?? {}).forEach(handler => handler(event));
      },
      onOpen: handleOpen,
    });
  }

  const getCode = useCallback(() => getFileCache(file?.path)?.client?.file?.content, [file]);

  const submitCodeExecution = useCallback(
    (
      event: React.MouseEvent<HTMLElement>,
      opts?: {
        onError?: () => void;
        onSuccess?: () => void;
      },
    ) => {
      const messageRequestUUID = newMessageRequestUUID();

      handleSubscribe('BlockNode');

      const execute = () => {
        if (outputNodeRef?.current) {
          animateLineRef?.current?.(outputNodeRef?.current?.id);
          showLinesToOutput();
        }

        const message = getCode();
        executeCode(
          message,
          {
            environment: codeExecutionEnvironment,
            message_request_uuid: messageRequestUUID,
            output_path: file?.path ?? null,
            source: block.uuid,
          },
          {
            onError: () => {
              getClosestRole(event.target as HTMLElement, [ElementRoleEnum.BUTTON]);
              setExecuting(false);
              setLoading(false);
              opts?.onError?.();
            },
            onSuccess: () => {
              setLoading(false);
              opts?.onSuccess?.();
            },
          },
        );
      };

      if (!outputRootRef.current) {
        launchOutputCallbackOnceRef.current = () => {
          getFile(event, execute);
        };

        launchOutput({
          message_request_uuid: messageRequestUUID,
          uuid: channel,
        }, () => {
          if (launchOutputCallbackOnceRef.current) {
            launchOutputCallbackOnceRef.current();
          }
          launchOutputCallbackOnceRef.current = null;
        });
      } else {
        execute();
      }

      setLoading(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [block, node, executeCode, codeExecutionEnvironment],
  );

  const commands = useMemo(() => ({
    executeCode: {
      handler: (event: any) => {
        submitCodeExecution(event);
      },
      predicate: { key: KeyEnum.ENTER, metaKey: true },
    },
  }), [submitCodeExecution]);

  function updateBlock(event: any, key: string, value: any, opts?: any) {
    const id = event.currentTarget.id;
    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      clearTimeout(timeoutRef.current);

      mutations.pipelines.update.mutate({
        event,
        onError: () => {
          ref?.current?.classList?.remove(stylesBlockNode.loading);
        },
        onStart: () => {
          ref?.current?.classList?.add(stylesBlockNode.loading);
        },
        onSuccess: () => {
          ref?.current?.classList?.remove(stylesBlockNode.loading);
          opts?.callback && opts?.callback?.();
          setTimeout(() => {
            const el = document.getElementById(id);
            el?.focus();
          }, 500);
        },
        payload: {
          block: setNested(
            {
              configuration: block.configuration,
              uuid: block.uuid,
            },
            key,
            value,
          ),
        },
      });
    }, 1000);
  }

  function closeOutput(callback?: () => void) {
    hideLinesToOutput();

    delete handleOnMessageRef.current?.[outputNodeRef?.current?.id];
    outputRootRef?.current && outputRootRef?.current?.unmount();

    outputRootRef.current = null;
    outputNodeRef.current = null;

    if (callback) {
      callback();
    } else if (onCloseOutputRef?.current) {
      onCloseOutputRef?.current?.();
    }
  }

  function closeEditorApp(callback?: () => void) {
    hideLinesToOutput({ editorOnly: true });

    delete handleOnMessageRef.current?.[appNodeRef?.current?.id];
    delete handleOnMessageRef.current?.[`${appNodeRef?.current?.id}/output`];

    appRootRef?.current && appRootRef?.current?.unmount();
    appAppendedChildElementRef?.current?.remove();

    appAppendedChildElementRef.current = null;
    appMountRef.current = null;
    appRootRef.current = null;

    if (callback) {
      callback();
    } else if (onCloseAppRef?.current) {
      onCloseAppRef?.current?.();
    }

    setApps(prev => {
      const data = { ...prev };
      delete data[appNodeRef?.current?.id];
      return data;
    });

    // DO THIS LAST
    appOpenRef.current = false;
  }

  function renderOutputPortalContent() {
    const groupsInLevel = groupsByLevelRef?.current?.[selectedGroupsRef?.current?.length - 2];
    const { downstreamInGroup, modeColor, groupColor, upstreamInGroup } = getUpDownstreamColors(
      block,
      groupsInLevel,
      blocksByGroupRef?.current,
      {
        blockMapping: blockMappingRef?.current,
        groupMapping: groupMappingRef?.current,
      },
    );
    const label = block?.name ?? block?.uuid;

    const blocksup = block?.upstream_blocks?.map(buuid => blockMappingRef?.current?.[buuid]);
    const blocksdn = block?.downstream_blocks?.map(buuid => blockMappingRef?.current?.[buuid]);

    const bup = blocksup?.[0];
    const bdn = blocksdn?.[0];
    const bupc = getBlockColor(bup?.type, { getColorName: true })?.names?.base
      ?? modeColor ?? groupColor;
    const bdnc = getBlockColor(bdn?.type, { getColorName: true })?.names?.base
      ?? downstreamInGroup?.[0]?.colorName;

    return (
      label && (
        <Grid
          alignItems="center"
          autoColumns="auto"
          autoFlow="column"
          columnGap={8}
          justifyContent="space-between"
          padding={6}
          templateColumns="1fr 1fr 1fr"
          templateRows="1fr"
        >
          <Grid alignItems="center" autoFlow="column" columnGap={6} justifyContent="start">
            <Circle backgroundColor={bupc} size={12} />
            {bup && (
              <Text secondary xsmall>
                {bup?.name ?? bup?.uuid}
              </Text>
            )}
          </Grid>

          <Grid alignItems="center" autoFlow="column" columnGap={6} justifyContent="center">
            <Text xsmall>{label}</Text>
          </Grid>

          <Grid alignItems="center" autoFlow="column" columnGap={6} justifyContent="end">
            {bdn && (
              <Text secondary xsmall>
                {bdn?.name ?? bdn?.uuid}
              </Text>
            )}
            <Circle
              backgroundColor={bdnc ?? undefined}
              borderColor={!bdnc ? 'gray' : undefined}
              size={12}
            />
          </Grid>
        </Grid>
      )
    );
  }

  function renderOutput(
    mountRef: React.RefObject<HTMLElement>,
    outputNode: OutputNodeType,
    uuid?: string,
    callback?: () => void,
  ) {
    outputNodeRef.current = outputNode;
    outputMountRef.current = mountRef;

    outputRootRef.current = createRoot(mountRef.current);
    outputRootRef.current.render(
      <ContextProvider theme={themeContext as any}>
        <div
          onMouseDown={event => {
            handleMouseDown({
              ...event,
              operationType: EventOperationEnum.DRAG_START,
            } as any);
          }}
          onWheel={event => {
            event.stopPropagation();
          }}
          role={ElementRoleEnum.DRAGGABLE}
        >
          <OutputGroups
            {...outputGroupsProps}
            consumerID={outputNode.id}
            executionOutput={{
              messages: [],
              namespace: encodeURIComponent(
                [codeExecutionEnvironment.type, codeExecutionEnvironment.uuid].join(osPath.sep),
              ),
              path: encodeURIComponent(fileRef.current?.path),
              uuid,
            }}
            onMount={() => {
              showLinesToOutput();
              callback && callback();
            }}
            role={ElementRoleEnum.CONTENT}
            styles={{
              maxWidth: 800,
              minWidth: 600,
            }}
          >
            {renderOutputPortalContent()}
            <Divider compact />
          </OutputGroups>
        </div>
      </ContextProvider>,
    );
  }

  function renderEditorApp(
    mountRef: React.RefObject<HTMLElement>,
    appNode: AppNodeType,
    opts?: {
      fileRef?: React.MutableRefObject<FileType>;
    },
  ) {
    appNodeRef.current = appNode;
    appMountRef.current = mountRef;

    appAppendedChildElementRef.current = document.createElement('div');
    appAppendedChildElementRef.current.className = stylesBlockNode.appendedChildElement;
    mountRef.current.appendChild(appAppendedChildElementRef.current);

    appRootRef.current = createRoot(appAppendedChildElementRef.current);
    appRootRef.current.render(
      <ContextProvider theme={themeContext as any}>
        <EditorAppNode
          app={appNode}
          block={block}
          dragControls={appDragControls}
          fileRef={opts?.fileRef ?? fileRef}
          handleContextMenu={handleEditorContextMenu}
          interruptExecution={interruptExecution}
          onClose={() => {
            closeEditorApp();
          }}
          outputGroupsProps={outputGroupsProps}
          setHandleOnMessage={setHandleOnMessage}
          submitCodeExecution={submitCodeExecution}
        />
      </ContextProvider>,
    );

    setApps(prev => ({
      ...prev,
      [appNode.id]: {
        ...appNode,
        ref: appMountRef.current,
      },
    }));

    appOpenRef.current = true;
  }

  function launchOutput(output?: {
    message_request_uuid: string;
    uuid: string;
  }, callback?: () => void) {
    if (outputRootRef.current) {
      callback && callback?.();
    } else {
      showOutput(
        output,
        (outputNode: OutputNodeType, mountRef: React.RefObject<HTMLDivElement>) => {
          renderOutput(mountRef, outputNode, output?.message_request_uuid, callback);
        },
        closeOutput,
        onRemove => onCloseOutputRef.current = onRemove,
        {
          dragControls: outputDragControls,
        },
      );
    }
  }

  function launchEditorApp(event: any) {
    if (appRootRef.current) return;

    const app = {
      subtype: AppSubtypeEnum.CANVAS,
      type: AppTypeEnum.EDITOR,
      uuid: [block.uuid, AppTypeEnum.EDITOR, AppSubtypeEnum.CANVAS].join(':'),
    };

    const render = () =>
      showApp(
        app,
        (appNode: AppNodeType, mountRef: React.RefObject<HTMLDivElement>) => {
          renderEditorApp(mountRef, appNode, {
            fileRef,
          });
        },
        closeEditorApp,
        onRemove => onCloseAppRef.current = onRemove,
        {
          dragControls: appDragControls,
        },
      );

    if (fileRef.current?.path && fileRef.current?.content) {
      render();
    } else {
      getFile(event, () => render());
    }
  }

  useEffect(() => {
    consumerIDRef.current = block.uuid;

    if (block?.uuid in (recentlyAddedBlocksRef?.current ?? {})
      && objectSize(block?.configuration?.templates ?? {}) === 0
    ) {
      timeoutLaunchEditorAppOnMountRef.current = setTimeout(() => {
        launchEditorApp(null);
      }, 1000);
    }

    const consumerID = consumerIDRef.current;
    const timeout = timeoutRef.current;
    const timeoutLaunch = timeoutLaunchEditorAppOnMountRef.current;

    return () => {
      clearTimeout(timeout);
      clearTimeout(timeoutLaunch);

      timeoutRef.current = null;
      timeoutLaunchEditorAppOnMountRef.current = null;

      unsubscribe(consumerID);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const teleportIntoBlock = useCallback((
    event: ClientEventType,
    target: BlockType | PipelineExecutionFrameworkBlockType | FrameworkType,
  ) => {
    event?.preventDefault();
    setSelectedGroup(target);
    removeContextMenu(event);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildContextMenuItemsForGroupBlock = useCallback(
    (block2: BlockType) => [
      {
        uuid: block2?.name ?? block2?.uuid,
      },
      {
        Icon: AddBlock,
        items: menuItemsForTemplates(
          block2,
          (event: any, block3, template, callback, payloadArg) => {
            const payload = {
              ...payloadArg,
              groups: [block3.uuid],
              uuid: generateUUID(),
            };

            if (template?.uuid) {
              payload.configuration = {
                templates: {
                  [template.uuid]: template,
                },
              };
            }

            mutations.pipelines.update.mutate({
              event,
              onSuccess: event => {
                callback && callback?.();
                removeContextMenu(event);
              },
              payload: {
                block: payload,
              },
            });
          },
        ),
        uuid: 'Add block from template',
      },
      ...(groupSelection ||
      (selectedGroupsRef?.current?.length >= 3 &&
        selectedGroupsRef?.current?.[selectedGroupsRef?.current?.length - 1]?.uuid === block2?.uuid)
        ? []
        : [
            { divider: true },
            {
              Icon: OpenInSidekick,
              onClick: event => teleportIntoBlock(event, block2),
              uuid: 'Teleport into group',
            },
          ]),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutations.pipelines.update, groupSelection, removeContextMenu, setSelectedGroup, teleportIntoBlock],
  );

  return (
    <div
      className={[
        stylesBlockNode.blockNodeWrapper,
        groupSelection && stylesBlockNode.groupSelection,
        executing && stylesBlockNode.executing,
      ]
        .filter(Boolean)
        .join(' ')}
      onContextMenu={(event: any) => {
        if (event.metaKey) return;

        event.preventDefault();
        event.stopPropagation();

        const items = [];

        if (isGroup) {
          items.push(...buildContextMenuItemsForGroupBlock(block));
        } else {
          items.push(
            ...[
              {
                Icon: Lightning,
                onClick: (event: ClientEventType) => {
                  event?.preventDefault();
                  submitCodeExecution(event as any);
                  removeContextMenu(event);
                },
                uuid: 'Execute code',
              },
              {
                Icon: Code,
                onClick: (event: ClientEventType) => {
                  event?.preventDefault();
                  launchEditorApp(event);
                  removeContextMenu(event);
                },
                uuid: 'Open code editor',
              },
              {
                Icon: Delete,
                onClick: (event: ClientEventType) => {
                  event?.preventDefault();

                  mutations.pipelines.update.mutate({
                    event,
                    onSuccess: () => {
                      closeEditorApp();
                      closeOutput();
                      removeContextMenu(event);
                    },
                    payload: pipeline => ({
                      ...pipeline,
                      blocks: pipeline?.blocks?.filter((b: BlockType) => b.uuid !== block.uuid),
                    }),
                  });
                },
                uuid: 'Remove from pipeline',
              },
            ],
          );
        }

        handleContextMenu(event, items, {
          reduceItems: i1 => i1,
        });
      }}
      ref={ref as React.RefObject<HTMLDivElement>}
    >
      <BlockNodeComponent
        {...rest}
        commands={commands}
        apps={apps}
        block={block}
        buildContextMenuItemsForGroupBlock={buildContextMenuItemsForGroupBlock}
        code={fileRef.current?.content}
        dragRef={dragRef}
        executing={executing}
        groupSelection={groupSelection}
        interruptExecution={interruptExecution}
        loading={loading}
        loadingKernelMutation={loadingKernelMutation}
        node={node}
        openEditor={launchEditorApp}
        submitCodeExecution={submitCodeExecution}
        teleportIntoBlock={teleportIntoBlock}
        timerStatusRef={timerStatusRef}
        updateBlock={updateBlock}
      />
    </div>
  );
}

function areEqual(p1: BlockNodeType, p2: BlockNodeType) {
  return p1.block.uuid === p2.block.uuid && p1?.groupSelection === p2?.groupSelection;
}

export default React.memo(React.forwardRef(BlockNode), areEqual);

export { BADGE_HEIGHT, PADDING_VERTICAL };
