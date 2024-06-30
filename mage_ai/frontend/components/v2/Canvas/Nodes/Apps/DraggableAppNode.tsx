import React, { useEffect, useRef } from 'react';
import Button, { ButtonGroup } from '@mana/elements/Button';
import styles from '@styles/scss/components/Canvas/Nodes/DraggableAppNode.module.scss';
import { DraggableWrapper, DraggableWrapperProps } from '../DraggableWrapper';
import { AppNodeType, NodeType } from '../../interfaces';
import useAppEventsHandler, { CustomAppEvent } from '../../../Apps/PipelineCanvas/useAppEventsHandler';
import useDispatchMounted from '../useDispatchMounted';
import { getColorNamesFromItems } from '../utils';
import Aside from '../Blocks/Aside';
import TextInput from '@mana/elements/Input/TextInput';
import { Menu, PanelCollapseRight } from '@mana/icons';
import Text from '@mana/elements/Text';
import { BlockGenericV2, PlayButtonFilled } from '@mana/icons';
import Grid from '@mana/components/Grid';

type DraggableAppNodeProps = {
  items: NodeType[];
  node: AppNodeType;
};

const DraggableAppNode: React.FC<DraggableAppNodeProps> = ({
  items,
  node,
}: DraggableAppNodeProps) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const colorNames = getColorNamesFromItems(items);
  const baseColor = colorNames?.[0]?.base;

  useDispatchMounted(node, nodeRef);

  return (
    <DraggableWrapper
      className={styles.appNodeWrapper}
      node={node}
      nodeRef={nodeRef}
    >
      <div className={styles.appNodeContainer}>
        <Grid
          templateColumns="auto"
          templateRows="auto 1fr"
        >
          <Grid
            columnGap={8}
            templateRows="1fr"
            style={{ gridTemplateColumns: 'auto auto 1fr auto' }}
          >
            <Button
              Icon={BlockGenericV2}
              small
            />

            <Button
              Icon={PlayButtonFilled}
              backgroundColor={baseColor}
              basic
              borderColor={baseColor}
              onClick={() => alert('Run code')}
              small
            />

            <TextInput basic placeholder="/" style={{ paddingBottom: 8, paddingTop: 8 }} />

            <Button
              Icon={menuOpen ? PanelCollapseRight : Menu}
              basic={menuOpen}
              onClick={() => setMenuOpen(prev => !prev)}
              small
            />
          </Grid>


          <Grid>
          </Grid>
        </Grid>
      </div >
    </DraggableWrapper >
  );
}

function areEqual(p1: DraggableAppNodeProps, p2: DraggableAppNodeProps) {
  const equal = p1?.node?.id === p2?.node?.id;
  return equal;
}

export default React.memo(DraggableAppNode, areEqual);
