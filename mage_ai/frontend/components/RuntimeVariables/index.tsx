import React from 'react';

import SimpleDataTable from '@oracle/components/Table/SimpleDataTable';
import { ContainerStyle } from './index.style';
import { LIME_DARK } from '@oracle/styles/colors/main';
import { ScheduleTypeEnum } from '@interfaces/PipelineScheduleType';
import { addTriggerVariables, getFormattedVariable } from '@components/Sidekick/utils';

type RuntimeVariablesProps = {
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

  const numVariables = Object.keys(variables).length;

  return (
    <ContainerStyle height={height}>
      {variables && (
        <SimpleDataTable
          columnFlexNumbers={[1, 1]}
          columnHeaders={[
            {
              label: `Runtime variable (${numVariables})`,
            },
            {
              label: 'Value',
            },
          ]}
          noBorderRadius
          rowGroupData={[
            {
              rowData: variablesArr.map(({ uuid, value }) => (
                {
                  columnTextColors: [LIME_DARK, undefined],
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
