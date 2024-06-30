import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { ElementRoleEnum } from '@mana/shared/types';
import { NodeItemType } from '../../interfaces';

export function draggableProps({
  classNames,
  draggable,
  droppable,
  emptyGroup,
  item,
  loading,
}: {
  classNames?: string[];
  draggable?: boolean;
  droppable?: boolean;
  emptyGroup?: boolean;
  item: NodeItemType;
  loading?: boolean;
}) {
  return {
    className: [
      styles.blockNodeWrapper,
      stylesBuilder.level,
      stylesBuilder[`level-${item?.level}`],
      item?.type && stylesBuilder[item?.type],
      !emptyGroup && !draggable && !droppable && styles.showOnHoverContainer,
      loading && styles.loading,
      styles.container,
      ...(classNames ?? []),
    ]?.filter(Boolean)?.join(' '),
    role: ElementRoleEnum.BLOCK,
    draggable,
    droppable,
  };
}
