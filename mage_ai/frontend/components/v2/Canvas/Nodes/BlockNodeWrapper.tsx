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
import { ElementRoleEnum } from '@mana/shared/types';
import {
  Add, CaretDown, Check, ArrowsAdjustingFrameSquare, PipeIconVertical, PlayButtonFilled,
  Infinite,
} from '@mana/icons';
import { setNested } from '@utils/hash';

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

  const { onMouseDown, onMouseLeave, onMouseOver, onMouseUp } = handlers;

  const block = useMemo(() => item?.block, [item]);
  const { type, uuid } = useMemo(() => ({ type: block?.type, uuid: block?.uuid }) || {}, [block]);
  const isGroup = useMemo(() => !item?.block?.type || item?.block?.type === BlockTypeEnum.GROUP, [item]);

  const name = useMemo(
    () => (ItemTypeEnum.BLOCK === item?.type
      ? item?.block?.name ?? item?.block?.uuid
      : item?.title ?? item?.id),
    [item],
  );

  const buildEvent = useCallback(
    (event: any, operation?: EventOperationEnum) =>
      update(event, {
        data: {
          $set: {
            block,
            node: item,
          },
        },
        operationTarget: {
          $set: itemRef,
        },
        operationType: {
          $set: operation,
        },
      }) as any,
    [block, item],
  );

  const updateBlock = useCallback((
    event: ClientEventType | Event, key: string, value: any) => {
    submitEventOperation(
      buildEvent(event as any, EventOperationEnum.MUTATE_MODEL_BLOCK), {
      handler: (e, { blocks }) => {
        blocks.update.mutate({
          event,
          payload: setNested({ ...block }, key, value),
        });
      },
    });
  }, [block, buildEvent, submitEventOperation]);

  function handleMouseDown(event: ClientEventType) {
    event.stopPropagation();
    onMouseDown && onMouseDown?.(buildEvent(event, EventOperationEnum.DRAG_START));
  }

  function handleMouseLeave(event: ClientEventType) {
    onMouseLeave && onMouseLeave?.(buildEvent(event));
  }

  function handleMouseOver(event: ClientEventType) {
    onMouseOver && onMouseOver?.(buildEvent(event));
  }

  function handleMouseUp(event: ClientEventType) {
    onMouseUp && onMouseUp?.(buildEvent(event, EventOperationEnum.DRAG_END));
  }

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
        const computedStyle =
          typeof window !== 'undefined' && window.getComputedStyle(itemRef.current);
        if (computedStyle) {
          onMountItem?.(item, itemRef);
        } else {
          timeoutRef.current = setTimeout(checkComputedStyles, 100);
        }
      };

      setTimeout(checkComputedStyles, 100);
    }
    phaseRef.current += 1;

    const timeout = timeoutRef.current;
    return () => {
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requiredGroup = isGroup && (item?.block?.configuration as ConfigurationType)?.metadata?.required;
  const emptyGroup = isGroup && (item as NodeType)?.items?.length === 0;

  const blockNode = (
    <BlockNode
      block={block}
      borderConfig={{
        borders,
      }}
      draggable={draggable}
      handlers={{
        ...handlers,
        onMouseDown: handleMouseDown,
        onMouseUp: handleMouseUp,
      }}
      item={item}
      onMount={onMount}
      updateBlock={updateBlock}
      titleConfig={{
        asides: {
          after: {
            className: styles.showOnHover,
            ...(ItemTypeEnum.NODE === item?.type
              ? {
                Icon: draggable ? ArrowsAdjustingFrameSquare : Add,
                onClick: event => handleClickGroupMenu(event, item as NodeType, submitEventOperation, itemRef),
              }
              : {
                Icon: draggable ? ArrowsAdjustingFrameSquare : CaretDown,
                onClick: () => alert('Coding...'),
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

  const sharedProps = useMemo(() => ({
    className: [
      styles.blockNodeWrapper,
      stylesBuilder.level,
      stylesBuilder[`level-${item?.level}`],
      item?.type && stylesBuilder[item?.type],
      !emptyGroup && !draggable && !droppable && styles.showOnHoverContainer,
      loading && styles.loading,
    ]?.filter(Boolean)?.join(' '),
    role: ElementRoleEnum.BLOCK,
  }), [draggable, droppable, loading, emptyGroup, item]);

  if (Wrapper) {
    return (
      <Wrapper
        {...sharedProps}
        draggable={draggable}
        draggingNode={draggingNode}
        droppable={droppable}
        handlers={{
          ...handlers,
          onMouseDown: handleMouseDown,
          onMouseLeave: handleMouseLeave,
          onMouseOver: !draggable && handleMouseOver,
          onMouseUp: handleMouseUp,
        }}
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
  const equal = p1?.version === p2?.version
    && p1.draggable === p2.draggable
    && p1.droppable === p2.droppable
    && [
      'height',
      'left',
      'top',
      'width',
    ].every((key: string) => p1?.rect?.[key] === p2?.rect?.[key]);

  return equal;
}

export default React.memo(BlockNodeWrapper, areEqual);
