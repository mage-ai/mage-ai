import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import stylesBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { ElementRoleEnum } from '@mana/shared/types';
import { NodeItemType } from '../../interfaces';

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
