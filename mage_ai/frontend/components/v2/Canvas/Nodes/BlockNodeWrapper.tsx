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
import { setNested } from '@utils/hash';
import { areEqualRects, areDraggableStylesEqual } from './equals';
import { setupDraggableHandlers, buildEvent } from './utils';
import { draggableProps } from './draggable/utils';
import { DEBUG } from '@components/v2/utils/debug';

export type BlockNodeWrapperProps = {
  Wrapper?: React.FC<NodeWrapperProps>;
  collapsed?: boolean;
  draggable?: boolean;
  droppable?: boolean;
  loading?: boolean;
  onMountItem: (item: NodeItemType, ref: React.RefObject<HTMLDivElement>) => void;
  onMountPort: (port: PortType, ref: React.RefObject<HTMLDivElement>) => void;
  rect: RectType;
  selected?: boolean;
  submitEventOperation: SubmitEventOperationType;
  version?: number | string;
} & NodeWrapperProps;

export const BlockNodeWrapper: React.FC<BlockNodeWrapperProps & NodeWrapperProps> = ({
  Wrapper,
  collapsed,
  draggable = false,
  droppable = false,
  item,
  handlers,
  loading = false,
  onMountPort,
  onMountItem,
  rect,
  selected = false,
  submitEventOperation,
}) => {
  const itemRef = useRef(null);
  const phaseRef = useRef(0);
  const timeoutRef = useRef(null);
  const portElementRefs = useRef<Record<string, any>>({});
  const [draggingNode] = useState<NodeItemType | null>(null);

  const block = useMemo(() => item?.block, [item]);
  const { type, uuid } = useMemo(() => ({ type: block?.type, uuid: block?.uuid }) || {}, [block]);
  const isGroup = useMemo(() => !item?.block?.type || item?.block?.type === BlockTypeEnum.GROUP, [item]);

  const name = useMemo(
    () => (ItemTypeEnum.BLOCK === item?.type
      ? item?.block?.name ?? item?.block?.uuid
      : item?.title ?? item?.id),
    [item],
  );

  const updateBlock = useCallback((
    event: ClientEventType | Event, key: string, value: any) => {
    submitEventOperation(
      buildEvent(
        event as any,
        EventOperationEnum.MUTATE_MODEL_BLOCK,
        item, itemRef, block,
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
  }, [block, item, itemRef, submitEventOperation]);

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
    if (ItemTypeEnum.NODE === item?.type) {
      // Use the color of the most common block type in the group.
      const typeCounts = Object.entries(
        countOccurrences(flattenArray((item as NodeType)?.items?.map(i => i?.block?.type) || [])) ?? {},
      )?.map(([type, count]) => ({ type, count }));

      const modeTypes = sortByKey(typeCounts, ({ count }) => count, { ascending: false });
      const modeType = modeTypes?.length >= 2 ? modeTypes?.[0]?.type : item?.block?.type;
      const colors = getBlockColor(modeType as BlockTypeEnum, { getColorName: true })?.names;

      return colors?.base ? colors : { base: 'gray' };
    }

    const c = getBlockColor(type as BlockTypeEnum, { getColorName: true });
    return c && c?.names ? c?.names : { base: 'gray' };
  }, [item, type]);

  const ports = useMemo(() => item?.ports ?? [], [item]);

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
          console.log(`[BlockNodeWrapper] Error getting computed style: ${e}`, item, itemRef?.current);
          computedStyle = true;
        }
        if (computedStyle) {
          clearTimeout(timeout);
          DEBUG.state && console.log('BlockNodeWrapper mounted', phaseRef.current, item, itemRef?.current);
          onMountItem?.(item, itemRef);
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

  const requiredGroup = isGroup && (item?.block?.configuration as ConfigurationType)?.metadata?.required;
  const emptyGroup = isGroup && (item as NodeType)?.items?.length === 0;

  const draggingHandlers = setupDraggableHandlers(
    handlers, item, itemRef, block,
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
      item={item}
      onMount={onMount}
      updateBlock={updateBlock}
      titleConfig={{
        asides: {
          after: {
            className: styles.showOnHover,
            ...(ItemTypeEnum.NODE === item?.type
              ? {
                Icon: draggable ? Grab : AddV2,
                onClick: event => handleClickGroupMenu(event, item as NodeType, submitEventOperation, itemRef),
              }
              : {
                Icon: draggable ? Grab : Code,
                onClick: event => submitEventOperation(buildEvent(
                  event, EventOperationEnum.APP_START, item, itemRef, block,
                ), {
                  args: [
                    AppTypeEnum.EDITOR,
                    AppSubtypeEnum.CANVAS,
                  ],
                }),
              }),
          },
          before: {
            Icon: StatusTypeEnum.EXECUTED === block?.status ? Check : PlayButtonFilled,
            baseColorName:
              StatusTypeEnum.FAILED === block?.status
                ? 'red'
                : StatusTypeEnum.EXECUTED
                  ? 'green'
                  : 'blue',
            onClick: event => console.log(event),
          },
        },
        badge:
          ItemTypeEnum.NODE === item?.type
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

  const sharedProps = useMemo(() => draggableProps({
    draggable,
    droppable,
    emptyGroup,
    item,
    loading,
    classNames: [
      item?.status && styles[item?.status],
    ],
  }), [draggable, droppable, loading, emptyGroup, item]);

  if (Wrapper) {
    return (
      <Wrapper
        {...sharedProps}
        draggingNode={draggingNode}
        handlers={draggingHandlers}
        item={item}
        itemRef={itemRef}
        rect={rect}
      >
        {blockNode}
      </Wrapper>
    );
  }

  return <div {...sharedProps} ref={itemRef}>{blockNode}</div>;
};

export function areEqual(p1: BlockNodeWrapperProps, p2: BlockNodeWrapperProps) {
  const appIDs = ({ item }) => item?.apps?.map(a => String(a?.id ?? '')).sort()?.join('|');

  const equal = appIDs(p1) === appIDs(p2)
    && p1.droppable === p2.droppable
    && areDraggableStylesEqual(p1, p2)
    && areEqualRects(p1, p2);

  DEBUG.state && console.log('[BlockNodeWrapper] areEqual', equal, p1, p2);
  return equal;
}

export default React.memo(BlockNodeWrapper, areEqual);
