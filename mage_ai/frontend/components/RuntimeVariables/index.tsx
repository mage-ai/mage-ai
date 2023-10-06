import React from 'react';

import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ContainerStyle } from './index.style';
import { ScheduleTypeEnum } from '@interfaces/PipelineScheduleType';
import { addTriggerVariables, getFormattedVariable } from '@components/Sidekick/utils';

type RuntimeVariablesProps = {
  hasOverride?: boolean;
  height: number;
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
  height,
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
    <ContainerStyle height={height}>
      <Spacing mb={2}>
        <Text bold large monospace muted>
          Runtime variables{hasOverride && ' (override)'}
        </Text>
      </Spacing>
      {variables && (
        <SimpleDataTable 
          columnFlexNumbers={[1, 1]}
          columnHeaders={[
              {
                label: 'Variable',
              },
              {
                label: 'Value',
              },
            ]}
          rowGroupData={[
            {
              rowData: variablesArr.map(({ uuid, value }) => (
                {
                  columnValues: [uuid, value],
                  uuid,
                }
              )),
            },
          ]}
          small
        />
      )}
    </ContainerStyle>
  );
}

export default RuntimeVariables;
