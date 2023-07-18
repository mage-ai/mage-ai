import { ScheduleTypeEnum } from '@interfaces/PipelineScheduleType';

export function getFormattedVariable(variable) {
  return typeof variable === 'string' ? variable : JSON.stringify(variable);
}

export function getFormattedVariables(variables, filterBlock) {
  return variables
    ?.find(({ block }) => filterBlock(block))
    ?.variables
    ?.map(variable => {
      const variableValue = variable.value;
      return {
        ...variable,
        value: getFormattedVariable(variableValue),
      };
    });
}

export function addTriggerVariables(variablesArr, scheduleType) {
  if (scheduleType === ScheduleTypeEnum.TIME) {
    variablesArr.push({
      uuid: 'execution_date',
      value: '<run datetime>',
    });
  } else if (scheduleType === ScheduleTypeEnum.EVENT) {
    variablesArr.push({
      uuid: 'event',
      value: '<trigger event>',
    });
  }

  return variablesArr;
}

export function parseVariables(variables) {
  if (!variables) {
    return variables;
  }

  return Object.entries(variables).reduce(
    (prev, [uuid, value]: [string, string]) => {
      let updatedValue = value;
      try {
        updatedValue = JSON.parse(value);
      } catch {
        // do nothing
      }

      return {
        ...prev,
        [uuid]: updatedValue,
      };
    },
    {},
  );
}
