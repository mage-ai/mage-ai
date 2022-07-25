import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';

import BlockType, {
  BlockTypeEnum,
  OutputType,
  StatusTypeEnum,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import ChartController from './ChartController';
import Chip from '@oracle/components/Chip';
import Circle from '@oracle/elements/Circle';
import CodeEditor, { CodeEditorSharedProps } from '@components/CodeEditor';
import CodeOutput from '@components/CodeBlock/CodeOutput';
import Col from '@components/shared/Grid/Col';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType, {
  DataTypeEnum,
  ExecutionStateEnum,
} from '@interfaces/KernelOutputType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import MultiSelect from '@oracle/elements/Inputs/MultiSelect';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import usePrevious from '@utils/usePrevious';
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
  DEFAULT_SETTINGS_BY_CHART_TYPE,
  VARIABLE_INFO_BY_CHART_TYPE,
} from './constants';
import {
  ChartBlockStyle,
  CodeHelperStyle,
  CodeStyle,
  ConfigurationOptionsStyle,
} from './index.style';
import {
  Edit,
  PlayButtonFilled,
  Trash,
} from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  capitalize,
  isJsonString,
} from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy, remove, sortByKey } from '@utils/array';
import { isEmptyObject } from '@utils/hash';

export type ChartPropsShared = {
  blockRefs: any;
  blocks: BlockType[];
  deleteWidget: (block: BlockType) => void;
  runBlock: (payload: {
    block: BlockType;
    code: string;
    ignoreAlreadyRunning?: boolean;
    runUpstream?: boolean;
  }) => void;
  runningBlocks: BlockType[];
  savePipelineContent: () => Promise<any>;
  setSelectedBlock: (block: BlockType) => void;
  updateWidget: (block: BlockType) => void;
  width?: number;
} & CodeEditorSharedProps;

type ChartBlockType = {
  block: BlockType;
  executionState: ExecutionStateEnum;
  messages: KernelOutputType[];
  onChangeContent: (value: string) => void;
} & ChartPropsShared;

function ChartBlock({
  block,
  blockRefs,
  blocks,
  deleteWidget,
  executionState,
  messages = [],
  onChangeContent,
  runBlock,
  runningBlocks,
  savePipelineContent,
  selected,
  setSelectedBlock,
  setTextareaFocused,
  textareaFocused,
  updateWidget,
  width,
}: ChartBlockType) {
  const refChartContainer = useRef(null);
  const themeContext = useContext(ThemeContext);
  const {
    outputs = [],
  } = block;
  const [chartType, setChartType] = useState<ChartTypeEnum>(block.configuration?.chart_type);
  const [configuration, setConfiguration] = useState<ConfigurationType>(block.configuration);
  const [content, setContent] = useState<string>(block.content);
  const [isEditing, setIsEditing] = useState<boolean>(!chartType || outputs.length === 0);
  const [chartWidth, setChartWidth] = useState<number>(null);
  const [upstreamBlocks, setUpstreamBlocks] = useState<string[]>(block?.upstream_blocks);
  const [runCount, setRunCount] = useState<number>(outputs?.length || 0);

  const configurationOptions = CONFIGURATIONS_BY_CHART_TYPE[chartType];
  const defaultSettings = DEFAULT_SETTINGS_BY_CHART_TYPE[chartType];
  const blocksOfType = useMemo(() => blocks?.filter(({
    type,
  }: BlockType) => [BlockTypeEnum.DATA_LOADER, BlockTypeEnum.TRANSFORMER].includes(type),
  ), [
    blocks,
  ]);
  const blocksMapping = useMemo(() => indexBy(blocksOfType, ({ uuid }: BlockType) => uuid), [
    blocksOfType,
  ]);

  const isInProgress = !!runningBlocks.find(({ uuid }) => uuid === block.uuid)
    || messages?.length >= 1 && executionState !== ExecutionStateEnum.IDLE;

  const messagesWithType = useMemo(() => {
    return messages?.filter((kernelOutput: KernelOutputType) => kernelOutput?.type);
  }, [
    messages,
  ]);
  const hasError = !!messagesWithType.find(({ error }) => error);
  const hasOutput = messagesWithType.length >= 1;
  const color = getColorsForBlockType(block.type, { theme: themeContext }).accent;
  const borderColorShareProps = useMemo(() => ({
    blockType: block.type,
    hasError,
    selected,
  }), [
    block.type,
    hasError,
    selected,
  ]);

  let chartData;
  let chartDataRaw;
  if (messagesWithType?.length) {
    const messagesIndex = messagesWithType.length - 1;
    chartDataRaw = messagesWithType?.[messagesIndex]?.data?.[0];
  }
  if (chartDataRaw) {
    chartDataRaw = chartDataRaw.slice(1, chartDataRaw.length - 1);
    chartDataRaw = chartDataRaw
      .replaceAll('\\"', '\"')
      .replaceAll("\\'", "\'");
    if (isJsonString(chartDataRaw)) {
      chartData = JSON.parse(chartDataRaw);
    }
  } else if (outputs?.length >= 1) {
    chartData = {};

    outputs.forEach((output: OutputType) => {
      const {
        text_data: textData,
        type: outputType,
        variable_uuid: variableUUID,
      } = output || {};
      if (DataTypeEnum.TEXT === outputType && isJsonString(textData)) {
        chartData[variableUUID] = JSON.parse(textData);
      }
    });
  }

  const saveAndRun = useCallback((data: BlockType) => {
    const widget = {
      ...block,
      ...data,
      configuration: {
        ...block.configuration,
        ...data.configuration,
      },
    };

    savePipelineContent().then(() => {
      runBlock({
        block: widget,
        code: content,
        ignoreAlreadyRunning: true,
        runUpstream: !!upstreamBlocks.find((uuid: string) => ![
          StatusTypeEnum.EXECUTED,
          StatusTypeEnum.UPDATED,
        ].includes(blocksMapping[uuid]?.status)),
      });
    });

    setRunCount(runCountPrev => runCountPrev + 1);
  }, [
    block,
    blocksMapping,
    content,
    setRunCount,
    upstreamBlocks,
  ]);

  const updateContent = useCallback((val: string) => {
    setContent(val);
    onChangeContent(val);
  }, [
    onChangeContent,
    setContent,
  ]);
  const updateConfiguration = useCallback((data: {
    [key: string]: string | number;
  }, opts: {
    autoRun?: boolean;
  } = {}) => {
    const { autoRun } = opts;

    setConfiguration(config => ({
      ...config,
      ...data,
    }));

    const widget = {
      ...block,
      configuration: {
        ...configuration,
        ...data,
        chart_type: chartType,
      },
    };
    updateWidget(widget);

    const keys = Object.keys(data);

    if (runCount && autoRun) {
      saveAndRun(widget);
    }
  }, [
    block,
    chartType,
    configuration,
    runCount,
    saveAndRun,
    setConfiguration,
    updateWidget,
  ]);

  const codeEditorEl = useMemo(() => (
    <CodeEditor
      autoHeight
      onChange={updateContent}
      selected={selected}
      setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
      setTextareaFocused={setTextareaFocused}
      showLineNumbers={false}
      textareaFocused={textareaFocused}
      value={content}
      width="100%"
    />
  ), [
    content,
    selected,
    setSelectedBlock,
    setTextareaFocused,
    textareaFocused,
    updateContent,
  ]);

  const codeOutputEl = useMemo(() => hasError && hasOutput && (
    <CodeOutput
      {...borderColorShareProps}
      block={block}
      contained={false}
      hideExtraInfo
      isInProgress={isInProgress}
      messages={messagesWithType}
      selected={selected}
    />
  ), [
    block,
    borderColorShareProps,
    hasError,
    hasOutput,
    isInProgress,
    messagesWithType,
    selected,
  ]);

  const isEditingPrevious = usePrevious(isEditing);
  const widthPrevious = usePrevious(width);
  useEffect(() => {
    const rect = refChartContainer?.current?.getBoundingClientRect();
    if (isEditingPrevious !== isEditing || widthPrevious !== width) {
      setChartWidth(0);
    } else if (rect) {
      setChartWidth(rect.width);
    }
  }, [
    isEditing,
    isEditingPrevious,
    refChartContainer.current,
    setChartWidth,
    width,
    widthPrevious,
  ]);

  const availableVariables = useMemo(() => {
    const arr = [];

    upstreamBlocks.forEach((blockUUID: string, idx: number) => {
      const b = blocksMapping[blockUUID];
      const blockColor =
        getColorsForBlockType(b?.type, { theme: themeContext }).accent;

      arr.push(
        <Spacing key={blockUUID} ml={2}>
          <Text
            bold
            inline
            monospace
            small
          >
            df_{idx + 1}
          </Text> <Text
            inline
            monospace
            muted
            small
          >
            {'->'}
          </Text> <Link
            color={blockColor}
            inline
            onClick={() => {
              const refBlock = blockRefs?.current?.[`${b?.type}s/${b?.uuid}.py`];
              refBlock?.current?.scrollIntoView();
            }}
            preventDefault
            small
          >
            <Text
              color={blockColor}
              monospace
              small
            >
              {blockUUID}
            </Text>
          </Link>
        </Spacing>
      );
    });

    return arr;
  }, [
    blocksMapping,
    upstreamBlocks,
  ]);

  const variablesMustDefine = useMemo(() => {
    const arr = [];

    // @ts-ignore
    const vars = configurationOptions?.code?.reduce((acc, { uuid }) => VARIABLE_NAMES.includes(uuid)
      ? acc.concat(uuid)
      : acc
    , []);
    const varsCount = vars?.length;

    vars?.forEach((varName: string, idx: number) => {
      const varNameValue = configuration[varName];
      if (varNameValue) {
        const info = VARIABLE_INFO_BY_CHART_TYPE[chartType]?.[varName]?.();

        arr.push(
          <Spacing key={varNameValue} ml={2}>
            <Text
              bold
              inline
              monospace
              small
            >
              {varNameValue}
            </Text> {info && (
              <>
                <Text
                  inline
                  monospace
                  muted
                  small
                >
                  {'->'}
                </Text> <Text
                  default
                  inline
                  small
                >
                  {info}
                </Text>
              </>
            )}
          </Spacing>
        );
      }
    });

    return arr;
  }, [
    configuration,
    configurationOptions,
  ]);

  const chartTypePrevious = usePrevious(chartType);
  const upstreamBlocksPrevious = usePrevious(upstreamBlocks);
  useEffect(() => {
    if ((!chartTypePrevious && chartType && upstreamBlocks?.length) || (!upstreamBlocksPrevious?.length && upstreamBlocks?.length >= 1) && chartType) {
      if (!content && isEmptyObject(configuration) && defaultSettings) {
        const blockUpdated = {
          ...block,
          upstream_blocks: upstreamBlocks,
        };
        updateConfiguration(defaultSettings.configuration(blockUpdated));
        updateContent(defaultSettings.content(blockUpdated));
      }
    }
  }, [
    block,
    chartType,
    chartTypePrevious,
    configuration,
    content,
    updateConfiguration,
    updateContent,
    upstreamBlocks,
    upstreamBlocksPrevious,
  ]);

  const widthPercentage =
    useMemo(() => configuration[VARIABLE_NAME_WIDTH_PERCENTAGE] || 1, [configuration]);

  const {
    code: configurationOptionsElsForCode,
    noCode: configurationOptionsEls,
  }: {
    code: ConfigurationOptionType[];
    noCode: ConfigurationOptionType[];
  } = useMemo(() => Object.entries(configurationOptions || {}).reduce((acc, [key, arr]) => {
    return {
      ...acc,
      [key]: arr.map(({
        autoRun,
        label,
        monospace,
        options,
        type,
        uuid,
      }) => {
        let el;
        const sharedProps = {
          fullWidth: true,
          key: uuid,
          label: capitalize(label()),
          monospace: monospace,
          onBlur: () => setSelectedBlock(block),
          onChange: e => updateConfiguration({
            [uuid]: e.target.value,
          }, {
            autoRun,
          }),
          onFocus: () => setSelectedBlock(block),
          value: configuration?.[uuid],
        };

        const blocks: BlockType[] = upstreamBlocks.map(blockUUID => blocksMapping[blockUUID]);
        const columns = blocks.reduce((acc, {
          outputs,
        }) => acc.concat(outputs?.[0]?.sample_data?.columns), []);

        if (ConfigurationItemType.COLUMNS === type) {
          const columnsFromConfig = configuration[uuid] || [];

          el = (
            <>
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
                <option value="" />
                {sortByKey(columns.filter(col => !columnsFromConfig.includes(col)), v => v).map((val: string) => (
                  <option key={val} value={val}>
                    {val}
                  </option>
                ))}
              </Select>

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
                    }) => column === values[0] && aggregation === values[1]);

                    if (!existingMetric) {
                      updateConfiguration({
                        [uuid]: metricsFromConfig.concat({
                          aggregation: values[1],
                          column: values[0],
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
                  label="column"
                >
                  <option value="" />
                  {sortByKey(columns, v => v).map((val: string) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </Select>

                <Select
                  {...sharedProps}
                  label="aggregation"
                >
                  <option value="" />
                  {sortByKey(AGGREGATE_FUNCTIONS, v => v).map((val: string) => (
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
    }
  }, {
    code: [],
    noCode: [],
  }), [
    blocksMapping,
    configuration,
    configurationOptions,
    setSelectedBlock,
    updateConfiguration,
    upstreamBlocks,
  ]);

  return (
    <Col sm={12} md={12 * widthPercentage}>
      <ChartBlockStyle>
        <Spacing mt={1} px={1}>
          <FlexContainer
            alignItems="center"
            justifyContent="space-between"
            fullWidth
          >
            <Select
              compact
              onChange={(e) => {
                const value = [e.target.value];
                const widget = {
                  ...block,
                  upstream_blocks: value,
                };
                updateWidget(widget);
                saveAndRun(widget);
                setUpstreamBlocks(value)
              }}
              placeholder="Source block"
              small
              value={upstreamBlocks?.[0] || ''}
            >
              {blocksOfType?.map(({ uuid }: BlockType) => (
                <option key={uuid} value={uuid}>
                  {uuid}
                </option>
              ))}
            </Select>

            <FlexContainer alignItems="center">
              {!isInProgress && (
                <Tooltip
                  appearBefore
                  default
                  label="Run chart block"
                  size={null}
                  widthFitContent
                >
                  <KeyboardShortcutButton
                    blackBorder
                    compact
                    inline
                    onClick={() => saveAndRun(block)}
                    uuid={`ChartBlock/run/${block.uuid}`}
                  >
                    <PlayButtonFilled size={UNIT * 2} />
                  </KeyboardShortcutButton>
                </Tooltip>
              )}

              {ExecutionStateEnum.QUEUED === executionState && (
                <Spinner
                  color={(themeContext || dark).content.active}
                  small
                  type="cylon"
                />
              )}
              {ExecutionStateEnum.BUSY === executionState && (
                <Spinner
                  color={(themeContext || dark).content.active}
                  small
                />
              )}

              <Spacing mr={1} />

              <Tooltip
                appearBefore
                default
                label="Edit chart"
                size={null}
                widthFitContent
              >
                <KeyboardShortcutButton
                  blackBorder
                  compact
                  inline
                  onClick={() => setIsEditing(prev => !prev)}
                  selected={isEditing}
                  uuid={`ChartBlock/edit/${block.uuid}`}
                >
                  <Edit size={UNIT * 2} />
                </KeyboardShortcutButton>
              </Tooltip>

              <Spacing mr={1} />

              <Tooltip
                appearBefore
                default
                label="Delete chart"
                size={null}
                widthFitContent
              >
                <KeyboardShortcutButton
                  blackBorder
                  compact
                  inline
                  onClick={() => deleteWidget(block)}
                  uuid={`ChartBlock/delete/${block.uuid}`}
                >
                  <Trash size={UNIT * 2} />
                </KeyboardShortcutButton>
              </Tooltip>
            </FlexContainer>
          </FlexContainer>
        </Spacing>

        <Spacing mt={1} />

        <FlexContainer
          justifyContent="space-between"
          fullWidth
        >
          <Flex
            flex={6}
            ref={refChartContainer}
          >
            {chartData && !isEmptyObject(chartData) && (
              <Spacing pb={3}>
                <ChartController
                  block={{
                    ...block,
                    configuration: {
                      ...block.configuration,
                      ...configuration,
                    },
                  }}
                  data={chartData}
                  width={chartWidth}
                />
              </Spacing>
            )}
          </Flex>

          {isEditing && (
            <ConfigurationOptionsStyle>
              <FlexContainer
                flexDirection="column"
                fullWidth
              >
                <Spacing mb={1}>
                  <Select
                    onChange={(e) => {
                      const value = e.target.value;
                      const widget = {
                        ...block,
                        configuration: {
                          ...configuration,
                          chart_type: value,
                        },
                      };
                      updateWidget(widget);
                      saveAndRun(widget);
                      setChartType(value);
                    }}
                    placeholder="Select chart type"
                    value={chartType}
                  >
                    {CHART_TYPES.map((chartType: string) => (
                      <option key={chartType} value={chartType}>
                        {capitalize(chartType)}
                      </option>
                    ))}
                  </Select>
                </Spacing>

                <Spacing mb={1}>
                  <Select
                    onChange={e => updateConfiguration({
                      [VARIABLE_NAME_WIDTH_PERCENTAGE]: e.target.value,
                    })}
                    placeholder="Chart width"
                    value={configuration?.[VARIABLE_NAME_WIDTH_PERCENTAGE] || 1}
                  >
                    {[
                      ['1/2 width', 0.5],
                      ['full width', 1],
                    ].map(([label, value]) => (
                      <option key={label} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Spacing>

                {configurationOptionsEls}
              </FlexContainer>
            </ConfigurationOptionsStyle>
          )}
        </FlexContainer>

        {isEditing && (
          <>
            <Spacing my={1} px={1}>
              {/*<FlexContainer>
                {configurationOptionsElsForCode.map((el, idx: number) => (
                  <Spacing key={`code-config-options-${idx}`} ml={idx >= 1 ? 1 : 0}>
                    {el}
                  </Spacing>
                ))}
              </FlexContainer>*/}
              <Text bold>
                Custom chart code
              </Text>
              <Text muted small>
                Write custom logic mapping data to input values for your chart.
              </Text>
            </Spacing>

            <CodeStyle>
              {upstreamBlocks.length >= 1 && (
                <CodeHelperStyle>
                  <Text muted small>
                    Variables you can use in your code: {availableVariables}
                  </Text>
                  <Text muted small>
                    Variables that you must define: {variablesMustDefine}
                  </Text>
                </CodeHelperStyle>
              )}

              {codeEditorEl}
            </CodeStyle>
          </>
        )}

        {codeOutputEl && (
          <Spacing px={1}>
            {codeOutputEl}
          </Spacing>
        )}
      </ChartBlockStyle>
    </Col>
  );
}

export default ChartBlock;
