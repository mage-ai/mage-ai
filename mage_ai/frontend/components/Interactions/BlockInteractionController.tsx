import { useCallback, useMemo, useRef, useState } from 'react';

import Headline from '@oracle/elements/Headline';
import InteractionLayoutContainer from './InteractionLayoutContainer';
import InteractionSettings from './InteractionSettings';
import InteractionType from '@interfaces/InteractionType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { BlockInteractionType } from '@interfaces/PipelineInteractionType';
import { ContainerStyle } from './index.style';
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
  const containerRef = useRef(null);

  const [isEditing, setIsEditing] = useState<boolean>(false);

  const {
    description: blockInteractionDescription,
    name: blockInteractionName,
    uuid: blockInteractionUUID,
  } = useMemo(() => blockInteraction || {
    name: null,
    uuid: null,
  }, [
    blockInteraction,
  ]);

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
    <div ref={containerRef}>
      {blockInteractionName && (
        <Spacing mb={PADDING_UNITS} pt={PADDING_UNITS} px={PADDING_UNITS}>
          <Headline level={5}>
            {blockInteractionName}
          </Headline>

          {blockInteractionDescription && (
            <Text default>
              {blockInteractionDescription}
            </Text>
          )}
        </Spacing>
      )}

      {isEditing && (
        <InteractionSettings
          interaction={interaction}
          updateInteraction={updateInteraction}
        />
      )}

      <Spacing px={1}>
        <InteractionLayoutContainer
          containerRef={containerRef}
          interaction={interaction}
        />
      </Spacing>
    </div>
  );
}

export default BlockInteractionController;
