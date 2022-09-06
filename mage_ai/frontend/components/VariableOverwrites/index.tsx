import React, { useMemo } from 'react';

import PipelineScheduleType, { ScheduleTypeEnum } from '@interfaces/PipelineScheduleType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { CardsStyle, ContainerStyle, VariableCardStyle } from './index.style';
import { LIME_DARK } from '@oracle/styles/colors/main';
import { addTriggerVariables, getFormattedVariable } from '@components/Sidekick/utils';
import { isEmptyObject } from '@utils/hash';

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
  // const { schedule_type: scheduleType, variables } = pipelineSchedule || {};

  // const variableArr = useMemo(() => {
  //   let arr = [];

  //   if (!isEmptyObject(variables)) {
  //     Object.entries(variables).forEach(([k, v]) => {
  //       arr.push({
  //         uuid: k,
  //         value: getFormattedVariable(v),
  //       });
  //     });
  //   }
    
  //   arr = addTriggerVariables(arr, scheduleType);

  //   return arr;
  // }, [scheduleType, variables]);

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
            <Text monospace small>
              {variable}
            </Text>
            <Text color={LIME_DARK} monospace small>
              {getFormattedVariable(value)}
            </Text>
          </VariableCardStyle>
        ))}
      </CardsStyle>
    </ContainerStyle>
  );
}

export default VariableOverwrites;
