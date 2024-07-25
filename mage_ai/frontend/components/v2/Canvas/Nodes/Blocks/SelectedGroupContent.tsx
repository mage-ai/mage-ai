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

export default function SelectedGroupContent({
  BuildBadgeRow,
  block,
  blocks,
  menuItems,
}) {
  const { configuration, description } = block;
  const isRequired = configuration?.metadata?.required;

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
            <Grid autoFlow="column" columnGap={24} style={{ gridTemplateColumns: 'repeat(max-content)' }}>
              <Grid alignItems="center" justifyContent="start" autoFlow="column" columnGap={6}>
                <BlockGeneric secondary size={14} />

                <Text secondary semibold small>
                  {blocks?.length ?? 0}
                </Text>
              </Grid>

              <Grid alignItems="center" justifyContent="start" autoFlow="column" columnGap={6}>
                <AlertTriangle secondary size={14} />

                <Text secondary semibold small>
                  {blocks?.length ?? 0}
                </Text>
              </Grid>

              <Grid alignItems="center" justifyContent="start" autoFlow="column" columnGap={6}>
                <PlayButton secondary size={14} />

                <Text secondary semibold small>
                  {blocks?.length ?? 0}
                </Text>
              </Grid>
            </Grid>

            {isRequired && (
              <Grid alignItems="center" columnGap={8} justifyContent="start" autoFlow="column">
                {blocks?.length > 0 ? <StatusComplete size={16} success /> : <DeleteCircle size={16} error />}
                <Text secondary semibold small>
                  {blocks?.length > 0 ? 'Reqs met' : 'Reqs not met'}
                </Text>
              </Grid>
            )}
          </Grid>
        </Section>

        <MenuManager
          className={`aside-menu-manager-${block.uuid}`}
          direction={LayoutDirectionEnum.LEFT}
          items={menuItems}
          uuid={block.uuid}
        >
          <Button
            Icon={ip => <AddV2UpsideDown {...ip} size={16} />}
            small
          >
            Add block
          </Button>
        </MenuManager>
      </Grid>
    </Grid>
  )
}
