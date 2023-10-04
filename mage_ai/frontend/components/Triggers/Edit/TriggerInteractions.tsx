import { useMemo } from 'react';

import BlockInteractionController from '@components/Interactions/BlockInteractionController';
import BlockType from '@interfaces/BlockType';
import InteractionType from '@interfaces/InteractionType';
import PipelineInteractionType from '@interfaces/PipelineInteractionType';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import { indexBy } from '@utils/array';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { useWindowSize } from '@utils/sizes';

type TriggerInteractions = {
  containerRef: any;
  interactions: InteractionType[];
  pipeline: PipelineType;
  pipelineInteraction: PipelineInteractionType;
  setVariables: (prev: any) => {
    [key: string]: any;
  };
  variables: {
    [key: string]: any;
  };
};

function TriggerInteractions({
  containerRef,
  interactions,
  pipeline,
  pipelineInteraction,
  setVariables,
  variables,
}) {
  const interactionsMapping = useMemo(() => indexBy(interactions || [], ({ uuid }) => uuid), [
    interactions,
  ]);

  const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);
  const blockInteractionsMapping = useMemo(() => pipelineInteraction?.blocks || {}, [
    pipelineInteraction,
  ]);

  const interactionsMemo = useMemo(() => {
    const arr = [];

    const blocksCount = blocks?.length || 0;

    blocks?.map((block: BlockType, idx: number) => {
      const {
        uuid: blockUUID,
      } = block || {
        uuid: null,
      }

      const blockInteractions = blockInteractionsMapping?.[blockUUID] || [];
      const hasBlockInteractions = blockInteractions?.length >= 1;

      arr.push(
        <Spacing p={PADDING_UNITS}>
          {blockInteractions?.map((blockInteraction: BlockInteractionType, idx: number) => (
            <Spacing
              key={`${blockInteraction?.uuid}-${idx}`}
              mt={idx >= 1 ? PADDING_UNITS * 2 : 0}
            >
              <BlockInteractionController
                blockInteraction={blockInteraction}
                containerRef={containerRef}
                interaction={interactionsMapping?.[blockInteraction?.uuid]}
                setVariables={setVariables}
                variables={variables}
              />
            </Spacing>
          ))}
        </Spacing>
      );
    });

    return arr;
  }, [
    blocks,
    containerRef,
    interactionsMapping,
    setVariables,
    variables,
  ]);

  return (
    <>
      {interactionsMemo}
    </>
  );
}

export default TriggerInteractions;
