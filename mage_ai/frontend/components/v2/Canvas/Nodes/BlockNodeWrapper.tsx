import React from 'react';
import update from 'immutability-helper';
import { BlockNode } from './BlockNode';
import { StatusTypeEnum, BlockTypeEnum, TemplateType } from '@interfaces/BlockType';
import { NodeWrapper, NodeWrapperProps } from './NodeWrapper';
import { getBlockColor } from '@mana/themes/blocks';
import {
  Add,
  CaretDown,
  Check,
  Code,
  ArrowsAdjustingFrameSquare,
  PipeIconVertical,
  PlayButtonFilled,
  Infinite,
} from '@mana/icons';
import { createRef, useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { NodeItemType, PortType, DragItem } from '../interfaces';
import { countOccurrences, flattenArray, sortByKey } from '@utils/array';
import { dig } from '@utils/hash';
import { ItemTypeEnum } from '../types';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { isDebug } from '@utils/environment';
import {
  ClientEventType,
  EventOperationEnum,
  SubmitEventOperationType,
} from '@mana/shared/interfaces';
import { ButtonEnum } from '@mana/shared/enums';
import { MenuItemType } from '@mana/components/Menu/interfaces';

type BlockNodeWrapperProps = {
  collapsed?: boolean;
  draggable?: boolean;
  droppable?: boolean;
  onMountItem: (item: DragItem, ref: React.RefObject<HTMLDivElement>) => void;
  onMountPort: (port: PortType, ref: React.RefObject<HTMLDivElement>) => void;
  frameworkGroups: Record<GroupUUIDEnum, Record<string, any>>;
  selected?: boolean;
  submitEventOperation: SubmitEventOperationType;
  version?: number | string;
} & NodeWrapperProps;

const BlockNodeWrapper: React.FC<BlockNodeWrapperProps> = ({
  collapsed,
  draggable = false,
  droppable = false,
  frameworkGroups,
  item,
  handlers,
  onMountPort,
  onMountItem,
  selected = false,
  submitEventOperation,
}) => {
  const itemRef = useRef(null);
  const phaseRef = useRef(0);
  const timeoutRef = useRef(null);
  const portElementRefs = useRef<Record<string, any>>({});
  const [draggingNode, setDraggingNode] = useState<NodeItemType | null>(null);

  const block = item?.block;
  const { pipeline, type, uuid } = block || {};
  const isPipeline = useMemo(() => type && BlockTypeEnum.PIPELINE === type, [type]);
  const isGroup = useMemo(() => type && BlockTypeEnum.GROUP === type, [type]);

  const { onMouseDown, onMouseLeave, onMouseOver, onMouseUp } = handlers;
  const name = useMemo(
    () => (ItemTypeEnum.BLOCK === item?.type ? item?.block?.name ?? item?.block?.uuid : item?.id),
    [item],
  );

  const buildEvent = useCallback(
    (event: any, operation?: EventOperationEnum) =>
      update(event, {
        data: {
          $set: {
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
    [item],
  );

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
  const groups = useMemo(
    () =>
      block?.groups?.reduce(
        (acc, group) => ({
          ...acc,
          [group]: frameworkGroups?.[group],
        }),
        {},
      ),
    [block, frameworkGroups],
  );

  const names = useMemo(() => {
    if (BlockTypeEnum.PIPELINE === type) {
      const typeCounts = countOccurrences(flattenArray(pipeline?.blocks?.map(b => b?.type) || []));
      const modeType = sortByKey(Object.entries(typeCounts || {}), arr => arr[1], {
        reverse: true,
      })[0];
      const colors = getBlockColor(modeType as BlockTypeEnum, { getColorName: true })?.names;
      return colors?.base ? colors : { base: 'gray' };
    }

    const c = getBlockColor(type as BlockTypeEnum, { getColorName: true });
    return c && c?.names ? c?.names : { base: 'gray' };
  }, [pipeline, type]);

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

  function handleGroupTemplateSelect(event: any, item1: NodeItemType, template: TemplateType) {
    console.log('ADDDDDDDDDDDDDDDDDDDDDD', event, item1, template);
  }

  function handleClickGroupMenu(event: any) {
    event.preventDefault();
    submitEventOperation(
      update(event, {
        button: { $set: ButtonEnum.CONTEXT_MENU },
        data: {
          $set: {
            node: item,
          },
        },
        operationTarget: { $set: event.target },
        operationType: { $set: EventOperationEnum.CONTEXT_MENU_OPEN },
      }),
      {
        args: [
          [
            {
              uuid: `Templates for ${item?.block?.name}`,
            },
            ...Object.entries(item?.block?.configuration?.templates ?? {})?.map(
              ([uuid, template]) => ({
                description: () => template?.description,
                onClick: (event: any) => handleGroupTemplateSelect(event, item, template),
                label: () => template?.name,
                uuid,
              }),
            ),
          ],
        ],
        kwargs: {
          boundingContainer: itemRef?.current?.getBoundingClientRect(),
        },
      },
    );
  }

  return (
    <NodeWrapper
      className={[
        stylesBuilder.level,
        stylesBuilder[`level-${item?.level}`],
        !draggable && !droppable && styles.showOnHoverContainer,
      ]
        ?.filter(Boolean)
        ?.join(' ')}
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
    >
      <BlockNode
        block={block}
        borderConfig={{
          borders,
        }}
        draggable={draggable}
        groups={groups}
        handlers={{
          ...handlers,
          onMouseDown: handleMouseDown,
          onMouseUp: handleMouseUp,
        }}
        item={item}
        onMount={onMount}
        titleConfig={{
          asides: {
            after: {
              className: styles.showOnHover,
              ...(isGroup
                ? {
                    Icon: draggable ? ArrowsAdjustingFrameSquare : Add,
                    onClick: handleClickGroupMenu,
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
            },
          },
          badge:
            isPipeline || isGroup
              ? {
                  Icon: collapsed ? Infinite : PipeIconVertical,
                  baseColorName: names?.base || 'purple',
                  label: String(name || uuid || ''),
                }
              : undefined,
          label: String(name || uuid || ''),
        }}
      />
    </NodeWrapper>
  );
};

function areEqual(prevProps: BlockNodeWrapperProps, nextProps: BlockNodeWrapperProps) {
  const keys = ['item.version', 'draggable', 'droppable'];
  return keys?.every((key: string) => dig(prevProps, key) === dig(nextProps, key));
}

export default React.memo(BlockNodeWrapper, areEqual);
