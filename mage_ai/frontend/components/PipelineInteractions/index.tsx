import { useEffect, useMemo, useState } from 'react';

import BlockInteractionRow from './BlockInteractionRow';
import BlockType from '@interfaces/BlockType';
import InteractionType from '@interfaces/InteractionType';
import PipelineInteractionType, { BlockInteractionType } from '@interfaces/PipelineInteractionType';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import { PADDING_UNITS, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import { indexBy } from '@utils/array';

type PipelineInteractionsProps = {
  interactions: InteractionType[];
  pipeline: PipelineType;
  pipelineInteraction: PipelineInteractionType;
  selectedBlockUUID?: string;
  setSelectedBlockUUID?: (blockUUID: string) => void;
};

function PipelineInteractions({
  interactions,
  pipeline,
  pipelineInteraction,
  selectedBlockUUID,
  setSelectedBlockUUID,
}: PipelineInteractionsProps) {
  const [interactionsMapping, setInteractionsMapping] = useState<{
    [interactionUUID: string]: InteractionType;
  }>(null);
  const [blockInteractionsMapping, setBlockInteractionsMapping] = useState<{
    [blockUUID: string]: BlockInteractionType;
  }>(null);

  useEffect(() => {
    if (!interactionsMapping && interactions?.length >= 1) {
      setInteractionsMapping(indexBy(
        interactions || [],
        ({ uuid }) => uuid,
      ));
    }
  }, [
    interactions,
    interactionsMapping,
    setInteractionsMapping,
  ]);

  useEffect(() => {
    if (!blockInteractionsMapping && pipelineInteraction?.interactions) {
      setBlockInteractionsMapping(pipelineInteraction?.interactions);
    }
  }, [
    blockInteractionsMapping,
    pipelineInteraction,
    setBlockInteractionsMapping,
  ]);

  const interactionsMemo = useMemo(() => {
    const arr = [];

    pipeline?.blocks?.map((block: BlockType, idx: number) => {
      const blockUUID = block?.uuid;
      const blockInteractions: BlockInteractionType[] = blockInteractionsMapping?.[blockUUID];

      arr.push(
        <Spacing mt={idx >= 1 ? UNITS_BETWEEN_SECTIONS : 0}>
          <BlockInteractionRow
            block={block}
            blockInteractionWithInteractions={blockInteractions?.map((
              blockInteraction: BlockInteractionType,
            ) => ({
              blockInteraction,
              interaction: interactionsMapping?.[blockInteraction?.uuid],
            }))}
            setBlockInteractionsMapping={setBlockInteractionsMapping}
            setInteractionsMapping={setInteractionsMapping}
          />
        </Spacing>
      );
    });

    return arr;
  }, [
    blockInteractionsMapping,
    interactionsMapping,
    pipeline,
    setBlockInteractionsMapping,
    setInteractionsMapping,
  ]);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        {interactionsMemo}
      </Spacing>
    </>
  );
}

export default PipelineInteractions;
