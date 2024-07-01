import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { ElementRoleEnum } from '@mana/shared/types';
import { NodeItemType } from '../../interfaces';

export function draggableProps({
  classNames,
  draggable,
  droppable,
  emptyGroup,
  requiredGroup,
  node,
  loading,
}: {
  classNames?: string[];
  draggable?: boolean;
  droppable?: boolean;
  emptyGroup?: boolean;
  requiredGroup?: boolean;
  node: NodeItemType;
  loading?: boolean;
}) {
  return {
    className: [
      styles.blockNodeWrapper,
      stylesBuilder.level,
      stylesBuilder[`level-${node?.level}`],
      node?.type && stylesBuilder[node?.type],
      !emptyGroup && !draggable && !droppable && styles.showOnHoverContainer,
      loading && styles.loading,
      styles.container,
      requiredGroup && styles.requiredGroup,
      ...(classNames ?? []),
    ]?.filter(Boolean)?.join(' '),
    role: ElementRoleEnum.BLOCK,
    draggable,
    droppable,
  };
}
