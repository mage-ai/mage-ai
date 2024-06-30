import React, { useEffect, useRef } from 'react';
import Button, { ButtonGroup } from '@mana/elements/Button';
import styles from '@styles/scss/components/Canvas/Nodes/DraggableAppNode.module.scss';
import { DraggableWrapper, DraggableWrapperProps } from '../DraggableWrapper';
import { AppNodeType, NodeType, RectType } from '../../interfaces';
import useAppEventsHandler, { CustomAppEvent } from '../../../Apps/PipelineCanvas/useAppEventsHandler';
import { AppStatusEnum } from '../../../Apps/constants';
import useDispatchMounted from '../useDispatchMounted';
import { getColorNamesFromItems } from '../utils';
import Aside from '../Blocks/Aside';
import TextInput from '@mana/elements/Input/TextInput';
import {
  ArrowsAdjustingFrameSquare, DiamondShared, AppVersions, IdentityTag, Menu, PanelCollapseLeft,
  PanelCollapseRight, More, AddV2, Grab, GroupV2,
} from '@mana/icons';
import Text from '@mana/elements/Text';
import { Minimize, Chat, BlockGenericV2, PlayButtonFilled } from '@mana/icons';
import Grid from '@mana/components/Grid';
import Divider from '@mana/elements/Divider';
import { areEqualRects, areDraggableStylesEqual } from '../equals';
import { TooltipAlign, TooltipWrapper, TooltipDirection, TooltipJustify } from '@context/Tooltip';

type DraggableAppNodeProps = {
  draggable?: boolean;
  index?: number;
  items: NodeType[];
  node: AppNodeType;
  rect: RectType;
};

const DraggableAppNode: React.FC<DraggableAppNodeProps> = ({
  index = 0,
  items,
  node,
  rect,
}: DraggableAppNodeProps) => {
  const [asideBeforeOpen, setAsideBeforeOpen] = React.useState(false);
  const [asideAfterOpen, setAsideAfterOpen] = React.useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const item = items?.[index];
  const colorNames = getColorNamesFromItems([item]);
  const baseColor = colorNames?.[index]?.base;
  const block = item?.block;
  const app = node?.app;

  useDispatchMounted(node, nodeRef);

  function handleCloseApp() {

  }

  function handleUpdateLayout() {

  }

  return (
    <DraggableWrapper
      className={styles.appNodeWrapper}
      node={node}
      nodeRef={nodeRef}
      rect={rect}
    >
      <div className={[
        styles.appNodeContainer,
        app?.status && styles[app?.status],
      ]?.filter(Boolean)?.join((' '))}>
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
              Icon={asideBeforeOpen ? PanelCollapseLeft : More}
              basic={asideBeforeOpen}
              onClick={() => setAsideBeforeOpen(prev => !prev)}
              small
            />

            <Button
              Icon={PlayButtonFilled}
              backgroundcolor={baseColor}
              basic
              bordercolor={baseColor}
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
              { Icon: Chat, uuid: 'Chat', description: 'Get support in the community channel on Slack', href: 'https://mage.ai/chat', target: '_blank', anchor: 'true' },
              { Icon: Minimize, uuid: 'Close', description: 'Close app', onClick: handleCloseApp },
              { Icon: Grab, uuid: 'Layout', description: 'Drag to reposition app', onClick: handleUpdateLayout },
            ].map(({ Icon, anchor, label, description, href, target, uuid, onClick }) => (
              <TooltipWrapper
                key={uuid}
                tooltip={<Text secondary small>{description ?? label?.() ?? uuid}</Text>}
              >
                <Button
                  anchor={anchor}
                  Icon={Icon}
                  basic
                  href={href}
                  target={target}
                  onClick={onClick ?? undefined}
                  small
                  style={{ background: 'none', border: 'none' }}
                >
                  {label &&
                    <Text medium small>
                      {label()}
                    </Text>
                  }
                </Button>
              </TooltipWrapper>
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
                  grouped="true"
                  onClick={event => alert('DiamondShared')}
                  small
                />
                <TooltipWrapper
                  tooltip={
                    <Grid rowGap={8}>
                      <Button
                        asLink
                        onClick={event => alert('Edit')}
                      >
                        <Text monospace small>
                          {block?.configuration?.file_source?.path}
                        </Text>
                      </Button>
                    </Grid  >
                  }
                >
                  <Text monospace secondary small>
                    {block?.name ?? block?.uuid}
                  </Text >
                </TooltipWrapper>
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
                  grouped="true"
                  onClick={event => alert('IdentityTag')}
                  small
                />

                <Button
                  Icon={iconProps => <AppVersions {...iconProps} secondary />}
                  basic
                  grouped="true"
                  onClick={event => alert('AppVersions')}
                  small
                />
              </Grid>
            </Grid>

            <Grid className={styles.codeContainer}>
              <Text>
                Code
              </Text>
            </Grid >
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
  const equal = p1?.node?.id === p2?.node?.id
    && areDraggableStylesEqual(p1, p2)
    && areEqualRects({ rect: p1?.rect }, { rect: p2?.rect });

  return equal;
}

export default React.memo(DraggableAppNode, areEqual);
