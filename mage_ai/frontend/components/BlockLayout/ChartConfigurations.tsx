import { useMemo } from 'react';

import Chip from '@oracle/components/Chip';
import FlexContainer from '@oracle/components/FlexContainer';
import MultiSelect from '@oracle/elements/Inputs/MultiSelect';
import Select from '@oracle/elements/Inputs/Select';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
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
import TextArea from '@oracle/elements/Inputs/TextArea';
import Panel from '@oracle/components/Panel';
import { PADDING_UNITS } from 'oracle/styles/units/spacing';
import { dig, setNested } from '@utils/hash';
import BlockLayoutItemType from '@interfaces/BlockLayoutItemType';

function ChartConfigurations({
  block,
  updateConfiguration,
}: {
  block: BlockLayoutItemType;
  updateConfiguration: (configuration: ConfigurationType, options?: { autoRun?: boolean, skip_render?: boolean }) => void;
}) {
  const { data, configuration } = block || {};
  const { chart_type: chartType } = configuration || {};
  const { columns } = data || {};
  const configurationOptions = CONFIGURATIONS_BY_CHART_TYPE[chartType];

  const {
    code: configurationOptionsElsForCode,
    noCode: configurationOptionsEls,
  }: {
    code?: ConfigurationOptionType[];
    noCode: ConfigurationOptionType[];
  } = useMemo(
    () =>
      Object.entries(configurationOptions || {}).reduce(
        (acc, [key, arr]) => ({
          ...acc,
          [key]: arr.map(
            ({ autoRun, description, label, monospace, options, settings = {}, type, uuid }) => {
              const renderWithLabelDescription = (
                elInit?: JSX.Element,
                opts?: {
                  inline?: boolean;
                },
              ) => {
                const { inline } = opts || {
                  inline: false,
                };
                const elMore = (
                  <>
                    <Text bold>{sharedProps?.label}</Text>
                    {description && (
                      <Spacing mb={1}>
                        {(Array.isArray(description) ? description : [description]).map(
                          (desc, i) => (
                            <Text key={`${desc}-${i}`} monospace={monospace} muted xsmall>
                              <span dangerouslySetInnerHTML={{ __html: desc }} />
                            </Text>
                          ),
                        )}
                      </Spacing>
                    )}
                    {elInit && <Spacing mt={2}>{elInit}</Spacing>}
                  </>
                );

                if (inline) {
                  return elMore;
                }

                return <Panel>{elMore}</Panel>;
              };

              let el;
              const sharedProps = {
                fullWidth: true,
                key: uuid,
                label: capitalize(label()),
                monospace: monospace,
                // onBlur: () => setSelectedBlock(block),
                onChange: e =>
                  updateConfiguration(
                    {
                      ...setNested(configuration, uuid, e.target.value),
                    },
                    {
                      autoRun,
                    },
                  ),
                // onFocus: () => setSelectedBlock(block),
                value: configuration ? dig(configuration || {}, uuid) : '',
              };

              if (ConfigurationItemType.COLUMNS === type) {
                const columnsFromConfig = configuration[uuid] || [];

                el = (
                  <>
                    {(!settings.maxValues || columnsFromConfig.length < settings.maxValues) && (
                      <Select
                        {...sharedProps}
                        onChange={e => {
                          let arr = configuration[uuid] || [];
                          const column = e.target.value;
                          if (arr.includes(column)) {
                            arr = remove(arr, v => v === column);
                          } else {
                            arr.push(column);
                          }

                          updateConfiguration(
                            {
                              [uuid]: arr,
                            },
                            {
                              autoRun,
                            },
                          );
                        }}
                        value={null}
                      >
                        {sortByKey(
                          (columns || []).filter(col => !columnsFromConfig.includes(col)),
                          v => v,
                        ).map((val: string) => (
                          <option key={val} value={val}>
                            {val}
                          </option>
                        ))}
                      </Select>
                    )}
                    {columnsFromConfig.length > 0 && <div style={{ marginTop: 4 }} />}
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
                            updateConfiguration(
                              {
                                [uuid]: remove(columnsFromConfig, v => v === col),
                              },
                              {
                                autoRun,
                              },
                            );
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
                    <Text bold>Metrics</Text>
                    <Text muted small>
                      Select a column and an aggregation function.
                    </Text>
                    <MultiSelect
                      onChange={(values, { resetValues, setValues }) => {
                        // @ts-ignore
                        if (values.filter(v => !!v).length === 2) {
                          const existingMetric = metricsFromConfig.find(
                            ({ aggregation, column }) =>
                              column === values[1] && aggregation === values[0],
                          );

                          if (!existingMetric) {
                            updateConfiguration(
                              {
                                [uuid]: metricsFromConfig.concat({
                                  aggregation: values[0],
                                  column: values[1],
                                }),
                              },
                              {
                                autoRun,
                              },
                            );
                            setValues([null, null]);
                            resetValues();
                          }
                        }
                      }}
                    >
                      <Select {...sharedProps} label="aggregation">
                        {sortByKey(AGGREGATE_FUNCTIONS, v => v).map((val: string) => (
                          <option key={val} value={val}>
                            {val}
                          </option>
                        ))}
                      </Select>

                      <Select {...sharedProps} label="column">
                        {sortByKey(columns || [], v => v).map((val: string) => (
                          <option key={val} value={val}>
                            {val}
                          </option>
                        ))}
                      </Select>
                    </MultiSelect>

                    {metricsFromConfig.map(({ aggregation, column }) => (
                      <div
                        key={`${aggregation}(${column})`}
                        style={{
                          display: 'inline-block',
                          marginRight: 2,
                          marginTop: 4,
                        }}
                      >
                        <Chip
                          label={
                            <>
                              <Text inline monospace>
                                {aggregation}(
                              </Text>
                              {column}
                              <Text inline monospace>
                                )
                              </Text>
                            </>
                          }
                          onClick={() => {
                            updateConfiguration(
                              {
                                [uuid]: remove(
                                  metricsFromConfig,
                                  ({ aggregation: aggregation2, column: column2 }) =>
                                    aggregation === aggregation2 && column === column2,
                                ),
                              },
                              {
                                autoRun,
                              },
                            );
                          }}
                        />
                      </div>
                    ))}
                  </>
                );
              } else if (ConfigurationItemType.CODE === type) {
                el = renderWithLabelDescription(
                  <>
                    <Text monospace small>
                      <Text color="#00CC99" inline monospace small>
                        function
                      </Text>{' '}
                      <Text color="#0080FF" inline monospace small>
                        format
                      </Text>
                      <Text color="#FF9933" inline monospace small>
                        (
                      </Text>
                      <Text color="#00FFFF" inline monospace small>
                        value
                      </Text>
                      ,{' '}
                      <Text color="#00FFFF" inline monospace small>
                        index
                      </Text>
                      ,{' '}
                      <Text color="#00FFFF" inline monospace small>
                        values
                      </Text>
                      <Text color="#FF9933" inline monospace small>
                        )
                      </Text>{' '}
                      <Text color="#FF9933" inline monospace small>
                        {'{'}
                      </Text>
                    </Text>
                    <TextArea
                      {...sharedProps}
                      autoGrow
                      borderless
                      label={null}
                      monospace
                      onChange={e => {
                        updateConfiguration(
                          {
                            [uuid]: e.target.value,
                          },
                          {
                            skip_render: true,
                          },
                        );
                      }}
                      paddingVertical={0}
                      primary
                      rows={1}
                      small
                    />
                    <Text color="#FF9933" inline monospace small>
                      {'}'}
                    </Text>
                  </>,
                );
              } else if (options) {
                el = (
                  <Select {...sharedProps}>
                    {options.map((val: string) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </Select>
                );
              } else if (ConfigurationItemType.TOGGLE === type) {
                el = (
                  <Spacing mt={PADDING_UNITS}>
                    <FlexContainer alignItems="center">
                      <ToggleSwitch
                        checked={!!sharedProps?.value}
                        compact
                        onCheck={(valFunc: (val: boolean) => boolean) =>
                          sharedProps?.onChange({
                            target: {
                              value: valFunc(sharedProps?.value),
                            },
                          })
                        }
                      />

                      <Spacing mr={PADDING_UNITS} />

                      {renderWithLabelDescription(null, { inline: true })}
                    </FlexContainer>
                  </Spacing>
                );
              } else {
                el = (
                  <TextInput
                    {...sharedProps}
                    label={!description ? sharedProps?.label : undefined}
                    placeholder={description ? sharedProps?.label : undefined}
                    type={type}
                  />
                );

                if (description) {
                  el = renderWithLabelDescription(el);
                }
              }

              return (
                <Spacing key={uuid} mb={1}>
                  {el}
                </Spacing>
              );
            },
          ),
        }),
        {
          noCode: [],
        },
      ),
    [
      // block,
      columns,
      configuration,
      configurationOptions,
      // dataBlock,
      // setSelectedBlock,
      updateConfiguration,
    ],
  );

  return <>{configurationOptionsEls}</>;
}

export default ChartConfigurations;
