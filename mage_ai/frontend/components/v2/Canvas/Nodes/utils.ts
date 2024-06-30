import { TemplateType } from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import update from 'immutability-helper';
import { generateUUID } from '@utils/uuids/generator';
import { ButtonEnum } from '@mana/shared/enums';
import { CSSProperties } from 'react';
import { EventOperationEnum, SubmitEventOperationType } from '@mana/shared/interfaces';
import { NodeType, NodeItemType, RectType } from '../interfaces';
import { flattenArray } from '@utils/array';

export function getStyles(
  item: NodeItemType,
  {
    draggable,
    isDragging,
    rect,
  }: {
    draggable?: boolean;
    isDragging?: boolean;
    rect?: RectType;
  },
): CSSProperties {
  const { id, type } = item;
  rect = rect ?? item?.rect;
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
