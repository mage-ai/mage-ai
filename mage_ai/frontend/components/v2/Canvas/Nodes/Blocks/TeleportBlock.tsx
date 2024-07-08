import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { SettingsContext } from '@components/v2/Apps/PipelineCanvas/SettingsManager/SettingsContext';
import Grid from '@mana/components/Grid';
import Link from '@mana/elements/Link';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from '@components/v2/Apps/PipelineCanvas/useAppEventsHandler';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { NodeItemType } from '../../interfaces';
import { getBlockColor } from '@mana/themes/blocks';
import { getModeColorName } from '../presentation';
import { useContext, useMemo } from 'react';
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
  const { activeLevel } = useContext(SettingsContext);
  const { convertEvent, dispatchAppEvent } = useAppEventsHandler({ block } as any);
  const { blocksByGroupRef, groupMappingRef, groupsByLevelRef } = useContext(ModelContext);
  const groupsInLevel = groupsByLevelRef?.current?.[activeLevel?.current - 2];
  const group = groupMappingRef?.current?.[selectedGroup?.uuid];
  const groupBlocks = Object.values(blocksByGroupRef?.current?.[group?.uuid] ?? {});

  const parentGroups = groupsInLevel?.filter(({ uuid }) => block?.groups?.includes(uuid));
  const groupsInParent = parentGroups?.flatMap(({ children }) => children ?? []);

  const {
    downstreamInGroup,
    upstreamInGroup,
  } = useMemo(() => {
    const up = [];
    const dn = [];
    groupsInParent.forEach((bgroup: BlockType) => {
      const bgroupBlocks = Object.values(blocksByGroupRef?.current?.[bgroup?.uuid] ?? {}) ?? [];
      const modeColor = getModeColorName(bgroupBlocks)?.base;
      const groupColor = getBlockColor(bgroup?.type ?? BlockTypeEnum.GROUP, { getColorName: true })?.names?.base;
      const bgroup2 = {
        ...bgroup,
        blocks: bgroupBlocks,
        colorName: modeColor ?? groupColor,
      }

      if (block?.upstream_blocks?.includes(bgroup?.uuid)) {
        up.push(bgroup2);
      } else if (block?.downstream_blocks?.includes(bgroup?.uuid)) {
        dn.push(bgroup2);
      }
    });

    return {
      downstreamInGroup: dn,
      upstreamInGroup: up,
    };
  }, [block, blocksByGroupRef, groupsInParent]);

  const isup = upstreamInGroup?.length > 0;
  const isdn = downstreamInGroup?.length > 0;

  const colorName =
    getBlockColor(block?.type ?? BlockTypeEnum.GROUP, { getColorName: true })?.names?.base;

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
          inputColorName: isup && upstreamInGroup?.[0]?.colorName,
          outputColorName: isdn && downstreamInGroup?.[0]?.colorName,
        })}
      </Grid >
    </Link>
  );
}
