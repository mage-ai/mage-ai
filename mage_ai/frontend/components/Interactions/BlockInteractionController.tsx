import { useCallback } from 'react';

import Headline from '@oracle/elements/Headline';
import InteractionDisplay from './InteractionDisplay';
import InteractionSettings from './InteractionSettings';
import InteractionType from '@interfaces/InteractionType';
import Spacing from '@oracle/elements/Spacing';
import { BlockInteractionType } from '@interfaces/PipelineInteractionType';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

export type BlockInteractionWithInteractionType = {
  blockInteraction: BlockInteractionType;
  interaction: InteractionType;
};

export type BlockInteractionControllerProps = {
  setBlockInteractionsMapping: (prev: {
    [blockUUID: string]: BlockInteractionType;
  }) => void;
  setInteractionsMapping: (prev: {
    [interactionUUID: string]: InteractionType;
  }) => void;
};

function BlockInteractionController({
  blockInteraction,
  interaction,
  setBlockInteractionsMapping,
  setInteractionsMapping,
}: BlockInteractionControllerProps & BlockInteractionWithInteractionType) {
  const {
    name: blockInteractionName,
    uuid: blockInteractionUUID,
  } = blockInteraction || {
    name: null,
    uuid: null,
  };

  const updateInteraction =
    useCallback((interactionUpdated: InteractionType) => setInteractionsMapping(prev => ({
      ...prev,
      [interactionUpdated?.uuid]: {
        ...interaction,
        ...interactionUpdated,
      },
    })), [
      interaction,
      setInteractionsMapping,
    ]);

  return (
    <>
      {blockInteractionName && (
        <Spacing mb={PADDING_UNITS}>
          <Headline default level={4}>
            {blockInteractionName}
          </Headline>
        </Spacing>
      )}

      <InteractionSettings
        interaction={interaction}
        updateInteraction={updateInteraction}
      />

      <InteractionDisplay
        interaction={interaction}
      />
    </>
  );
}

export default BlockInteractionController;
