import * as osPath from 'path';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import Loading from '@mana/components/Loading';
import { doesRectIntersect } from '@utils/rects';
import { CIRCLE_PORT_SIZE } from './Blocks/constants';
import { ConnectionLines } from '@components/v2/Canvas/Connections/ConnectionLines';
import { ErrorDetailsType } from '@interfaces/ErrorsType';
import { getPathD } from '../Connections/utils';
import stylesPipelineBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { WithOnMount } from '@mana/hooks/useWithOnMount';
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/v2/Tooltip';
import Button from '@mana/elements/Button';
import { newMessageRequestUUID } from '@utils/events';
import { buildPaths, getLineID, prepareLinePathProps } from '@components/v2/Apps/PipelineCanvas/Lines/utils';
import { ShowNodeType } from '@components/v2/Apps/PipelineCanvas/interfaces';
import { EventEnum, KeyEnum } from '@mana/events/enums';
import { removeANSI, removASCII, capitalize } from '@utils/string';
import { getBlockColor } from '@mana/themes/blocks';
import BlockNodeComponent from './BlockNode';
import {
  BADGE_HEIGHT,
  PADDING_VERTICAL,
  BLOCK_NODE_MIN_WIDTH,
  GROUP_NODE_MIN_WIDTH,
  SELECTED_GROUP_NODE_MIN_WIDTH,
} from './Blocks/constants'
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
import { indexBy, sortByKey, unique } from '@utils/array';
import { ClientEventType, DragInfo, EventOperationEnum, RectType } from '@mana/shared/interfaces';
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
import React, { useState, useCallback, useContext, useMemo, useRef, useEffect, createRef } from 'react';
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
  AddV2UpsideDown,
  Code,
  Lightning,
  CloseV2, PlayButtonFilled,
  AlertTriangle, BlockGeneric, PlayButton,
  BranchAlt,
  ArrowRight,
  PaginateArrowRight,
} from '@mana/icons';
import { ThemeContext } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';
import { executionDone, errorFromResults } from '@components/v2/ExecutionManager/utils';
import { getClosestRole } from '@utils/elements';
import { getFileCache, updateFileCache } from '../../IDE/cache';
import { useMutate } from '@context/v2/APIMutation';
import { objectSize, setNested } from '@utils/hash';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import Divider from '@mana/elements/Divider';
import { gridTemplateColumns } from 'styled-system';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { motion, useAnimation, useDragControls, useMotionValue, useTransform } from 'framer-motion';
import { CircleCell } from '@visx/heatmap/lib/heatmaps/HeatmapCircle';

const CIRCLE_SIZE = 20;

type BlockNodeType = {
  block: BlockType;
  dragRef?: React.MutableRefObject<HTMLDivElement>;
  index?: number;
  groupSelection?: boolean;
  setHandleOnChildMessage?: (handler: (event: EventStreamType, block: BlockType) => void) => void;
  getParentOnMessageHandler?: (groupUUID: string) => (event: EventStreamType, block: BlockType) => void;
  recentlyAddedBlocksRef?: React.MutableRefObject<Record<string, boolean>>;
  node: NodeType;
  linePathPortalRef?: React.MutableRefObject<HTMLDivElement>;
  pipelineUUID: string;
  showApp?: ShowNodeType;
  showOutput?: ShowNodeType;
  transformState: React.MutableRefObject<ZoomPanStateType>;
};

const STEAM_OUTPUT_DIR = 'code_executions';

function BlockNode(
  { block, dragRef, node, groupSelection, showApp, recentlyAddedBlocksRef, showOutput,
    setHandleOnChildMessage, pipelineUUID,
    getParentOnMessageHandler, linePathPortalRef, transformState,
    ...rest }: BlockNodeType,
  ref: React.MutableRefObject<HTMLElement>,
) {
  const appDragControls = useDragControls();
  const outputDragControls = useDragControls();

  const themeContext = useContext(ThemeContext);
  const { animateLineRef, handleMouseDown, onBlockCountChange,
    renderLineRef, updateLinesRef } = useContext(EventContext);
  const { layoutConfigs, selectedGroupsRef } = useContext(SettingsContext);
  const layoutConfig = layoutConfigs?.current?.[Math.max(selectedGroupsRef?.current?.length - 1, 0)];
  const { blockMappingRef, blocksByGroupRef, groupMappingRef, groupsByLevelRef, rectsMappingRef } =
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

  const phaseRef = useRef(0);
  const lineRefs = useRef<Record<string, React.MutableRefObject<SVGElement>>>({});
  const lineUpstreamRef = useRef<React.MutableRefObject<any>>(null);
  const lineDownstreamRef = useRef<React.MutableRefObject<any>>(null);
  const portUpstreamRef = useRef<React.MutableRefObject<any>>(null);
  const portDownstreamRef = useRef<React.MutableRefObject<any>>(null);
  const dragControlsUp = useDragControls();
  const dragControlsDn = useDragControls();
  const addingBlockDependencyRef = useRef<BlockType>(null);
  const draggingUpstreamRef = useRef(false);
  const draggingDownstreamRef = useRef(false);
  const upstreamAnimation = useAnimation();
  const downstreamAnimation = useAnimation();
  const animationLineUp = useAnimation();
  const animationLineDn = useAnimation();
  const dragStartPointRef = useRef({ x: 0, y: 0 });
  const foreignObjectAnimation = useAnimation();
  const foreignObjectUpstreamRef = useRef<HTMLDivElement>(null);
  const foreignObjectDownstreamRef = useRef<HTMLDivElement>(null);

  const handleXUp = useMotionValue(0);
  const handleYUp = useMotionValue(0);
  const handleXDn = useMotionValue(0);
  const handleYDn = useMotionValue(0);

  // Child blocks
  const statusByBlockRef = useRef<Record<string, {
    error?: ErrorDetailsType;
    executing?: boolean;
  }>>({});
  const executionResultsByBlockRef = useRef<Record<
    string,
    Record<
      string,
      Record<string, ExecutionResultType>
    >
  >>({});
  const blockGroupStatusRef = useRef<HTMLDivElement>(null);
  const blockGroupStatusRootRef = useRef<Root>(null);

  // Status
  const appOpenRef = useRef<boolean>(false);
  const outputOpenRef = useRef<boolean>(false);

  // Models
  const appNodeRef = useRef<AppNodeType>(null);
  const outputNodeRef = useRef<OutputNodeType>(null);
  const launchOutputCallbackOnceRef = useRef<() => void>(null);

  // Drag wrapper
  const appWrapperRef = useRef<HTMLDivElement>(null);
  const outputWrapperRef = useRef<HTMLDivElement>(null);

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
  const appMountRef = useRef<HTMLDivElement>(null);
  const outputMountRef = useRef<HTMLDivElement>(null);

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
      const idrects = [
        [getLineID(block.uuid, outputNode.id), {
          ...dragRef?.current?.getBoundingClientRect(),
          ...node?.rect,
        }],
      ];

      if (appNode && appOpenRef.current) {
        idrects.push([
          getLineID(appNode.id, outputNode.id),
          rectsMappingRef?.current?.[appNode.id],
        ]);
      }

      idrects.filter(Boolean).forEach(([id, rect]) => {
        [id, `${id}-background`].forEach(i => {
          const el = document.getElementById(i);

          if (el) {
            el.style.display = '';
            el.style.opacity = '';
            el.style.strokeDasharray = '';
          }

          renderLineRef?.current?.(rect, {
            [outputNode.id]: rectsMappingRef?.current?.[outputNode.id],
          });
        });
      });
    }
  }

  const deleteAllOutputs = useCallback((event: ClientEventType, executionOutput?: ExecutionOutputType, opts?: {
    onDelete: (xo: ExecutionOutputType) => void;
  }) => {
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
  }, [codeExecutionEnvironment, executionOutputs, node, removeContextMenu]);

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
                onClick: (event: any) => deleteAllOutputs(event, executionOutput, opts),
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

  function getFilePath(): string {
    const { configuration } = block ?? {};
    const { file } = configuration ?? {};

    return fileRef.current?.path ?? file?.path;
  }

  function getFile(event: any, callback?: () => void) {
    mutations.files.detail.mutate({
      id: getFilePath(),
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
    connectionErrorRef.current = error;
    console.error('[BlockNodeWrapper] connection.error:', error);
  }

  function handleOpen(status: ServerConnectionStatusType) {
    connectionStatusRef.current = status;
  }

  function renderBlockGroupStatus() {
    if (!blockGroupStatusRootRef.current) {
      blockGroupStatusRootRef.current = createRoot(blockGroupStatusRef.current);
    }

    const blocks = Object.values(blocksByGroupRef?.current?.[block.uuid] ?? {}) ?? [];
    const errors = [];
    const runs = [];

    Object.entries(statusByBlockRef.current ?? {}).forEach(([buuid, {
      error,
      executing,
    }]) => {
      if (error) {
        errors.push(error);
      }
      if (executing) {
        runs.push({ uuid: buuid });
      }
    })

    blockGroupStatusRootRef.current.render(
      <ContextProvider theme={themeContext as any}>
        <Grid columnGap={24} style={{ gridTemplateColumns: 'repeat(3, max-content)' }}>
          <Grid alignItems="center" justifyContent="start" autoFlow="column" columnGap={6}>
            <BlockGeneric secondary size={14} />

            <Text secondary semibold small>
              {blocks?.length ?? 0}
            </Text>
          </Grid>

          <Grid alignItems="center" justifyContent="start" autoFlow="column" columnGap={6}>
            <AlertTriangle error={errors?.length > 0} muted={errors?.length === 0} size={14} />

            <Text error={errors?.length > 0} muted={errors?.length === 0} semibold small>
              {errors?.length ?? 0}
            </Text>
          </Grid>

          <Grid alignItems="center" justifyContent="start" autoFlow="column" columnGap={6}>
            <PlayButton muted={runs?.length === 0} success={runs?.length > 0} size={14} />

            <Text muted={runs?.length === 0} success={runs?.length > 0} semibold small>
              {runs?.length ?? 0}
            </Text>
          </Grid>
        </Grid>
      </ContextProvider>,
    );
  }

  function updateChildBlockStatuses(event: EventStreamType, block2: BlockType) {
    Object.entries(executionResultsByBlockRef?.current ?? {}).forEach(([buuid, resultsByMessageRequestUUID]) => {
      Object.values(resultsByMessageRequestUUID ?? {}).forEach((resultsByResultID) => {
        const results = Object.values(resultsByResultID ?? {}) ?? [];
        statusByBlockRef.current[buuid] ||= {
          error: null,
          executing: false,
        }
        statusByBlockRef.current[buuid].error = errorFromResults(results);
        if (block2?.uuid === buuid) {
          statusByBlockRef.current[buuid].executing = !executionDone(event);
        }
      });
    });

    renderBlockGroupStatus();
  }

  function handleChildMessages(event: EventStreamType, block2: BlockType) {
    const result = event?.result;
    if (result) {
      executionResultsByBlockRef.current[block2.uuid] ||= {};

      const mruuid = result.process.message_request_uuid
      if (!executionResultsByBlockRef.current[block2.uuid]?.[mruuid]) {
        // Reset it if its a new message set
        executionResultsByBlockRef.current[block2.uuid][mruuid] = {};
      }
      executionResultsByBlockRef.current[block2.uuid][mruuid][result.result_id] = result;
    }

    updateChildBlockStatuses(event, block2);
  }

  function handleSubscribe(consumerID: string) {
    handleOnMessageRef.current[consumerIDRef.current] = (event: EventStreamType) => {
      const done = executionDone(event);
      setExecuting(!done);
      animateLineRef?.current?.(outputNodeRef?.current?.id, block?.uuid, { stop: done });
      if (appNodeRef?.current) {
        animateLineRef?.current?.(outputNodeRef?.current?.id, appNodeRef?.current?.id, { stop: done });
      }
    };

    subscribe(consumerID, {
      onError: handleError,
      onMessage: (event: EventStreamType) => {
        Object.values(handleOnMessageRef.current ?? {}).forEach(handler => handler(event));

        if (getParentOnMessageHandler) {
          block?.groups?.forEach((guuid: string) => {
            const handler = getParentOnMessageHandler(guuid);
            handler && handler(event, block);
        });
        }
      },
      onOpen: handleOpen,
    });
  }

  const getCode = useCallback(() => getFileCache(getFilePath())?.client?.file?.content, [file]);

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
          animateLineRef?.current?.(outputNodeRef?.current?.id, block?.uuid);
          if (appNodeRef?.current) {
            animateLineRef?.current?.(outputNodeRef?.current?.id, appNodeRef?.current?.id);
          }
          showLinesToOutput();
        }

        const message = getCode();
        executeCode(
          message,
          {
            environment: codeExecutionEnvironment,
            message_request_uuid: messageRequestUUID,
            output_path: getFilePath(),
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
      }

      launchOutput({
        message_request_uuid: messageRequestUUID,
        uuid: channel,
      }, () => {
        if (launchOutputCallbackOnceRef.current) {
          launchOutputCallbackOnceRef.current();
        }
        launchOutputCallbackOnceRef.current = null;
      });

      if (outputRootRef.current) {
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

      const elLoading = ref?.current;

      mutations.blocks.update.mutate({
        event,
        id: encodeURIComponent(block.uuid),
        onError: () => {
          elLoading?.classList?.remove(stylesBlockNode.loading);
        },
        onStart: () => {
          elLoading?.classList?.add(stylesBlockNode.loading);
        },
        onSuccess: () => {
          elLoading?.classList?.remove(stylesBlockNode.loading);
          opts?.callback && opts?.callback?.();
          setTimeout(() => {
            const el = document.getElementById(id);
            el?.focus();
          }, 500);
        },
        payload: setNested(
          {
            configuration: block.configuration,
          },
          key,
          value,
        ),
      });
    }, 1000);
  }

  function closeOutput(callback?: () => void) {
    hideLinesToOutput();

    outputWrapperRef?.current?.classList?.add(stylesPipelineBuilder.hiddenOffscreen);

    // delete handleOnMessageRef.current?.[outputNodeRef?.current?.id];

    outputRootRef?.current?.render(null);
    // setTimeout(() => {
    //   outputRootRef?.current?.unmount();
    //   outputRootRef.current = null;
    // }, 1);
    // outputAppendedChildElementRef?.current?.remove();

    // outputAppendedChildElementRef.current = null;
    // outputWrapperRef.current = null;
    // outputRootRef.current = null;
    // outputNodeRef.current = null;

    if (callback) {
      callback();
    } else if (onCloseOutputRef?.current) {
      onCloseOutputRef?.current?.();
    }

    outputOpenRef.current = false;
  }

  function closeEditorApp(callback?: () => void) {
    hideLinesToOutput({ editorOnly: true });

    appWrapperRef?.current?.classList?.add(stylesPipelineBuilder.hiddenOffscreen);

    // delete handleOnMessageRef.current?.[appNodeRef?.current?.id];
    // delete handleOnMessageRef.current?.[`${appNodeRef?.current?.id}/output`];

    appRootRef?.current && appRootRef?.current?.render(null);
    // appAppendedChildElementRef?.current?.remove();

    // appAppendedChildElementRef.current = null;
    // appWrapperRef.current = null;
    // appMountRef.current = null;
    // appRootRef.current = null;

    if (callback) {
      callback();
    } else if (onCloseAppRef?.current) {
      onCloseAppRef?.current?.();
    }

    // setApps(prev => {
    //   const data = { ...prev };
    //   delete data[appNodeRef?.current?.id];
    //   return data;
    // });

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
          autoFlow="row"
          className={stylesBlockNode.outputContainerHeader}
          templateColumns="1fr"
        >
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

          <Grid
            alignItems="center"
            justifyContent="space-between"
            columnGap={12}
            autoFlow="column"
            templateRows="1fr"
          >
            <Grid
              alignItems="center"
              justifyContent="start"
              columnGap={12}
              padding={6}
              autoFlow="column"
              templateRows="1fr"
            >
              {[
                {
                  Icon: PlayButton,
                  label: 'Run',
                  onClick: submitCodeExecution,
                  // description: '...',
                  // iconProps: stale ? { colorName: 'yellow' } : {},
                  // loading: saving,
                  // onClick: saveContent,
                },
                {
                  Icon: Code,
                  label: 'Edit code',
                  onClick: launchEditorApp,
                  // description: '...',
                },
              ].map(({ Icon, description, iconProps, label, loading, uuid, onClick }: any) => (
                <Button
                  Icon={ip => <Icon {...{ ...ip, size: 12 }} />}
                  data-loading-style="inline"
                  key={uuid ?? typeof label === 'function' ? label?.() : label}
                  loading={loading}
                  onClick={onClick ?? undefined}
                  small
                  basic
                  wrap
                >
                  {label && (
                    <Text secondary xsmall>
                      {typeof label === 'function' ? label?.() : label}
                    </Text>
                  )}
                </Button>
              ))}
            </Grid>
            <Grid
              alignItems="center"
              justifyContent="start"
              columnGap={12}
              padding={6}
              autoFlow="column"
              templateRows="1fr"
            >
              {[
                {
                  Icon: CloseV2,
                  label: 'Close app',
                  onClick: () => closeOutput(),
                  // description: '...',
                  // onClick: onClose,
                },
              ].map(({ Icon, description, iconProps, label, loading, uuid, onClick }: any) => (
                <Button
                  Icon={ip => <Icon {...{ ...ip, size: 12 }} />}
                  data-loading-style="inline"
                  key={uuid ?? typeof label === 'function' ? label?.() : label}
                  loading={loading}
                  onClick={onClick ?? undefined}
                  small
                  basic
                  wrap
                >
                  {label && (
                    <Text secondary xsmall>
                      {typeof label === 'function' ? label?.() : label}
                    </Text>
                  )}
                </Button>
              ))}
            </Grid>
          </Grid>
        </Grid>
      )
    );
  }

  function renderOutput(
    node?: OutputNodeType,
    wrapperRef?: React.MutableRefObject<HTMLDivElement>,
    mountRef?: React.MutableRefObject<HTMLDivElement>,
    opts?: {
      onMount?: () => void;
      rect?: RectType;
    },
  ) {
    if (wrapperRef && wrapperRef.current) {
      outputWrapperRef.current = wrapperRef.current;
    }
    if (mountRef && mountRef.current) {
      outputMountRef.current = mountRef.current;
    }
    if (node) {
      outputNodeRef.current = node;
    }

    // outputWrapperRef.current = wrapperRef.current;
    // outputNodeRef.current = outputNode;
    // outputMountRef.current = mountRef;

    // outputAppendedChildElementRef.current = document.createElement('div');
    // outputAppendedChildElementRef.current.className = stylesBlockNode.inheritDimensions;
    // mountRef.current.appendChild(outputAppendedChildElementRef.current);
    // outputRootRef.current = createRoot(outputAppendedChildElementRef.current);

    const el = (
      <ContextProvider theme={themeContext as any}>
        {renderOutputPortalContent()}
        <div
          className={[
            stylesBlockNode.outputContainer,
            stylesBlockNode.inheritDimensions,
          ].join(' ')}
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
            consumerID={outputNodeRef.current.id}
            executionOutput={{
              messages: [],
              namespace: encodeURIComponent(
                [codeExecutionEnvironment.type, codeExecutionEnvironment.uuid].join(osPath.sep),
              ),
              path: encodeURIComponent(getFilePath()),
              uuid: outputNodeRef.current.process.message_request_uuid,
            }}
            onMount={() => {
              opts?.onMount && opts?.onMount?.();

            }}
            role={ElementRoleEnum.CONTENT}
          />
        </div>
      </ContextProvider>
    );

    if (!outputRootRef.current) {
      outputRootRef.current = createRoot(outputMountRef.current);
    }
    outputRootRef.current.render(el);
    outputOpenRef.current = true;

    outputWrapperRef?.current?.classList?.remove(stylesPipelineBuilder.hiddenOffscreen);
    showLinesToOutput();
  }

  function renderEditorApp(
    node?: AppNodeType,
    wrapperRef?: React.MutableRefObject<HTMLDivElement>,
    mountRef?: React.MutableRefObject<HTMLDivElement>,
    opts?: {
      onMount?: () => void;
      rect?: RectType;
    },
  ) {
    if (wrapperRef && wrapperRef.current) {
      appWrapperRef.current = wrapperRef.current;
    }
    if (mountRef && mountRef.current) {
      appMountRef.current = mountRef.current;
    }
    if (node) {
      appNodeRef.current = node;
    }

    // appMountRef.current = mountRef;

    // appAppendedChildElementRef.current = document.createElement('div');
    // appAppendedChildElementRef.current.className = stylesBlockNode.inheritDimensions;
    // mountRef.current.appendChild(appAppendedChildElementRef.current);
    // appRootRef.current = createRoot(appAppendedChildElementRef.current);

    // DON’T DO THIS or else you get the error about undefined left.
    // if (onCloseAppRef.current) {
    //   onCloseAppRef.current();
    // }

    const el = (
      <ContextProvider theme={themeContext as any}>
        <EditorAppNode
          app={appNodeRef.current}
          block={block}
          dragControls={appDragControls}
          fileRef={fileRef}
          handleContextMenu={handleEditorContextMenu}
          interruptExecution={interruptExecution}
          onClose={() => {
            closeEditorApp();
          }}
          onMount={() => {
            opts?.onMount && opts?.onMount?.();
          }}
          outputGroupsProps={outputGroupsProps}
          setHandleOnMessage={setHandleOnMessage}
          submitCodeExecution={submitCodeExecution}
        />
      </ContextProvider>
    );

    if (!appRootRef.current) {
      appRootRef.current = createRoot(appMountRef.current);
    }

    appRootRef.current.render(el);
    appOpenRef.current = true;
    appWrapperRef?.current?.classList?.remove(stylesPipelineBuilder.hiddenOffscreen);

    // return el;

    // setApps(prev => ({
    //   ...prev,
    //   [appNode.id]: {
    //     ...appNode,
    //     ref: appMountRef.current,
    //   },
    // }));
  }

  function launchOutput(outputProcess?: {
    message_request_uuid: string;
    uuid: string;
  }, callback?: () => void) {
    // console.log('launchOutput', outputRootRef.current, outputWrapperRef.current);

    if (outputRootRef.current && outputMountRef.current) {
      renderOutput(null, null, null, {
        onMount: () => {
          callback && callback?.();
        },
      });
      return;
    };

    const __render = (
      node: OutputNodeType,
      wrapperRef: React.MutableRefObject<HTMLDivElement>,
      mountRef: React.MutableRefObject<HTMLDivElement>,
      {
        onMount,
        rect,
      },
    ) => {
      // console.log('__render', node, wrapperRef.current);

      renderOutput(node, wrapperRef, mountRef, {
        rect,
        onMount: () => {
          onMount && onMount();
          callback && callback();
        },
      });
    };

    showOutput(
      {
        process: outputProcess,
      },
      __render,
      closeOutput,
      onRemove => onCloseOutputRef.current = onRemove,
      {
        dragControls: outputDragControls,
      },
    );
  }

  function launchEditorApp(event: any, callback?: () => void) {
    if (appRootRef.current && appMountRef.current) {
      renderEditorApp(null, null, null, {
        onMount: () => {
          callback && callback?.();
        },
      });
      return;
    };

    const app = {
      subtype: AppSubtypeEnum.CANVAS,
      type: AppTypeEnum.EDITOR,
      uuid: [block.uuid, AppTypeEnum.EDITOR, AppSubtypeEnum.CANVAS].join(':'),
    };

    const __render = (
      node: AppNodeType,
      wrapperRef: React.MutableRefObject<HTMLDivElement>,
      mountRef: React.MutableRefObject<HTMLDivElement>,
      {
        onMount,
        rect,
      },
    ) => {
      renderEditorApp(node, wrapperRef, mountRef, {
        rect,
        onMount: () => {
          onMount && onMount();
          callback && callback();
        },
      });
    }
    const __show = () =>
      showApp(
        app,
        __render,
        closeEditorApp,
        onRemove => {
          onCloseAppRef.current = onRemove;
        },
        {
          dragControls: appDragControls,
        },
      );

    if (getFilePath() && fileRef.current?.content) {
      __show();
    } else {
      getFile(event, __show);
    }
  }

  useEffect(() => {
    consumerIDRef.current = block.uuid;

    if (isGroup) {
      renderBlockGroupStatus();
    }

    if (setHandleOnChildMessage) {
      setHandleOnChildMessage(handleChildMessages);
    }

    // This will auto-launch the editor app for blocks without templates from their groups.
    // This gets annoying when adding existing blocks from the file browser.
    // if (block?.uuid in (recentlyAddedBlocksRef?.current ?? {})
    //   && objectSize(block?.configuration?.templates ?? {}) === 0
    // ) {
    //   timeoutLaunchEditorAppOnMountRef.current = setTimeout(() => {
    //     launchEditorApp(null);
    //   }, 1000);
    // }

    const consumerID = consumerIDRef.current;
    const timeout = timeoutRef.current;
    const timeoutLaunch = timeoutLaunchEditorAppOnMountRef.current;

    phaseRef.current += 1;

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
  }, [setSelectedGroup, removeContextMenu]);

  const buildMenuItemsForTemplates = useCallback((block2: BlockType) => menuItemsForTemplates(
    block2,
    (event: any, block3, template, callback, payloadArg) => {
      const blocks = Object.values(blocksByGroupRef?.current?.[block3.uuid] ?? {}) ?? [];
      const upb = blocks?.length === 1
        ? blocks[0]
        : blocks?.find(b => ((b as BlockType)?.downstream_blocks?.length ?? 0) === 0);
      // console.log(blocks)

      const payload = {
        groups: [block3.uuid],
        upstream_blocks: upb ? [(upb as BlockType).uuid] : [],
        name: capitalize(generateUUID()),
        ...payloadArg,
      };

      if (template?.uuid) {
        payload.configuration = {
          templates: {
            [template.uuid]: template,
          },
        };
      }

      mutations.blocks.create.mutate({
        event,
        onSuccess: () => {
          removeContextMenu(event);
          callback && callback?.();
        },
        payload,
      });
    },
  ), [mutations.blocks.create, removeContextMenu, blocksByGroupRef]);

  const buildContextMenuItemsForGroupBlock = useCallback(
    (block2: BlockType) => [
      {
        uuid: block2?.name ?? block2?.uuid,
      },
      {
        Icon: AddV2UpsideDown,
        items: buildMenuItemsForTemplates(block2),
        uuid: 'Add block',
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
    [mutations.blocks, groupSelection, removeContextMenu, setSelectedGroup, teleportIntoBlock, buildMenuItemsForTemplates],
  );

  const handleLinePathContextMenu = useCallback((
    event, block, blockdn, lineID, foreignObjectRef
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const color = getBlockColor(block?.type, { getColorName: true })?.names?.base;
    const colordn = getBlockColor(blockdn?.type, { getColorName: true })?.names?.base;

    handleContextMenu(event, [
      {
        Icon: BranchAlt,
        description: () => (
          <Grid autoFlow="column" columnGap={8} alignItems="center">
            <Text colorName={color} secondary={!color} xsmall>
              {block.name ?? block.uuid}
            </Text>

            <PaginateArrowRight secondary size={8} />

            <Text colorName={colordn} secondary={!colordn} xsmall>
              {blockdn?.name ?? blockdn?.uuid}
            </Text>
          </Grid>
        ),
        onClick: (eventClick) => {
          const fo = foreignObjectRef?.current;
          fo?.classList?.add(stylesPipelineBuilder.show);
          mutations.blocks.update.mutate({
            event: eventClick,
            id: encodeURIComponent(block.uuid),
            onError: () => {
              fo?.classList?.remove(stylesPipelineBuilder.show);
            },
            onSuccess: () => {
              fo?.classList?.remove(stylesPipelineBuilder.show);
              removeContextMenu(event);
            },
            payload: {
              downstream_blocks: block.downstream_blocks.filter(b => b !== blockdn.uuid),
            },
          }, {}, {
            updateLayout: true,
          });
        },
        uuid: 'Remove connection',
      }
    ]);
  }, [block, handleContextMenu, removeContextMenu, mutations.blocks.update]);

  const linePathsMemo = useMemo(() => {
    if (block?.groups?.length > 0
      || !block?.type
      || [BlockTypeEnum.GROUP].includes(block?.type)
    ) return;

    const rectup = rectsMappingRef?.current?.[block.uuid] ?? node?.rect;

    if (!rectup) return;

    const svgs = [];

    const __build = (rectdn, idx, onContextMenu, lineRef?: React.MutableRefObject<any>, style?: any) => {
      // console.log(block?.uuid, buuid, rectup, rectdn)

      const { lineID } = prepareLinePathProps(rectup, rectdn, {
        blocksByGroup: blocksByGroupRef?.current,
        blockMapping: blockMappingRef?.current,
        groupMapping: groupMappingRef?.current,
        ...layoutConfig?.current,
      });

      if (!lineRef) {
        lineRefs.current[lineID] ||= createRef();
      }

      const linePath = buildPaths(
        rectup,
        rectdn,
        idx,
        {
          blocksByGroup: blocksByGroupRef?.current,
          blockMapping: blockMappingRef?.current,
          groupMapping: groupMappingRef?.current,
          layout: layoutConfig?.current,
          lineRef: lineRef ?? lineRefs.current[lineID],
          onContextMenu,
          visibleByDefault: true,
        },
      );

      return (
        <ConnectionLines
          className={stylesPipelineBuilder.blockConnectionLines}
          style={style ?? {}}
          key={linePath.id}
          linePaths={{
            [linePath.id]: [linePath],
          }}
        />
      );
    };

    (block?.downstream_blocks ?? [])?.forEach((buuid: string, idx: number) => {
      const rectdn = rectsMappingRef?.current?.[buuid];

      if (!rectdn) return;

      svgs.push(__build(
        rectdn, idx,
        (event, lineID, foreignObjectRef) => handleLinePathContextMenu(
          event, block, blockMappingRef.current?.[buuid], lineID, foreignObjectRef)
        ),
      );
    });

    const color = getBlockColor(block?.type, { getColorName: true })?.names?.base;
    const circleProps = {
      cx: CIRCLE_SIZE,
      cy: CIRCLE_SIZE,
      r: CIRCLE_SIZE / 2,
      stroke: 'none',
      strokeWidth: 1,
      fill: `var(--colors-${color?.toLowerCase()})`,
    };
    const motionProps = {
      className: stylesPipelineBuilder.hidden,
      drag: true,
      dragMomentum: false,
      dragPropogation: false,
      onDrag: handleDragging,
      onDragEnd: handleDragEnd,
      onPointerUp: handlePointerUp,
      whileDrag: {
        cursor: 'grabbing',
        // scale: [1.0],
        // transition: {
        //   duration: 2,
        //   repeat: Infinity,
        // },
      },
    };
    const pathProps = {
      className: stylesPipelineBuilder.hidden,
      fill: 'none',
      strokeWidth: 1.5,
    };

    svgs.push(
      <ConnectionLines
        className={stylesPipelineBuilder.blockConnectionLines}
        key="ports"
        style={{
          zIndex: 6,
        }}
        linePaths={{
          ports: [
            {
              key: 'ports',
              id: 'ports',
              paths: [
                <motion.path
                  {...pathProps}
                  animate={animationLineUp}
                  initial={{
                    opacity: 0,
                    pathLength: 0,
                  }}
                  key="lineup"
                  ref={lineUpstreamRef as any}
                />,
                <motion.path
                  {...pathProps}
                  animate={animationLineDn}
                  initial={{
                    opacity: 0,
                    pathLength: 0,
                  }}
                  key="linedn"
                  ref={lineDownstreamRef as any}
                />,
                // If we want the circle on top, we need to put this here.
                <motion.circle
                  {...circleProps}
                  {...motionProps}
                  animate={upstreamAnimation}
                  dragControls={dragControlsUp}
                  key="up"
                  ref={portUpstreamRef as any}
                  style={{
                    x: handleXUp,
                    y: handleYUp,
                  }}
                />,
                <motion.circle
                  {...circleProps}
                  {...motionProps}
                  animate={downstreamAnimation}
                  dragControls={dragControlsDn}
                  key="down"
                  ref={portDownstreamRef as any}
                  style={{
                    x: handleXDn,
                    y: handleYDn,
                  }}
                />,
                <motion.foreignObject
                  animate={foreignObjectAnimation}
                  key="foreign-object-loader-upstream"
                  ref={foreignObjectUpstreamRef as any}
                  style={{
                    translateX: 0.5,
                    translateY: 0.5,
                    height: CIRCLE_SIZE,
                    width: CIRCLE_SIZE,
                    x: handleXUp,
                    y: handleYUp,
                  }}
                >
                  <Loading circle />
                </motion.foreignObject>,
                <motion.foreignObject
                  animate={foreignObjectAnimation}
                  key="foreign-object-loader-downstream"
                  ref={foreignObjectDownstreamRef as any}
                  style={{
                    translateX: 0.5,
                    translateY: 0.5,
                    height: CIRCLE_SIZE,
                    width: CIRCLE_SIZE,
                    x: handleXDn,
                    y: handleYDn,
                  }}
                >
                  <Loading circle />
                </motion.foreignObject>,
              ],
            },
          ],
        }}
      />
    );

    return <>{svgs}</>;
  }, [block, node, rectsMappingRef.current, handleLinePathContextMenu, layoutConfig]);

  function getLineFromRect() {
    let yoff = CIRCLE_PORT_SIZE / 2;

    let xoff = draggingUpstreamRef.current ? CIRCLE_PORT_SIZE : CIRCLE_PORT_SIZE;

    return {
      left: (dragStartPointRef.current.x + xoff),
      top: (dragStartPointRef.current.y + yoff),
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
    };
  }

  function getToRect(event: any) {
    return {
      height: CIRCLE_SIZE,
      left: event?.pageX,
      top: event?.pageY,
      width: CIRCLE_SIZE,
    };
  }

  function getLinePathD(event: any) {
    const rectFrom = getLineFromRect();
    const rectTo = getToRect(event);

    const dx = rectTo.left - rectFrom.left;
    const dy = rectTo.top - rectFrom.top;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const directionHorizontal = Math.abs(dx) > Math.abs(dy);
    const denom = directionHorizontal ? window.innerWidth : window.innerHeight;

    const adjustedCurveControl = Math.min(0.5, distance / denom); // Adjust curve based on distance, with a minimum value

    let xoff = 0;
    let yoff = 0;

    return getPathD(
      {
        curveControl: adjustedCurveControl,
        fromPosition: draggingUpstreamRef.current ? 'left' : 'right',
        toPosition: directionHorizontal
          ? (draggingUpstreamRef.current  ? 'right' : 'left')
          : (draggingUpstreamRef.current  ? 'bottom' : 'top'),
      },
      rectFrom,
      {
        ...rectTo,
        left: rectTo.left + xoff,
        top: rectTo.top + yoff,
      },
    );
  }

  function handleDragging(event: any, info: DragInfo) {
    if (!draggingUpstreamRef.current && !draggingDownstreamRef.current) return;

    const animationLine = draggingUpstreamRef.current ? animationLineUp : animationLineDn;

    const rectTo = getToRect(event);
    const intersectingRect =
      Object.values(rectsMappingRef.current ?? {}).find(r => doesRectIntersect(r as RectType, rectTo));

    const block2 = intersectingRect ? intersectingRect.block : null;

    let color = getBlockColor(block?.type, { getColorName: true })?.names?.base;
    if (block2) {
      color = getBlockColor(block2?.type, { getColorName: true })?.names?.base;
    }

    animationLine.set({
      d: getLinePathD(event),
      stroke: `var(--colors-${color?.toLowerCase()})`,
      opacity: 1,
      pathLength: 1,
    });
  }

  function handleDragEnd(event: any, info: DragInfo) {
    draggingUpstreamRef.current = false;
    draggingDownstreamRef.current = false;

    const rectTo = getToRect(event);
    const intersectingRect =
      Object.values(rectsMappingRef.current ?? {}).find(r => doesRectIntersect(r as RectType, rectTo));

    const block2 = intersectingRect ? intersectingRect.block : null;
    if (!addingBlockDependencyRef.current && block2 && block2?.uuid !== block.uuid) {
      const key = draggingUpstreamRef.current ? 'upstream_blocks' : 'downstream_blocks';
      addingBlockDependencyRef.current = block2;
      mutations.blocks.update.mutate({
        event,
        id: encodeURIComponent(block.uuid),
        onError: () => {
          resetDragging();
        },
        payload: {
          [key]: unique((block[key] ?? []).concat(block2.uuid), buuid => buuid),
        },
      }, {}, {
        updateLayout: true,
      });
    }

    resetDragging();
  }

  function handlePointerUp(event: any, info?: DragInfo) {;
    draggingUpstreamRef.current = false;
    draggingDownstreamRef.current = false;

    const rectTo = getToRect(event);
    const intersectingRect =
      Object.values(rectsMappingRef.current ?? {}).find(r => doesRectIntersect(r as RectType, rectTo));

    const block2 = intersectingRect ? intersectingRect.block : null;
    if (!addingBlockDependencyRef.current && block2 && block2?.uuid !== block.uuid) {
      const key = draggingUpstreamRef.current ? 'upstream_blocks' : 'downstream_blocks';
      addingBlockDependencyRef.current = block2;
      mutations.blocks.update.mutate({
        event,
        id: encodeURIComponent(block.uuid),
        onError: () => {
          resetDragging();
        },
        payload: {
          [key]: unique((block[key] ?? []).concat(block2.uuid), buuid => buuid),
        },
      }, {}, {
        updateLayout: true,
      });
    }

    resetDragging();
  }

  function resetDragging() {
    [portUpstreamRef, portUpstreamRef, lineUpstreamRef, lineDownstreamRef,
      foreignObjectUpstreamRef, foreignObjectDownstreamRef,
      ].forEach((portRef) => {
      portRef?.current?.classList?.add(stylesPipelineBuilder.hidden);
    });

    draggingUpstreamRef.current = false;
    draggingDownstreamRef.current = false;
    addingBlockDependencyRef.current = null;

    if (phaseRef.current > 0) {
      [upstreamAnimation, downstreamAnimation].forEach((animation) => {
        animation.set({
          x: 0,
          y: 0,
        });
      });
      [animationLineUp, animationLineDn].forEach((animation) => {
        animation.set({
          opacity: 0,
          pathLength: 0,
        });
      });
      foreignObjectAnimation.set({
        x: 0,
        y: 0,
      });
    }
  }

  function handleDragStart(event: any) {
    const port = draggingUpstreamRef.current ? portUpstreamRef.current : portDownstreamRef.current;
    const line = draggingUpstreamRef.current ? lineUpstreamRef.current : lineDownstreamRef.current;
    const controls = draggingUpstreamRef.current ? dragControlsUp : dragControlsDn;
    const animation = draggingUpstreamRef.current ? upstreamAnimation : downstreamAnimation;
    const foreignObject = draggingUpstreamRef.current ? foreignObjectUpstreamRef.current : foreignObjectDownstreamRef.current;

    const { left, width, top, height } = event?.target?.getBoundingClientRect();

    dragStartPointRef.current = {
      x: (left - width) - (transformState?.current?.originX?.current ?? 0),
      y: (top - height) - (transformState?.current?.originY?.current ?? 0),
    };

    controls.start(event);
    animation.set(dragStartPointRef.current);

    [port, line, foreignObject].forEach((ref) => {
      ref?.classList?.remove(stylesPipelineBuilder.hidden);
    });
  }

  function startDragControlsUp(event) {
    resetDragging();
    draggingUpstreamRef.current = true;
    handleDragStart(event);
  }

  function startDragControlsDn(event) {
    resetDragging();
    draggingDownstreamRef.current = true;
    handleDragStart(event);
  }

  return (
    <>
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

                    mutations.blocks.delete.mutate({
                      event,
                      id: encodeURIComponent(block.uuid),
                      onSuccess: ({ data }) => {
                        closeEditorApp();
                        closeOutput();
                        removeContextMenu(event);
                      },
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
          blockGroupStatusRef={blockGroupStatusRef}
          buildContextMenuItemsForGroupBlock={buildContextMenuItemsForGroupBlock}
          code={fileRef.current?.content}
          dragRef={dragRef}
          executing={executing}
          groupSelection={groupSelection}
          interruptExecution={interruptExecution}
          loading={loading}
          menuItemsForTemplates={buildMenuItemsForTemplates(block)}
          loadingKernelMutation={loadingKernelMutation}
          node={node}
          openEditor={launchEditorApp}
          submitCodeExecution={submitCodeExecution}
          teleportIntoBlock={teleportIntoBlock}
          timerStatusRef={timerStatusRef}
          updateBlock={updateBlock}
          dragControlsUp={startDragControlsUp}
          dragControlsDn={startDragControlsDn}
        />

        {linePathPortalRef?.current && linePathsMemo && createPortal(linePathsMemo, linePathPortalRef.current)}
      </div>
    </>
  );
}

function areEqual(p1: BlockNodeType, p2: BlockNodeType) {
  return p1.block.uuid === p2.block.uuid && p1?.groupSelection === p2?.groupSelection;
}

export default React.memo(React.forwardRef(BlockNode), areEqual);

export { BADGE_HEIGHT, PADDING_VERTICAL, SELECTED_GROUP_NODE_MIN_WIDTH };
