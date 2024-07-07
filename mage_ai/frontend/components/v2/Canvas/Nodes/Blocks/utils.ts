import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { BlocksByGroupType } from '../../interfaces';
import BlockType from '@interfaces/BlockType';

export function groupValidation(group: FrameworkType, blockByGroup: BlocksByGroupType): {
  blocks: BlockType[];
  error: boolean;
  required: boolean;
  valid: boolean;
} {
  const {
    uuid: uuid2,
  } = group;
  const required = 'configuration' in group
    ? ((group as any)?.configuration?.metadata?.required ?? false)
    : 'children' in group && (group as any)?.children?.some(
      (child: PipelineExecutionFrameworkBlockType) =>
        child?.configuration?.metadata?.required);

  const getBlocks =
    (uuid3: string) => (Object.values((blockByGroup ?? {})?.[uuid3] ?? {}) ?? []);
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
