import React from 'react';

import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { CardsStyle, ContainerStyle, VariableCardStyle } from './index.style';
import { LIME_DARK } from '@oracle/styles/colors/main';

type VariableOverwritesProps = {
  pipelineSchedule: PipelineScheduleType;
};

function VariableOverwrites({
  pipelineSchedule,
}: VariableOverwritesProps) {
  const { variables } = pipelineSchedule || {};

  return (
    <ContainerStyle>
      <Spacing mb={2}>
        <Text bold large monospace muted>
          Variable overwrites  
        </Text>
      </Spacing>
      <CardsStyle noScrollbarTrackBackground>
        {variables && Object.entries(variables).map(([variable, value]) => (
          <VariableCardStyle>
            <Text monospace>
              {variable}
            </Text>
            <Text color={LIME_DARK} monospace>
              {value}
            </Text>
          </VariableCardStyle>
        ))}
      </CardsStyle>
    </ContainerStyle>
  );
}

export default VariableOverwrites;
