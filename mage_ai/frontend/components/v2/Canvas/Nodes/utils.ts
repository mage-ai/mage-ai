import BlockType, { BlockTypeEnum, TemplateType } from '@interfaces/BlockType';
import { ColorNameType, getBlockColor } from '@mana/themes/blocks';
import PipelineType from '@interfaces/PipelineType';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import update from 'immutability-helper';
import { generateUUID } from '@utils/uuids/generator';
import { ButtonEnum } from '@mana/shared/enums';
import { CSSProperties } from 'react';
import { EventOperationEnum, SubmitEventOperationType } from '@mana/shared/interfaces';
import { NodeType, NodeItemType, RectType } from '../interfaces';
import { ItemTypeEnum } from '../types';
import { DragAndDropHandlersType, DraggableType } from './types';
import { countOccurrences, flattenArray, sortByKey } from '@utils/array';
import { ClientEventType } from '@mana/shared/interfaces';
import { DEBUG } from '../../utils/debug';

export function buildEvent(
  event: any,
  operation: EventOperationEnum,
  item: NodeItemType,
  itemRef: DraggableType['itemRef'],
  block: BlockType,
) {
  return update(event, {
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
  }) as any;
}

export function setupDraggableHandlers(
  handlers: DragAndDropHandlersType['handlers'],
  item: NodeItemType,
  itemRef: DraggableType['itemRef'],
  block: BlockType,

) {
  const { onMouseDown, onMouseLeave, onMouseOver, onMouseUp } = handlers;

  function handleMouseDown(event: ClientEventType) {
    event.stopPropagation();
    const event2 = buildEvent(event, EventOperationEnum.DRAG_START, item, itemRef, block);

    DEBUG.dragging && console.log('BlockNodeWrapper.handleMouseDown', event2, onMouseDown);

    onMouseDown && onMouseDown?.(event2);
  }

  function handleMouseLeave(event: ClientEventType) {
    DEBUG.dragging && console.log('handleMouseLeave', event);
    onMouseLeave && onMouseLeave?.(buildEvent(event, null, item, itemRef, block));
  }

  function handleMouseOver(event: ClientEventType) {
    DEBUG.dragging && console.log('handleMouseOver', event);
    onMouseOver && onMouseOver?.(buildEvent(event, null, item, itemRef, block));
  }

  function handleMouseUp(event: ClientEventType) {
    DEBUG.dragging && console.log('handleMouseUp', event);
    onMouseUp && onMouseUp?.(buildEvent(event, EventOperationEnum.DRAG_END, item, itemRef, block));
  }

  return {
    ...handlers,
    onMouseDown: handleMouseDown,
    onMouseLeave: handleMouseLeave,
    onMouseOver,
    onMouseUp: handleMouseUp,
  };
}

export function getColorNamesFromItems(items: NodeType[]): ColorNameType[] {
  return items?.map?.((item: NodeType) => {
    if (ItemTypeEnum.NODE === item?.type) {
      // Use the color of the most common block type in the group.
      const typeCounts = Object.entries(
        countOccurrences(flattenArray(
          (item as NodeType)?.items?.map((i: NodeItemType) => i?.block?.type) || [])) ?? {},
      )?.map(([type, count]) => ({ count, type }));

      const modeTypes = sortByKey(typeCounts, ({ count }) => count, { ascending: false });
      const modeType = modeTypes?.length >= 2 ? modeTypes?.[0]?.type : item?.block?.type;
      const colors = getBlockColor(modeType as BlockTypeEnum, { getColorName: true })?.names;

      return colors?.base ? colors : { base: 'gray' };
    }

    const c = getBlockColor(item?.block?.type as BlockTypeEnum, { getColorName: true });

    return c && c?.names ? c?.names : { base: 'gray' } as ColorNameType;
  }) as ColorNameType[];
}

export function getDraggableStyles(
  rect: RectType,
  {
    draggable,
    isDragging,
  }: {
    draggable?: boolean;
    isDragging?: boolean;
  },
): CSSProperties {
  const { left, top, width, zIndex } = rect || ({} as RectType);
  const transform = `translate3d(${left ?? 0}px, ${top ?? 0}px, 0)`;

  return {
    WebkitTransform: transform,
    // backgroundColor: canDrop ? (isOverCurrent ? 'blue' : backgroundColor) : backgroundColor,
    // border: '1px dashed gray',
    // IE fallback: hide the real node using CSS when dragging
    // because IE will ignore our custom "empty image" drag preview.
    position: 'absolute',
    transform,
    zIndex,
    ...(draggable ? { cursor: 'move' } : {}),
    ...(isDragging
      ? { height: 0, opacity: 0 }
      : {
        minHeight: rect?.height === Infinity || rect?.height === -Infinity ? 0 : rect?.height ?? 0,
      }),
    ...((width ?? false) ? { minWidth: width } : {}),
  };
}

export function handleClickGroupMenu(
  event: any,
  itemClicked: NodeType,
  submitEventOperation: SubmitEventOperationType,
  itemRef: any,
) {
  function extractTemplatesFromItem(block: FrameworkType) {
    const { configuration } = block as PipelineExecutionFrameworkBlockType;

    return Object.entries(configuration?.templates ?? {})?.map(
      ([templateUUID, template]) => ({
        description: () => template?.description,
        label: () => template?.name || templateUUID,
        onClick: (event: any) => handleGroupTemplateSelect(event, block, template, submitEventOperation),
        uuid: templateUUID,
      }),
    );
  }

  function extractTemplatesFromChidlren(block: FrameworkType) {
    const { children } = block;
    if (children) {
      const arr = [];

      return flattenArray(children?.map((child) => {
        const items = extractTemplatesFromChidlren(child);
        if (!items?.length) return [];

        return [
          ...(arr.length >= 1 ? [{ divider: true }] : []),
          {
            items,
            uuid: child?.name || child?.uuid,
            // Count of templates; doesn’t look great right now...
            // uuid: `${child?.name || child?.uuid} templates`
            //   + (items?.length >= 1
            //     ? ` (${items.length})`
            //     : ''),
          },
        ];
      }));
    }

    return extractTemplatesFromItem(block);
  }

  const menuItems = extractTemplatesFromChidlren(itemClicked?.block);

  submitEventOperation(
    update(event, {
      button: { $set: ButtonEnum.CONTEXT_MENU },
      data: {
        $set: {
          node: itemClicked,
        },
      },
      operationTarget: { $set: event.target },
      operationType: { $set: EventOperationEnum.CONTEXT_MENU_OPEN },
    }),
    {
      args: itemClicked?.block
        ? [
          [
            ...(menuItems?.length >= 1 ? [{ uuid: 'Templates' }] : []),
            ...menuItems,
          ],
        ]
        : [],
      kwargs: {
        boundingContainer: itemRef?.current?.getBoundingClientRect(),
      },
    },
  );
}

function handleGroupTemplateSelect(
  event: any,
  block: FrameworkType,
  template: TemplateType,
  submitEventOperation: SubmitEventOperationType,
) {
  submitEventOperation(event, {
    handler: (e, { pipelines }, { removeContextMenu }) => {
      pipelines.update.mutate({
        event: e,
        onSuccess: () => {
          removeContextMenu(e);
        },
        payload: (pipeline: PipelineType) => ({
          ...pipeline,
          blocks: [
            ...(pipeline?.blocks ?? []),
            {
              configuration: {
                templates: {
                  [template.uuid]: template,
                },
              },
              groups: [block.uuid],
              uuid: generateUUID(),
            },
          ],
        }),
      });
    },
  });
}
