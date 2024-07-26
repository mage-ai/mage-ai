import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Grid from '@mana/components/Grid';
import Link from '@mana/elements/Link';
import useAppEventsHandler, {
  CustomAppEvent,
} from '@components/v2/Apps/PipelineCanvas/useAppEventsHandler';
import { ElementRoleEnum } from '@mana/shared/types';
import { LayoutConfigDirectionEnum } from '../../types';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { EventContext } from '@components/v2/Apps/PipelineCanvas/Events/EventContext';
import { NodeItemType } from '../../interfaces';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import { getBlockColor } from '@mana/themes/blocks';
import { getModeColorName } from '../presentation';
import { getUpDownstreamColors } from './utils';
import { useContext, useEffect, useMemo, useRef } from 'react';

export default function TeleportGroup({
  block,
  BuildBadgeRow,
  index: indexProp,
  role,
  node,
  selectedGroup,
  isGroup,
}: {
  block: BlockType;
  BuildBadgeRow: (props: { inputColorName?: string; outputColorName?: string }) => JSX.Element;
  index?: number;
  node?: NodeItemType;
  role?: ElementRoleEnum;
  selectedGroup: MenuGroupType;
  isGroup?: boolean;
}) {
  const { setSelectedGroup } = useContext(EventContext);

  const colorName = getBlockColor(block?.type ?? BlockTypeEnum.GROUP, { getColorName: true })?.names
    ?.base;

  return (
    <Link
      onClick={(event: any) => {
        event.preventDefault();
        setSelectedGroup(block);
      }}
      role={role}
      style={{
        height: 'inherit',
        width: 'inherit',
      }}
      wrap
    >
      <Grid
        alignItems="start"
        borderColor={colorName}
        borders
        height="inherit"
        padding={12}
        style={{
          backgroundColor: 'var(--backgrounds-body)',
          minWidth: 200,
        }}
      >
        <BuildBadgeRow isGroup />
      </Grid>
    </Link>
  );
}
