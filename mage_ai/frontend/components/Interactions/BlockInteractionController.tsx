import { useCallback, useMemo, useState } from 'react';

import Headline from '@oracle/elements/Headline';
import InteractionLayoutContainer from './InteractionLayoutContainer';
import InteractionSettings from './InteractionSettings';
import InteractionType from '@interfaces/InteractionType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { BlockInteractionType } from '@interfaces/PipelineInteractionType';
import { ContainerStyle } from './index.style';
import { PADDING_UNITS, UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';

type BlockInteractionControllerProps = {
  blockInteraction?: BlockInteractionType;
  children?: any;
  contained?: boolean;
  containerRef?: any;
  containerWidth?: number;
  interaction: InteractionType;
  isEditing?: boolean;
  removeBlockInteraction?: () => void;
  setInteractionsMapping?: (prev: {
    [interactionUUID: string]: InteractionType;
  }) => void;
  setVariables?: (prev: any) => void;
  showVariableUUID?: boolean;
  variables?: {
    [key: string]: any;
  };
  widthOffset?: number;
};

function BlockInteractionController({
  blockInteraction,
  children,
  contained,
  containerRef,
  containerWidth,
  interaction,
  isEditing,
  removeBlockInteraction,
  setInteractionsMapping,
  setVariables,
  showVariableUUID,
  variables,
  widthOffset,
}: BlockInteractionControllerProps) {
  const {
    description: blockInteractionDescription,
    name: blockInteractionName,
  } = useMemo(() => blockInteraction || {
    description: null,
    name: null,
  }, [
    blockInteraction,
  ]);

  const updateInteraction =
    // @ts-ignore
    useCallback((interactionUpdated: InteractionType) => setInteractionsMapping?.(prev => ({
      ...prev,
      [interactionUpdated?.uuid]: {
        ...interaction,
        ...interactionUpdated,
      },
    })), [
      interaction,
      setInteractionsMapping,
    ]);

  const contentMemo = useMemo(() => (
    <>
      {blockInteractionName && (
        <Spacing mb={PADDING_UNITS} pt={PADDING_UNITS} px={PADDING_UNITS}>
          <Headline level={5}>
            {blockInteractionName}
          </Headline>

          {blockInteractionDescription && blockInteractionDescription?.split('\n')?.map((line: string) => (
            <Text default key={line}>
              {line}
            </Text>
          ))}
        </Spacing>
      )}

      <Spacing
        pb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}
        pt={blockInteractionName ? 0 : PADDING_UNITS}
        px={1}
      >
        <InteractionLayoutContainer
          containerRef={containerRef}
          containerWidth={containerWidth}
          interaction={interaction}
          setVariables={setVariables}
          showVariableUUID={showVariableUUID}
          variables={variables}
          widthOffset={widthOffset}
        />
      </Spacing>
    </>
  ), [
    blockInteractionDescription,
    blockInteractionName,
    containerRef,
    containerWidth,
    interaction,
    setVariables,
    showVariableUUID,
    variables,
    widthOffset,
  ]);

  return (
    <div>
      {isEditing && (
        <InteractionSettings
          containerWidth={containerWidth}
          interaction={interaction}
          removeBlockInteraction={removeBlockInteraction}
          updateInteraction={updateInteraction}
        >
          {children}
        </InteractionSettings>
      )}

      {!isEditing && (
        <>
          {contained && contentMemo}
          {!contained && (
            <ContainerStyle>
              {contentMemo}
            </ContainerStyle>
          )}
        </>
      )}
    </div>
  );
}

export default BlockInteractionController;
