import React from 'react';

import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { CardsStyle, ContainerStyle, VariableCardStyle } from './index.style';
import { LIME_DARK } from '@oracle/styles/colors/main';
import { ScheduleTypeEnum } from '@interfaces/PipelineScheduleType';
import { addTriggerVariables, getFormattedVariable } from '@components/Sidekick/utils';

type RuntimeVariablesProps = {
  hasOverride?: boolean;
  variables: {
    [key: string]: string | number;
  };
  variablesOverride: {
    [key: string]: string | number;
  };
  scheduleType: ScheduleTypeEnum;
};

function RuntimeVariables({
  hasOverride,
  scheduleType,
  variables,
  variablesOverride,
}: RuntimeVariablesProps) {
  const variablesArr = [];
  Object.entries(variables).forEach(([k, v]) => {
    const override = variablesOverride?.[k];

    variablesArr.push({
      uuid: k,
      value: getFormattedVariable(override || v),
    });
  });
  addTriggerVariables(variablesArr, scheduleType);

  return (
    <ContainerStyle>
      <Spacing mb={2}>
        <Text bold large monospace muted>
          Runtime variables{hasOverride && ' (override)'}
        </Text>
      </Spacing>
      <CardsStyle noScrollbarTrackBackground>
        {variables && variablesArr.map(({ uuid, value }) => (
          <VariableCardStyle>
            <Text monospace small>
              {uuid}
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

export default RuntimeVariables;
