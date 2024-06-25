import Section from '@mana/elements/Section';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';
import MenuManager from '@mana/components/Menu/MenuManager';
import { AddV2UpsideDown, AlertTriangle, BlockGeneric, DeleteCircle, PlayButton, StatusComplete } from '@mana/icons';
import Circle from '@mana/elements/Circle';
import BlockType from '@interfaces/BlockType';
import { MenuItemType } from '@mana/components/Menu/interfaces';
import { EventContext } from '../../../Apps/PipelineCanvas/Events/EventContext';
import GradientContainer from '@mana/elements/Gradient';
import Grid from '@mana/components/Grid';
import Link from '@mana/elements/Link';
import PanelRows from '@mana/elements/PanelRows';
import Text from '@mana/elements/Text';
import {
  ConfigurationType,
  FrameworkType,
  PipelineExecutionFrameworkBlockType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import { LayoutDisplayEnum } from '../../types';
import { BLOCK_TYPE_NAME_MAPPING, LANGUAGE_DISPLAY_MAPPING } from '@interfaces/BlockType';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import { getBlockColor } from '@mana/themes/blocks';
import { getModeColorName } from '../presentation';
import { groupBy, sortByKey, sum } from '@utils/array';
import { groupValidation } from './utils';
import { pluralize } from '@utils/string';
import { useContext, useMemo } from 'react';
import Button from '@mana/elements/Button';
import {
  GROUP_NODE_MIN_WIDTH,
  SELECTED_GROUP_NODE_MIN_WIDTH,
  PADDING_VERTICAL,
} from './constants'

type BlockGroupContentProps = {
  BuildBadgeRow?: any;
  blockGroupStatusRef?: React.MutableRefObject<HTMLDivElement>;
  block: BlockType;
  blocks?: BlockType[];
  children?: any;
  menuItems?: MenuItemType[];
  selected?: boolean;
  teleportIntoBlock: (event: any, target: any) => void;
};

export default function BlockGroupContent({
  BuildBadgeRow,
  blockGroupStatusRef,
  block,
  blocks,
  children,
  menuItems,
  selected,
  teleportIntoBlock,
}: BlockGroupContentProps) {
  const { configuration, description } = block;
  const isRequired = (configuration as ConfigurationType)?.metadata?.required;

  const actionButton = useMemo(() => {
    const button = (
      <Button
        Icon={selected ? ip => <AddV2UpsideDown {...ip} size={16} /> : undefined}
        onClick={selected ? undefined : (event: any) => teleportIntoBlock(event, block)}
        small
      >
        {selected ? 'Add block' : 'Go'}
      </Button>
    );

    if (!selected) {
      return button;
    }

    return (
      <MenuManager
        className={`aside-menu-manager-${block.uuid}`}
        direction={LayoutDirectionEnum.LEFT}
        items={menuItems}
        uuid={block.uuid}
      >
        {button}
      </MenuManager>
    );
  }, [block, menuItems, selected, teleportIntoBlock]);

  return (
    <Grid rowGap={8}>
      <BuildBadgeRow
        fullWidth
        inputColorName
        outputColorName
        isGroup
      />

      <Grid autoFlow="column" columnGap={8} templateColumns="1fr auto">
        <Section small withBackground>
          <Grid
            autoFlow="column"
            alignItems="center"
            columnGap={24}
            justifyContent="space-between"
            paddingLeft={12}
            paddingRight={12}
            style={{ height: 22 }}
            templateColumns={[
              '1fr',
              isRequired && 'auto',
            ].filter(Boolean).join(' ')}
          >
            <div ref={blockGroupStatusRef} />

            {isRequired && (
              <Grid alignItems="center" columnGap={8} justifyContent="start" autoFlow="column">
                {blocks?.length > 0 ? <StatusComplete size={16} success /> : <DeleteCircle size={16} error />}
                <Text secondary medium small>
                  {blocks?.length > 0 ? 'Reqs met' : 'Reqs not met'}
                </Text>
              </Grid>
            )}
          </Grid>
        </Section>

        {actionButton}
      </Grid>

      {(blocks?.length ?? 0) === 0 && (!selected || ((block as FrameworkType)?.children ?? 0) === 0) && (
        <Section small style={{ padding: 16 }}>
          <Text
            secondary
            medium
            small
            maxWidth={(selected ? SELECTED_GROUP_NODE_MIN_WIDTH : GROUP_NODE_MIN_WIDTH) - (PADDING_VERTICAL * 2)}
            style={{
              lineHeight: 'var(--fonts-lineheight-md)',
            }}
          >
            {description}
          </Text>
        </Section>
      )}

      {children}
    </Grid>
  )
}
