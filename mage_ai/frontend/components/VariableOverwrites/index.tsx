import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { LIME_DARK } from '@oracle/styles/colors/main';
import React from 'react';
import { CardsStyle, ContainerStyle, VariableCardStyle } from './index.style';

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
