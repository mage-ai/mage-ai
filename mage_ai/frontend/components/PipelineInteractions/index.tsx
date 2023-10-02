import { useMemo } from 'react';

import BlockInteractionRow, { BlockInteractionWithInteraction } from './BlockInteractionRow';
import BlockType from '@interfaces/BlockType';
import InteractionType from '@interfaces/InteractionType';
import PipelineInteractionType, { BlockInteractionType } from '@interfaces/PipelineInteractionType';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
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
  const interactionsMapping = useMemo(() => indexBy(
    interactions || [],
    ({ uuid }) => uuid,
  ), [
    interactions,
  ]);
  const pipelineInteractions = useMemo(() => pipelineInteraction?.interactions || {}, [
    pipelineInteraction,
  ]);

  const interactionsMemo = useMemo(() => {
    const arr = [];

    pipeline?.blocks?.map((block: BlockType) => {
      const blockUUID = block?.uuid;
      const blockInteractions: BlockInteractionType[] = pipelineInteractions?.[blockUUID];

      const blockInteractionWithInteractions: BlockInteractionWithInteraction[] =
        blockInteractions?.map((blockInteraction: BlockInteractionType) => {
          const interaction = interactionsMapping?.[blockInteraction?.uuid];

          return {
            blockInteraction,
            interaction,
          };
        });

      arr.push(
        <Spacing mb={PADDING_UNITS}>
          <BlockInteractionRow
            block={block}
            blockInteractionWithInteractions={blockInteractionWithInteractions}

          />
        </Spacing>
      );
    });

    return arr;
  }, [
    interactionsMapping,
    pipeline,
    pipelineInteractions,
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
