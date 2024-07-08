import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Grid from '@mana/components/Grid';
import Link from '@mana/elements/Link';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from '@components/v2/Apps/PipelineCanvas/useAppEventsHandler';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { NodeItemType } from '../../interfaces';
import { getBlockColor } from '@mana/themes/blocks';
import { getModeColorName } from '../presentation';
import { useContext } from 'react';
import { ElementRoleEnum } from '@mana/shared/types';

export default function TeleportGroup({
  block,
  buildBadgeRow,
  motionProps,
  role,
  selectedGroup,
}: {
  block: BlockType;
  buildBadgeRow: (props: { inputColorName?: string; outputColorName?: string }) => JSX.Element;
  motionProps?: any;
  role?: ElementRoleEnum;
  selectedGroup: MenuGroupType;
}) {
  const { convertEvent, dispatchAppEvent } = useAppEventsHandler({ block } as any);
  const { blocksByGroupRef, groupMappingRef } = useContext(ModelContext);
  const group = groupMappingRef?.current?.[selectedGroup?.uuid];
  const groupBlocks = Object.values(blocksByGroupRef?.current?.[group?.uuid] ?? {});

  const isup = block?.upstream_blocks?.includes(selectedGroup?.uuid);
  const isdn = block?.downstream_blocks?.includes(selectedGroup?.uuid);

  const groupColor = getBlockColor(group?.type ?? BlockTypeEnum.GROUP, { getColorName: true })?.names?.base;
  const modeColor = getModeColorName(groupBlocks)?.base;
  const colorName = getBlockColor(block?.type ?? BlockTypeEnum.GROUP, { getColorName: true })?.names?.base;

  return (
    <Link
      motionProps={motionProps}
      onClick={(event: any) => {
        event.preventDefault();
        dispatchAppEvent(CustomAppEventEnum.TELEPORT_INTO_BLOCK, {
          block,
          event: convertEvent(event),
        });
      }}
      role={role}
      style={{
        height: 'fit-content',
        width: 'fit-content',
      }}
      wrap
    >
      <Grid
        borderColor={colorName}
        borders
        padding={12}
        style={{
          backgroundColor: 'var(--backgrounds-body)',
          minWidth: 200,
        }}
      >
        {buildBadgeRow({
          inputColorName: isup && (group?.type ? (groupColor ?? modeColor) : (modeColor ?? groupColor)),
          outputColorName: isdn && (group?.type ? (groupColor ?? modeColor) : (modeColor ?? groupColor)),
        })}
      </Grid >
    </Link>
  );
}
