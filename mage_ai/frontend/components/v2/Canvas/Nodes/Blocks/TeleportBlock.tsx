import Grid from '@mana/components/Grid';
import { ModelContext } from '@components/v2/Apps/PipelineCanvas/ModelManager/ModelContext';
import { useContext } from 'react';
import { getBlockColor } from '@mana/themes/blocks';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { getModeColorName } from '../presentation';
import { NodeItemType } from '../../interfaces';
import { MenuGroupType } from '@mana/components/Menu/interfaces';

export default function TeleportGroup({
  block,
  buildBadgeRow,
  node,
  selectedGroup,
}: {
  block: BlockType;
  buildBadgeRow: (props: { inputColorName?: string; outputColorName?: string }) => JSX.Element;
  node: NodeItemType;
  selectedGroup: MenuGroupType;
}) {
  const { blocksByGroupRef, groupMappingRef } = useContext(ModelContext);
  const group = groupMappingRef?.current?.[selectedGroup?.uuid];
  const groupBlocks = Object.values(blocksByGroupRef?.current?.[group?.uuid] ?? {});

  const isup = block?.upstream_blocks?.includes(selectedGroup?.uuid);
  const isdn = block?.downstream_blocks?.includes(selectedGroup?.uuid);
  const groupColor = getBlockColor(group?.type, { getColorName: true })?.names?.base
    ?? getModeColorName(groupBlocks)?.base;
  const colorName = getBlockColor(block?.type ?? BlockTypeEnum.GROUP, { getColorName: true })?.names?.base;

  return (
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
        inputColorName: isup && groupColor,
        outputColorName: isdn && groupColor,
      })}
    </Grid >
  );
}
