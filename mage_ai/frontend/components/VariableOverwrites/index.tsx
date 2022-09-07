import React from 'react';

import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { CardsStyle, ContainerStyle, VariableCardStyle } from './index.style';
import { LIME_DARK } from '@oracle/styles/colors/main';
import { getFormattedVariable } from '@components/Sidekick/utils';

type VariableOverwritesProps = {
  hasOverride?: boolean;
  variables: {
    [key: string]: string;
  };
};

function VariableOverwrites({
  hasOverride,
  variables,
}: VariableOverwritesProps) {
  return (
    <ContainerStyle>
      <Spacing mb={2}>
        <Text bold large monospace muted>
          Runtime variables{hasOverride && ' (override)'}
        </Text>
      </Spacing>
      <CardsStyle noScrollbarTrackBackground>
        {variables && Object.entries(variables).map(([variable, value]) => (
          <VariableCardStyle>
            <Text monospace>
              {variable}
            </Text>
            <Text color={LIME_DARK} monospace>
              {getFormattedVariable(value)}
            </Text>
          </VariableCardStyle>
        ))}
      </CardsStyle>
    </ContainerStyle>
  );
}

export default VariableOverwrites;
