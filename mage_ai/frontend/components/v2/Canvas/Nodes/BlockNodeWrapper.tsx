import React from 'react';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import update from 'immutability-helper';
import PipelineType from '@interfaces/PipelineType';
import { BlockNode } from './BlockNode';
import { ClientEventType, EventOperationEnum, SubmitEventOperationType } from '@mana/shared/interfaces';
import { ItemTypeEnum } from '../types';
import { NodeItemType, NodeType, PortType, RectType } from '../interfaces';
import { StatusTypeEnum, BlockTypeEnum } from '@interfaces/BlockType';
import { countOccurrences, flattenArray, sortByKey } from '@utils/array';
import { getBlockColor } from '@mana/themes/blocks';
import { handleClickGroupMenu } from './utils';
import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { NodeWrapperProps } from './NodeWrapper';
import { ConfigurationType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { AppTypeEnum, AppSubtypeEnum } from '../../Apps/constants';
import { ElementRoleEnum } from '@mana/shared/types';
import {
  AddV2, Code, Check, Grab, PipeIconVertical, PlayButtonFilled,
  Infinite,
} from '@mana/icons';
import useExecutable from './useExecutable';
import { setNested } from '@utils/hash';
import { areEqualRects, areDraggableStylesEqual } from './equals';
import { setupDraggableHandlers, buildEvent } from './utils';
import { draggableProps } from './draggable/utils';
import { FileType } from '../../IDE/interfaces';
import { getFileCache, updateFileCache } from '../../IDE/cache';
import { CanvasNodeType } from './interfaces';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from '../../Apps/PipelineCanvas/useAppEventsHandler';
import { DEBUG } from '@components/v2/utils/debug';

export type BlockNodeWrapperProps = {
  Wrapper?: React.FC<NodeWrapperProps>;
  collapsed?: boolean;
  droppable?: boolean;
  loading?: boolean;
  onMountItem: (item: NodeItemType, ref: React.RefObject<HTMLDivElement>) => void;
  onMountPort: (port: PortType, ref: React.RefObject<HTMLDivElement>) => void;
  submitEventOperation: SubmitEventOperationType;
  selected?: boolean;
  version?: number | string;
} & NodeWrapperProps & CanvasNodeType;

export const BlockNodeWrapper: React.FC<BlockNodeWrapperProps & NodeWrapperProps> = ({
  Wrapper,
  collapsed,
  draggable = false,
  droppable = false,
  node,
  handlers,
  loading = false,
  onMountPort,
  onMountItem,
  rect,
  registerConsumer,
  selected = false,
  submitEventOperation,
}) => {
  const itemRef = useRef(null);
  const phaseRef = useRef(0);
  const timeoutRef = useRef(null);
  const portElementRefs = useRef<Record<string, any>>({});
  const [draggingNode] = useState<NodeItemType | null>(null);

  const block = useMemo(() => node?.block, [node]);
  const file = block?.configuration?.file;
  const { type, uuid } = useMemo(() => ({ type: block?.type, uuid: block?.uuid }) || {}, [block]);
  const isGroup = useMemo(() => !node?.block?.type || node?.block?.type === BlockTypeEnum.GROUP, [node]);

  const { executeCode, setContainer } = useExecutable(block?.uuid, String(node?.id), registerConsumer);

  const { convertEvent, dispatchAppEvent, subscribe } = useAppEventsHandler(node);

  function submitCodeExecution(event: React.MouseEvent<HTMLElement>) {
    submitEventOperation(
      buildEvent(event as any, EventOperationEnum.EXECUTE_CODE, node, itemRef, block), {
      handler: (e, { browserItems }) => {
        const submitExecuteCode = (message: string) => {
          if (!message) {
            alert('No code to execute.');
            return;
          }

          const [process, handler] = executeCode(message, {
            future: true,
          });
          subscribe({
            [process.message_request_uuid]: (event: CustomAppEvent) => {
              setContainer(event.detail.event.operationTarget as React.RefObject<HTMLDivElement>);
              handler();
            },
          })

          dispatchAppEvent(CustomAppEventEnum.CODE_EXECUTION_SUBMITTED, {
            block,
            event: convertEvent(event, {
              itemRef,
            }),
            node,
            options: {
              kwargs: {
                process,
              },
            },
          });
        };

        const path = file?.path;
        const code = getFileCache(path)?.client?.file?.content;

        if (code ?? false) {
          submitExecuteCode(code);
        } else {
          browserItems.detail.mutate({
            event,
            id: path,
            onError: () => {
              // stop loading
            },
            onStart: () => {
              // set loading
            },
            onSuccess: ({ data: { browser_item: item } }: { data: { browser_item: FileType } }) => {
              updateFileCache({ client: item });
              submitExecuteCode(item.content);
            },
          });
        }
      },
    });
  }

  const name = useMemo(
    () => (ItemTypeEnum.BLOCK === node?.type
      ? block?.name ?? block?.uuid
      : node?.title ?? node?.id),
    [block, node],
  );

  const updateBlock = useCallback((
    event: ClientEventType | Event, key: string, value: any) => {
    submitEventOperation(
      buildEvent(
        event as any,
        EventOperationEnum.MUTATE_MODEL_BLOCK,
        node, itemRef, block,
      ), {
      handler: (e, { blocks }) => {
        blocks.update.mutate({
          event,
          onError: () => {
            itemRef.current.classList.remove(styles.loading);
          },
          onStart: () => {
            itemRef.current.classList.add(styles.loading);
          },
          onSuccess: () => {
            itemRef.current.classList.remove(styles.loading);
          },
          payload: setNested({ ...block }, key, value),
        });
      },
    });
  }, [block, node, itemRef, submitEventOperation]);

  function onMount(port: PortType, portRef: React.RefObject<HTMLDivElement>) {
    if (!(port?.id in portElementRefs.current)) {
      portElementRefs.current[port?.id] = {
        port,
        portRef,
      };
      onMountPort(port, portRef);
    }
  }
  const names = useMemo(() => {
    if (ItemTypeEnum.NODE === node?.type) {
      // Use the color of the most common block type in the group.
      const typeCounts = Object.entries(
        countOccurrences(flattenArray((node as NodeItemType)?.items?.map(i => i?.block?.type) || [])) ?? {},
      )?.map(([type, count]) => ({ type, count }));

      const modeTypes = sortByKey(typeCounts, ({ count }) => count, { ascending: false });
      const modeType = modeTypes?.length >= 2 ? modeTypes?.[0]?.type : node?.block?.type;
      const colors = getBlockColor(modeType as BlockTypeEnum, { getColorName: true })?.names;

      return colors?.base ? colors : { base: 'gray' };
    }

    const c = getBlockColor(type as BlockTypeEnum, { getColorName: true });
    return c && c?.names ? c?.names : { base: 'gray' };
  }, [node, type]);

  const ports = useMemo(() => node?.ports ?? [], [node]);

  const borders = useMemo(() => {
    const arr = [names?.base || ''];
    ports?.forEach(({ target }) => {
      const cn = getBlockColor(target?.block?.type as BlockTypeEnum, { getColorName: true })?.names
        ?.base;
      if (!arr.includes(cn)) {
        arr.push(cn);
      }
    });

    const c = arr?.reduce((acc, c) => (c ? acc.concat({ baseColorName: c }) : acc), []);
    if (!c?.length) {
      if (selected) {
        c.push(...[{ baseColorName: 'red' }, { baseColorName: 'yellow' }]);
      } else {
        c.push({ baseColorName: 'gray' });
      }
    }

    if (!selected) {
      return c.slice(0, 1);
    }

    return c;
  }, [names, ports, selected]);

  useEffect(() => {
    if (itemRef.current && phaseRef.current === 0 && onMountItem) {
      const checkComputedStyles = () => {
        if (phaseRef.current >= 1) return;

        clearTimeout(timeout);
        let computedStyle = null;
        try {
          computedStyle =
            typeof window !== 'undefined' && window?.getComputedStyle(itemRef?.current);
        } catch (e) {
          console.log(`[BlockNodeWrapper] Error getting computed style: ${e}`, node, itemRef?.current);
          computedStyle = true;
        }
        if (computedStyle) {
          clearTimeout(timeout);
          DEBUG.state && console.log('BlockNodeWrapper mounted', phaseRef.current, node, itemRef?.current);
          onMountItem?.(node, itemRef);
          phaseRef.current += 1;
        } else {
          timeoutRef.current = setTimeout(checkComputedStyles, 100);
        }
      };

      setTimeout(checkComputedStyles, 100);
    }

    const timeout = timeoutRef.current;
    return () => {
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draggingHandlers = setupDraggableHandlers(
    handlers, node, itemRef, block,
  );

  const blockNode = (
    <BlockNode
      block={block}
      borderConfig={{
        borders,
      }}
      colorNames={names}
      draggable={draggable}
      handlers={draggingHandlers}
      item={node}
      onMount={onMount}
      updateBlock={updateBlock}
      titleConfig={{
        asides: {
          after: {
            className: styles.showOnHover,
            ...(ItemTypeEnum.NODE === node?.type
              ? {
                Icon: draggable ? Grab : AddV2,
                onClick: event => handleClickGroupMenu(event, node as NodeType, submitEventOperation, itemRef),
              }
              : {
                Icon: draggable ? Grab : Code,
                onClick: event => submitEventOperation(buildEvent(
                  event, EventOperationEnum.APP_START, node, itemRef, block,
                ), {
                  args: [
                    AppTypeEnum.EDITOR,
                    AppSubtypeEnum.CANVAS,
                  ],
                }),
              }),
          },
          before: {
            Icon: PlayButtonFilled,
            baseColorName:
              StatusTypeEnum.FAILED === block?.status
                ? 'red'
                : StatusTypeEnum.EXECUTED === block?.status
                  ? 'green'
                  : 'blue',
            onClick: submitCodeExecution,
          },
        },
        badge:
          ItemTypeEnum.NODE === node?.type
            ? {
              Icon: collapsed ? Infinite : PipeIconVertical,
              baseColorName: names?.base || 'purple',
              label: String(name || uuid || ''),
            }
            : undefined,
        label: String(name || uuid || ''),
      }}
    />
  );


  const requiredGroup = isGroup && (block?.configuration as ConfigurationType)?.metadata?.required;
  const emptyGroup = isGroup && (node as NodeType)?.items?.length === 0;
  const sharedProps = useMemo(() => draggableProps({
    draggable,
    droppable,
    emptyGroup,
    node,
    requiredGroup,
    loading,
    classNames: [
      node?.status && styles[node?.status],
    ],
  }), [draggable, droppable, loading, requiredGroup, emptyGroup, node]);

  if (Wrapper) {
    return (
      <Wrapper
        {...sharedProps}
        draggingNode={draggingNode}
        handlers={draggingHandlers}
        node={node}
        nodeRef={itemRef}
        rect={rect}
      >
        {blockNode}
      </Wrapper>
    );
  }

  return <div {...sharedProps} ref={itemRef}>{blockNode}</div>;
};

export function areEqual(p1: BlockNodeWrapperProps, p2: BlockNodeWrapperProps) {
  const appIDs = ({ node }) => node?.apps?.map(a => String(a?.id ?? '')).sort()?.join('|');

  const equal = appIDs(p1) === appIDs(p2)
    && p1.droppable === p2.droppable
    && areDraggableStylesEqual(p1, p2)
    && areEqualRects(p1, p2);

  DEBUG.state && console.log('[BlockNodeWrapper] areEqual', equal, p1, p2);
  return equal;
}

export default React.memo(BlockNodeWrapper, areEqual);
