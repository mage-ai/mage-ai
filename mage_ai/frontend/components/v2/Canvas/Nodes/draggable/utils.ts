import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { CSSProperties } from 'react';
import { ElementRoleEnum } from '@mana/shared/types';
import { ItemTypeEnum } from '../../types';
import { NodeItemType } from '../../interfaces';
import { RectType } from '@mana/shared/interfaces';

export function getStyles(
  node: NodeItemType,
  {
    draggable,
    groupSelection,
    rect,
  }: {
    draggable?: boolean;
    groupSelection?: boolean;
    rect?: RectType;
  },
): CSSProperties {
  const { type } = node;

  const { height, left, top, width } = {
    height: undefined,
    left: undefined,
    top: undefined,
    width: undefined,
    ...rect,
  } as any;
  const transform = `translate3d(${left ?? 0}px, ${top ?? 0}px, 0)`;

  return {
    WebkitTransform: transform,
    // backgroundColor: canDrop ? (isOverCurrent ? 'blue' : backgroundColor) : backgroundColor,
    // border: '1px dashed gray',
    // IE fallback: hide the real node using CSS when dragging
    // because IE will ignore our custom "empty image" drag preview.
    position: 'absolute',
    transform,
    ...([
      ItemTypeEnum.APP,
      ItemTypeEnum.NODE,
      ItemTypeEnum.OUTPUT,
    ].includes(type)
      ? {
          height,
        }
      : {}),
    ...(width ?? false ? { minWidth: width } : {}),
    ...(groupSelection ? { height, width } : {}),
    // Only certain parts are draggable
    // ...(draggable ? { cursor: 'move' } : {}),
  };
}

export function draggableProps({
  classNames,
  draggable,
  droppable,
  emptyGroup,
  excludeClassNames,
  requiredGroup,
  node,
  loading,
}: {
  classNames?: string[];
  draggable?: boolean;
  droppable?: boolean;
  emptyGroup?: boolean;
  excludeClassNames?: string[];
  requiredGroup?: boolean;
  node: NodeItemType;
  loading?: boolean;
}) {
  return {
    className: [
      // stylesBuilder.level,
      // stylesBuilder[`level-${node?.level}`],
      // node?.type && stylesBuilder[node?.type],
      // styles.startUpStatus,
      styles.blockNodeWrapper,
      !emptyGroup && !draggable && !droppable && styles.showOnHoverContainer,
      loading && styles.loading,
      requiredGroup && styles.requiredGroup,
      ...(classNames ?? []),
    ]
      ?.filter(cn => Boolean(cn) && (!excludeClassNames || !excludeClassNames.includes(cn)))
      ?.join(' '),
    draggable,
    droppable,
    role: ElementRoleEnum.BLOCK,
  };
}
