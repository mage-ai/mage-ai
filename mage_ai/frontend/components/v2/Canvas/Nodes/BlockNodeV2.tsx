import BlockNodeComponent, { BADGE_HEIGHT, PADDING_VERTICAL } from './BlockNode';
import Circle from '@mana/elements/Circle';
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
import EventStreamType, { ExecutionResultType, ServerConnectionStatusType } from '@interfaces/EventStreamType';
import React, { useState, useCallback, useContext, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import stylesBlockNode from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { AppConfigType } from '../../Apps/interfaces';
import { AppSubtypeEnum, AppTypeEnum } from '@components/v2/Apps/constants';
import { ElementRoleEnum } from '@mana/shared/types';
import { EventContext } from '../../Apps/PipelineCanvas/Events/EventContext';
import { FileType } from '@components/v2/IDE/interfaces';
import { AppNodeType, NodeType, OutputNodeType } from '../interfaces';
import { CloseV2, CopyV2, OpenInSidekick, Trash } from '@mana/icons';
import { ThemeContext } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';
import { executionDone } from '@components/v2/ExecutionManager/utils';
import { getClosestRole } from '@utils/elements';
import { getFileCache, updateFileCache } from '../../IDE/cache';
import { setNested } from '@utils/hash';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import Divider from '@mana/elements/Divider';

type BlockNodeType = {
  block: BlockType;
  dragRef?: React.MutableRefObject<HTMLDivElement>;
  index?: number;
  groupSelection?: boolean;
  node: NodeType;
  showApp?: (
    appConfig: AppConfigType,
    render: (appNode: AppNodeType, mountRef: React.MutableRefObject<HTMLDivElement>) => void,
    onCloseRef: React.MutableRefObject<() => void>,
  ) => void;
  showOutput?: (
    channel: string,
    render: (outputNode: OutputNodeType, mountRef: React.MutableRefObject<HTMLDivElement>) => void,
    onCloseRef: React.MutableRefObject<() => void>,
  ) => void;
};

const STEAM_OUTPUT_DIR = 'code_executions';

function BlockNode({
  block,
  dragRef,
  node,
  groupSelection,
  showApp,
  showOutput,
  ...rest
}: BlockNodeType, ref: React.MutableRefObject<HTMLElement>) {
  const themeContext = useContext(ThemeContext);
  const { handleMouseDown } = useContext(EventContext);
  const { selectedGroupsRef } = useContext(SettingsContext);
  const { blockMappingRef, blocksByGroupRef, groupMappingRef, groupsByLevelRef } = useContext(ModelContext);

  const { configuration, name, type } = block;
  const { file } = configuration ?? {};

  const consumerIDRef = useRef<string>(null);
  const timeoutRef = useRef(null);
  const connectionErrorRef = useRef(null);
  const connectionStatusRef = useRef<ServerConnectionStatusType>(null);
  const handleOnMessageRef = useRef<Record<string, (event: EventStreamType) => void>>({});
  const handleResultMappingUpdateRef =
    useRef<Record<string, (resultMapping: Record<string, ExecutionResultType>) => void>>({});

  const [apps, setApps] = useState<Record<string, AppNodeType>>({});
  const appRef = useRef<AppNodeType>(null);
  const appNodeRef = useRef<React.RefObject<HTMLElement>>(null);
  const outputRef = useRef<OutputNodeType>(null);
  const appRootRef = useRef<Root>(null);
  const outputRootRef = useRef<Root>(null);
  const outputPortalRef = useRef<HTMLDivElement>(null);
  const onCloseOutputRef = useRef<() => void>(null);
  const onCloseAppRef = useRef<() => void>(null);
  const executionResultMappingRef = useRef<Record<string, ExecutionResultType>>({});
  const launchOutputCallbackOnceRef = useRef<() => void>(null);

  const outputGroupsProps = useMemo(() => ({
    handleContextMenu: (event: any, resultsInit: ExecutionResultType[]) => {
      event.preventDefault();
      event.stopPropagation();
      handleContextMenu(event, [
        {
          Icon: CloseV2,
          onClick: (event2: ClientEventType) => {
            removeContextMenu(event2);
            closeOutput();
          },
          uuid: 'Close output',
        },
        {
          Icon: CopyV2,
          onClick: (event2: ClientEventType) => {
            removeContextMenu(event2);
            const results: ExecutionResultType[] = sortByKey(resultsInit ?? [],
              (result: ExecutionResultType) => result?.timestamp);
            const text = results?.map((result: ExecutionResultType) =>
              (result?.output_text ?? '')?.trim() ?? '').join('\n');
            console.log(text);
            copyToClipboard(text);
          },
          uuid: 'Copy output',
        },
        {
          Icon: Trash,
          onClick: (event: ClientEventType) => {
            mutations.files.update.mutate({
              event,
              id: file?.path,
              onSuccess: ({ data }) => {
                removeContextMenu(event);
                fileRef.current = data?.browser_item;
                fileRef.current.output = [];
                updateOutputResults();

                updateFileCache({
                  server: data?.browser_item,
                });
              },
              payload: {
                output: [],
              },
              query: {
                output_namespace: STEAM_OUTPUT_DIR,
              },
            });
          },
          uuid: 'Delete output',
        },
      ], {
        reduceItems: (i1) => i1,
      });
    },
    onMount: () => {
      updateOutputResults();
    },
    setHandleOnMessage: (consumerID, handler) => {
      handleOnMessageRef.current[consumerID] = handler;
    },
    setResultMappingUpdate: (consumerID, handler) => {
      handleResultMappingUpdateRef.current[consumerID] = handler;
    },
  }), []);

  // APIs
  const fileRef = useRef<FileType>(null);
  const { mutations } = useContext(ModelContext);

  // Attributes
  const isGroup =
    useMemo(() => !type || [BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(type), [type]);
  const [executing, setExecuting] = useState(false);

  // Controls
  const timerStatusRef = useRef(null);

  const { handleContextMenu, removeContextMenu, setSelectedGroup,
    useExecuteCode, useRegistration,
  } = useContext(EventContext);

  // Methods
  const channel = useMemo(() => block.uuid, [block]);
  const { executeCode } = useExecuteCode(channel, STEAM_OUTPUT_DIR);
  const { subscribe, unsubscribe } = useRegistration(channel, STEAM_OUTPUT_DIR);

  function updateOutputResults() {
    executionResultMappingRef.current =
      indexBy(fileRef.current?.output ?? [], r => r.result_id);

    Object.values(handleResultMappingUpdateRef.current ?? {}).forEach(
      handler => handler(executionResultMappingRef.current ?? {}),
    );
  }

  function getFile(event: any, callback?: () => void) {
    const { configuration } = block ?? {};
    const { file } = configuration ?? {};

    mutations.files.detail.mutate({
      event,
      id: file?.path,
      onSuccess: ({ data }) => {
        fileRef.current = data?.browser_item;
        updateOutputResults();

        updateFileCache({
          server: data?.browser_item,
        });
        callback && callback?.();
      },
      query: {
        output_namespace: STEAM_OUTPUT_DIR,
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
      if (event?.result) {
        executionResultMappingRef.current[event.result.result_id] = event?.result;
      }
      setExecuting(!executionDone(event));
    };

    subscribe(consumerID, {
      onError: handleError,
      onMessage: (event: EventStreamType) => {
        Object.values(handleOnMessageRef.current ?? {}).forEach(handler => handler(event));
      },
      onOpen: handleOpen,
    });
  }

  const getCode = useCallback(() =>
    getFileCache(file?.path)?.client?.file?.content, [file]);

  const submitCodeExecution = useCallback((event: React.MouseEvent<HTMLElement>) => {
    handleSubscribe('BlockNode');

    const execute = () => {
      const message = getCode();
      executeCode(message, {
        output_dir: file?.path ?? null,
        source: block.uuid,
      }, {
        future: true,
        onError: () => {
          getClosestRole(event.target as HTMLElement, [ElementRoleEnum.BUTTON]);
          setExecuting(false);
        },
      });

      setExecuting(true);
    };

    launchOutputCallbackOnceRef.current = () => {
      getFile(event, execute);
    };
    launchOutput(channel, () => {
      if (launchOutputCallbackOnceRef.current) {
        launchOutputCallbackOnceRef.current();
      }
      launchOutputCallbackOnceRef.current = null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, node, executeCode]);

  function updateBlock(event: any, key: string, value: any) {
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
        },
        payload: {
          block: setNested({
            configuration: block.configuration,
            uuid: block.uuid,
          }, key, value),
        },
      });
    }, 1000);
  }

  function closeOutput() {
    delete handleOnMessageRef.current?.[outputRef?.current?.id];
    outputRootRef?.current && outputRootRef?.current?.unmount();
    outputRootRef.current = null;
    onCloseOutputRef && onCloseOutputRef?.current?.();
  }

  function closeEditorApp() {
    delete handleOnMessageRef.current?.[appRef?.current?.id];
    delete handleOnMessageRef.current?.[`${appRef?.current?.id}/output`];
    appRootRef?.current && appRootRef?.current?.unmount();

    appNodeRef.current = null;
    appRootRef.current = null;

    onCloseAppRef && onCloseAppRef?.current?.();
    setApps(prev => {
      const data = { ...prev };
      delete data[appRef?.current?.id];
      return data;
    });
  }

  function renderOutputPortalContent() {
    const groupsInLevel = groupsByLevelRef?.current?.[selectedGroupsRef?.current?.length - 2];
    const {
      downstreamInGroup,
      modeColor,
      groupColor,
      upstreamInGroup,
    } = getUpDownstreamColors(block, groupsInLevel, blocksByGroupRef?.current, {
      blockMapping: blockMappingRef?.current,
      groupMapping: groupMappingRef?.current,
    });
    return (
      <Grid
        alignItems="center"
        autoColumns="auto"
        autoFlow="column"
        columnGap={8}
        justifyContent="space-between"
        padding={6}
        templateColumns="1fr 1fr"
        templateRows="1fr"
      >
        <Grid
          alignItems="center"
          autoColumns="auto"
          autoFlow="column"
          columnGap={8}
          justifyContent="start"
          templateColumns="auto"
          templateRows="1fr"
        >
          <Circle backgroundColor={modeColor ?? groupColor} size={12} />

          <Text small>
            {block?.name ?? block?.uuid}
          </Text>
        </Grid>

        <Grid
          alignItems="center"
          autoColumns="auto"
          autoFlow="column"
          columnGap={8}
          justifyContent="end"
          templateColumns="max-content"
          templateRows="1fr"
        >
          {downstreamInGroup &&
            <Circle backgroundColor={downstreamInGroup?.[0]?.colorName ?? 'gray'} size={12} />}
        </Grid>
      </Grid>
    );
  }

  function renderOutput(mountRef: React.RefObject<HTMLElement>, outputNode: OutputNodeType) {
    outputRef.current = outputNode;
    outputRootRef.current = createRoot(mountRef.current);
    outputRootRef.current.render(
      <ContextProvider theme={themeContext}>
        <div
          onMouseDown={event => {
            handleMouseDown({
              ...event,
              operationType: EventOperationEnum.DRAG_START,
            });
          }}
          role={ElementRoleEnum.DRAGGABLE}
        >
          <OutputGroups
            {...outputGroupsProps}
            consumerID={outputNode.id}
            role={ElementRoleEnum.CONTENT}
          >
            <div ref={outputPortalRef} />
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
    appRef.current = appNode;
    appNodeRef.current = mountRef;

    appRootRef.current = createRoot(mountRef.current);
    appRootRef.current.render(
      <ContextProvider theme={themeContext}>
        <EditorAppNode
          {...outputGroupsProps}
          app={appNode}
          block={block}
          fileRef={opts?.fileRef ?? fileRef}
          onClose={() => {
            closeEditorApp();
          }}
          submitCodeExecution={submitCodeExecution}
        />
      </ContextProvider>,
    );

    setApps(prev => ({
      ...prev,
      [appNode.id]: {
        ...appNode,
        ref: appNodeRef.current,
      },
    }));
  }

  function launchOutput(channel: string, callback?: () => void) {
    if (outputRootRef.current) {
      callback && callback?.();
    } else {
      showOutput(channel, (outputNode: OutputNodeType, mountRef: React.RefObject<HTMLDivElement>) => {
        renderOutput(mountRef, outputNode);
        callback && callback?.();
      }, onCloseOutputRef);
    }
  }

  function launchEditorApp(event: any) {
    if (appRootRef.current) return;

    const app = {
      subtype: AppSubtypeEnum.CANVAS,
      type: AppTypeEnum.EDITOR,
      uuid: [block.uuid, AppTypeEnum.EDITOR, AppSubtypeEnum.CANVAS].join(':'),
    };

    const render = () => showApp(app, (appNode: AppNodeType, mountRef: React.RefObject<HTMLDivElement>) => {
      renderEditorApp(mountRef, appNode, {
        fileRef,
      });
    }, onCloseAppRef);

    if (fileRef.current ?? false) {
      render();
    } else {
      getFile(event, () => render());
    }
  }

  useEffect(() => {
    consumerIDRef.current = block.uuid;
    const consumerID = consumerIDRef.current;
    const timeout = timeoutRef.current;

    return () => {
      clearTimeout(timeout);
      timeoutRef.current = null;
      unsubscribe(consumerID);

      closeEditorApp();
      appRootRef.current = null;

      closeOutput();
      outputRootRef.current = null;

      executionResultMappingRef.current = {};
      handleOnMessageRef.current = {};
      handleResultMappingUpdateRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={[
        stylesBlockNode.blockNodeWrapper,
        groupSelection && stylesBlockNode.groupSelection,
        executing && stylesBlockNode.executing,
      ].filter(Boolean).join(' ')}
      onContextMenu={(event: any) => {
        if (groupSelection || event.metaKey) return;

        event.preventDefault();
        event.stopPropagation();

        const items = [];

        if (isGroup) {
          items.push({
            Icon: OpenInSidekick,
            onClick: (event: ClientEventType) => {
              event?.preventDefault();
              setSelectedGroup(block);
              removeContextMenu(event);
            },
            uuid: `Teleport into ${block?.name}`,
          });
        } else {
          items.push({
            Icon: Trash,
            onClick: (event: ClientEventType) => {
              event?.preventDefault();

              mutations.pipelines.update.mutate({
                event,
                onSuccess: () => {
                  removeContextMenu(event);
                },
                payload: (pipeline) => ({
                  ...pipeline,
                  blocks: pipeline?.blocks?.filter((b: BlockType) => b.uuid !== block.uuid),
                }),
              });
            },
            uuid: `Remove ${name} from pipeline`,
          });
        }

        handleContextMenu(event, items, {
          reduceItems: (i1) => i1,
        });
      }}
      ref={ref as React.RefObject<HTMLDivElement>}
    >
      <BlockNodeComponent
        {...rest}
        apps={apps}
        block={block}
        dragRef={dragRef}
        executing={executing}
        groupSelection={groupSelection}
        node={node}
        openEditor={launchEditorApp}
        submitCodeExecution={submitCodeExecution}
        timerStatusRef={timerStatusRef}
        updateBlock={updateBlock}
      />

      {outputPortalRef?.current && createPortal(renderOutputPortalContent(), outputPortalRef.current)}
    </div>
  );
}

function areEqual(p1: BlockNodeType, p2: BlockNodeType) {
  return p1.block.uuid === p2.block.uuid
    && p1?.groupSelection === p2?.groupSelection;
}

export default React.memo(React.forwardRef(BlockNode), areEqual);

export { BADGE_HEIGHT, PADDING_VERTICAL };
