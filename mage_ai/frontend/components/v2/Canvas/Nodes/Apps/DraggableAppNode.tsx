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
import { ArrowsAdjustingFrameSquare, DiamondShared, AppVersions, IdentityTag, Menu, PanelCollapseLeft, PanelCollapseRight } from '@mana/icons';
import Text from '@mana/elements/Text';
import { Chat, BlockGenericV2, PlayButtonFilled } from '@mana/icons';
import Grid from '@mana/components/Grid';
import Divider from '@mana/elements/Divider';

type DraggableAppNodeProps = {
  index?: number;
  items: NodeType[];
  node: AppNodeType;
};

const DraggableAppNode: React.FC<DraggableAppNodeProps> = ({
  index = 0,
  items,
  node,
}: DraggableAppNodeProps) => {
  const [asideBeforeOpen, setAsideBeforeOpen] = React.useState(false);
  const [asideAfterOpen, setAsideAfterOpen] = React.useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const item = items?.[index];
  const colorNames = getColorNamesFromItems([item]);
  const baseColor = colorNames?.[index]?.base;
  const block = item?.block;

  useDispatchMounted(node, nodeRef);

  return (
    <DraggableWrapper
      className={styles.appNodeWrapper}
      node={node}
      nodeRef={nodeRef}
    >
      <div className={styles.appNodeContainer}>
        <Grid
          rowGap={8}
          style={{
            gridTemplateRows: 'auto auto 1fr auto',
          }}
          templateColumns="auto"
        >
          <Grid
            columnGap={8}
            style={{ gridTemplateColumns: 'auto auto 1fr auto' }}
            templateRows="1fr"
          >
            <Button
              Icon={asideBeforeOpen ? PanelCollapseLeft : Menu}
              basic={asideBeforeOpen}
              onClick={() => setAsideBeforeOpen(prev => !prev)}
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
              Icon={asideAfterOpen ? PanelCollapseRight : BlockGenericV2}
              basic={asideAfterOpen}
              onClick={() => setAsideAfterOpen(true)}
              small
            />
          </Grid>

          <Grid
            autoFlow="column"
            backgroundColor="graylo"
            borders
            columnGap={40}
            justifyContent="start"
            paddingBottom={6}
            paddingLeft={16}
            paddingRight={16}
            paddingTop={6}
            templateRows="auto"
          >
            {[
              { label: () => 'File', uuid: 'File' },
              { label: () => 'Edit', uuid: 'Edit' },
              { label: () => 'View', uuid: 'View' },
              { Icon: Chat, uuid: 'Chat' },
              { Icon: ArrowsAdjustingFrameSquare, uuid: 'Layout' },
            ].map(({ Icon, label, uuid }) => (
              <Button
                Icon={Icon}
                basic
                key={uuid}
                onClick={event => alert(uuid)}
                small
                style={{ background: 'none', border: 'none' }}
              >
                {label &&
                  <Text medium small>
                    {label()}
                  </Text>
                }
              </Button>
            ))}
          </Grid>

          <Grid
            borders
            templateRows="auto 1fr"
          >
            <Grid
              autoFlow="column"
              backgroundColor="graylo"
              columnGap={10}
              justifyContent="start"
              paddingBottom={18}
              paddingLeft={16}
              paddingRight={16}
              paddingTop={18}
              bordersBottom
              templateRows="auto"
              templateColumns="1fr auto"
            >
              <Grid
                autoFlow="column"
                columnGap={16}
                justifyContent="start"
                templateRows="auto"
              >
                <Button
                  Icon={iconProps => <DiamondShared {...iconProps} colorName="yellow" />}
                  basic
                  grouped
                  onClick={event => alert('DiamondShared')}
                  small
                />

                <Text monospace secondary small>
                  {block?.configuration?.file_source?.path ?? block?.uuid}
                </Text >
              </Grid >

              <Grid
                autoFlow="column"
                columnGap={32}
                justifyContent="start"
                templateRows="auto"
              >
                <Button
                  Icon={iconProps => <IdentityTag {...iconProps} secondary />}
                  basic
                  grouped
                  onClick={event => alert('IdentityTag')}
                  small
                />

                <Button
                  Icon={iconProps => <AppVersions {...iconProps} secondary />}
                  basic
                  grouped
                  onClick={event => alert('AppVersions')}
                  small
                />
              </Grid>
            </Grid>

            <Grid>
              <Text>
                Code
              </Text>
            </Grid>
          </Grid>

          <Grid
            borders
            padding={24}
          >
            <Text>
              Output
            </Text>
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
