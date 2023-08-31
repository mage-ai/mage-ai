import { useCallback, useMemo } from 'react';

import Chip from '@oracle/components/Chip';
import MultiSelect from '@oracle/elements/Inputs/MultiSelect';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import {
  AGGREGATE_FUNCTIONS,
  CHART_TYPES,
  ChartTypeEnum,
  ConfigurationType,
  VARIABLE_NAMES,
  VARIABLE_NAME_WIDTH_PERCENTAGE,
} from '@interfaces/ChartBlockType';
import {
  CONFIGURATIONS_BY_CHART_TYPE,
  ConfigurationItemType,
  ConfigurationOptionType,
} from '@components/ChartBlock/constants';
import { capitalize } from '@utils/string';
import { remove, sortByKey } from '@utils/array';

function ChartConfigurations({
  block,
  updateConfiguration,
}) {
  const {
    data,
    configuration,
  } = block || {};
  const {
    chart_type: chartType,
  } = configuration || {};
  const {
    columns,
  } = data || {};
  const configurationOptions = CONFIGURATIONS_BY_CHART_TYPE[chartType];

  const {
    code: configurationOptionsElsForCode,
    noCode: configurationOptionsEls,
  }: {
    code?: ConfigurationOptionType[];
    noCode: ConfigurationOptionType[];
  } = useMemo(() => Object.entries(configurationOptions || {}).reduce((acc, [key, arr]) => ({
      ...acc,
      [key]: arr.map(({
        autoRun,
        label,
        monospace,
        options,
        settings = {},
        type,
        uuid,
      }) => {
        let el;
        const sharedProps = {
          fullWidth: true,
          key: uuid,
          label: capitalize(label()),
          monospace: monospace,
          // onBlur: () => setSelectedBlock(block),
          onChange: e => updateConfiguration({
            [uuid]: e.target.value,
          }, {
            autoRun,
          }),
          // onFocus: () => setSelectedBlock(block),
          value: configuration?.[uuid] || '',
        };

        if (ConfigurationItemType.COLUMNS === type) {
          const columnsFromConfig = configuration[uuid] || [];

          el = (
            <>
              {(!settings.maxValues || columnsFromConfig.length < settings.maxValues) && (
                <Select
                  {...sharedProps}
                  onChange={(e) => {
                    let arr = configuration[uuid] || [];
                    const column = e.target.value;
                    if (arr.includes(column)) {
                      arr = remove(arr, v => v === column);
                    } else {
                      arr.push(column);
                    }

                    updateConfiguration({
                      [uuid]: arr,
                    }, {
                      autoRun,
                    });
                  }}
                  value={null}
                >
                  {sortByKey((columns || []).filter(col => !columnsFromConfig.includes(col)), v => v).map((val: string) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </Select>
              )}

              {columnsFromConfig.map((col: string) => (
                <div
                  key={col}
                  style={{
                    display: 'inline-block',
                    marginRight: 2,
                    marginTop: 2,
                  }}
                >
                  <Chip
                    label={col}
                    onClick={() => {
                      updateConfiguration({
                        [uuid]: remove(columnsFromConfig, v => v === col),
                      }, {
                        autoRun,
                      });
                    }}
                  />
                </div>
              ))}
            </>
          );
        } else if (ConfigurationItemType.METRICS === type) {
          const metricsFromConfig = configuration[uuid] || [];

          el = (
            <>
              <Text bold>
                Metrics
              </Text>
              <Text muted small>
                Select a column and an aggregation function.
              </Text>
              <MultiSelect
                onChange={(values, {
                  resetValues,
                  setValues,
                }) => {
                  // @ts-ignore
                  if (values.filter(v => !!v).length === 2) {
                    const existingMetric = metricsFromConfig.find(({
                      aggregation,
                      column,
                    }) => column === values[1] && aggregation === values[0]);

                    if (!existingMetric) {
                      updateConfiguration({
                        [uuid]: metricsFromConfig.concat({
                          aggregation: values[0],
                          column: values[1],
                        }),
                      }, {
                        autoRun,
                      });
                      setValues([null, null]);
                      resetValues();
                    }
                  }
                }}
              >
                <Select
                  {...sharedProps}
                  label="aggregation"
                >
                  {sortByKey(AGGREGATE_FUNCTIONS, v => v).map((val: string) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </Select>

                <Select
                  {...sharedProps}
                  label="column"
                >
                  {sortByKey(columns || [], v => v).map((val: string) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </Select>
              </MultiSelect>

              {metricsFromConfig.map(({
                aggregation,
                column,
              }) => (
                <div
                  key={`${aggregation}(${column})`}
                  style={{
                    display: 'inline-block',
                    marginRight: 2,
                    marginTop: 2,
                  }}
                >
                  <Chip
                    label={(
                      <>
                        <Text inline monospace>{aggregation}(</Text>{column}<Text inline monospace>)</Text>
                      </>
                    )}
                    onClick={() => {
                      updateConfiguration({
                        [uuid]: remove(metricsFromConfig, ({
                          aggregation: aggregation2,
                          column: column2,
                        }) => aggregation === aggregation2 && column === column2),
                      }, {
                        autoRun,
                      });
                    }}
                  />
                </div>
              ))}
            </>
          );
        } else if (options) {
          el = (
            <Select
              {...sharedProps}
            >
              {options.map((val: string) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </Select>
          );
        } else {
          el = (
            <TextInput
              {...sharedProps}
              type={type}
            />
          );
        }

        return (
          <Spacing key={uuid} mb={1}>
            {el}
          </Spacing>
        );
      }),
    }), {
    noCode: [],
  }), [
    // block,
    columns,
    configuration,
    configurationOptions,
    // dataBlock,
    // setSelectedBlock,
    updateConfiguration,
  ]);

  return (
    <>
      {configurationOptionsEls}
    </>
  );
}

export default ChartConfigurations;
