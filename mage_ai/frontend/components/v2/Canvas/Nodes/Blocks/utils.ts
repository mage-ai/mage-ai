import {
  FrameworkType,
  PipelineExecutionFrameworkBlockType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import { BlockMappingType, BlocksByGroupType, GroupMappingType } from '../../interfaces';
import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { getBlockColor } from '@mana/themes/blocks';
import { getModeColorName } from '../presentation';

export function groupValidation(
  group: FrameworkType,
  blockByGroup: BlocksByGroupType,
): {
  blocks: BlockType[];
  error: boolean;
  required: boolean;
  valid: boolean;
} {
  const { uuid: uuid2 } = group;
  const required =
    'configuration' in group
      ? (group as any)?.configuration?.metadata?.required ?? false
      : 'children' in group &&
        (group as any)?.children?.some(
          (child: PipelineExecutionFrameworkBlockType) => child?.configuration?.metadata?.required,
        );

  const getBlocks = (uuid3: string) => Object.values((blockByGroup ?? {})?.[uuid3] ?? {}) ?? [];
  const blocks = [
    ...getBlocks(uuid2),
    ...((group as any)?.children ?? [])?.flatMap(g => getBlocks(g.uuid)),
  ];
  const valid = blocks?.length >= 1;
  const error = required && !valid;

  return {
    blocks,
    error,
    required,
    valid,
  };
}

export function getUpDownstreamColors(
  block,
  groupsInLevel,
  blocksByGroup,
  opts?: {
    blockMapping?: BlockMappingType;
    groupMapping?: GroupMappingType;
  },
) {
  const { blockMapping, groupMapping } = opts;
  const { type } = block;
  const group = groupMapping?.[block?.uuid];

  const isGroup = !type || [BlockTypeEnum.GROUP, BlockTypeEnum.PIPELINE].includes(type);
  const parentGroups = groupsInLevel?.filter(({ uuid }) => block?.groups?.includes(uuid));
  const groupsInParent = parentGroups?.flatMap(({ children }) => children ?? []) ?? [];

  if (group && !groupsInParent?.length) {
    group?.groups?.forEach(g => {
      const parent = groupMapping[g];
      groupsInParent.push(...(parent?.children?.map(gp => groupMapping?.[gp.uuid]) ?? []));
    });
  }

  const up = [];
  const dn = [];

  if (isGroup) {
    groupsInParent?.forEach((bgroup: BlockType) => {
      const bgroupBlocks = Object.values(blocksByGroup?.[bgroup?.uuid] ?? {}) ?? [];

      if ((bgroup as PipelineExecutionFrameworkBlockType)?.children?.length > 0) {
        (bgroup as PipelineExecutionFrameworkBlockType)?.children?.forEach(gchild => {
          bgroupBlocks.push(...(Object.values(blocksByGroup?.[gchild.uuid] ?? {}) ?? []));
        });
      }
      const modeColor = getModeColorName(bgroupBlocks)?.base;
      const groupColor = getBlockColor(bgroup?.type ?? BlockTypeEnum.GROUP, { getColorName: true })
        ?.names?.base;
      const bgroup2 = {
        ...bgroup,
        blocks: bgroupBlocks,
        colorName: modeColor ?? groupColor,
      };

      if (block?.upstream_blocks?.includes(bgroup?.uuid)) {
        up.push(bgroup2);
      } else if (block?.downstream_blocks?.includes(bgroup?.uuid)) {
        dn.push(bgroup2);
      }
    });
  } else {
    [
      [true, block?.upstream_blocks ?? []],
      [false, block?.downstream_blocks ?? []],
    ]?.forEach(([isup, buuids]) => {
      const bgroupBlocks = buuids?.map(buuid => blockMapping?.[buuid]).filter(Boolean);

      const modeColor = getModeColorName(bgroupBlocks)?.base;
      bgroupBlocks?.forEach(bgroup => {
        const groupColor = getBlockColor(bgroup?.type ?? BlockTypeEnum.GROUP, {
          getColorName: true,
        })?.names?.base;
        const bgroup2 = {
          ...bgroup,
          blocks: bgroupBlocks,
          colorName: modeColor ?? groupColor,
        };

        if (block?.upstream_blocks?.includes(bgroup?.uuid)) {
          up.push(bgroup2);
        } else if (block?.downstream_blocks?.includes(bgroup?.uuid)) {
          dn.push(bgroup2);
        }
      });
    });
  }

  const modeColor = getModeColorName(block)?.base;
  const groupColor = getBlockColor(block?.type ?? BlockTypeEnum.GROUP, { getColorName: true })
    ?.names?.base;

  return {
    downstreamInGroup: dn,
    modeColor,
    groupColor,
    upstreamInGroup: up,
  };
}
