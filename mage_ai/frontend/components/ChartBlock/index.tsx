import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { useMutation } from 'react-query';

import AutocompleteItemType from '@interfaces/AutocompleteItemType';
import BlockType, {
  BlockLanguageEnum,
  BlockTypeEnum,
  OutputType,
  StatusTypeEnum,
} from '@interfaces/BlockType';
import ChartController from './ChartController';
import Chip from '@oracle/components/Chip';
import CodeEditor, { CodeEditorSharedProps } from '@components/CodeEditor';
import CodeOutput from '@components/CodeBlock/CodeOutput';
import Col from '@components/shared/Grid/Col';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType, {
  DataTypeEnum,
  ExecutionStateEnum,
} from '@interfaces/KernelOutputType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import LabelWithValueClicker from '@oracle/components/LabelWithValueClicker';
import Link from '@oracle/elements/Link';
import MultiSelect from '@oracle/elements/Inputs/MultiSelect';
import PipelineType from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import buildAutocompleteProvider from '@components/CodeEditor/autocomplete';
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
import {
  KEY_CODE_ENTER,
  KEY_CODE_META,
} from '@utils/hooks/keyboardShortcuts/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  capitalize,
  isJsonString,
} from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy, remove, sortByKey } from '@utils/array';
import { isEmptyObject } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { useKeyboardContext } from '@context/Keyboard';

export type ChartPropsShared = {
  autocompleteItems: AutocompleteItemType[];
  blockRefs: any;
  blocks: BlockType[];
  chartRefs: any;
  deleteWidget: (block: BlockType) => void;
  fetchPipeline: () => void;
  fetchFileTree: () => void;
  pipeline: PipelineType;
  runBlock: (payload: {
    block: BlockType;
    code: string;
    ignoreAlreadyRunning?: boolean;
    runUpstream?: boolean;
  }, opts?: {
    skipUpdating?: boolean;
  }) => Promise<any> | void;
  runningBlocks: BlockType[];
  savePipelineContent: () => Promise<any>;
  setAnyInputFocused: (value: boolean) => void;
  setErrors: (errors: ErrorsType) => void;
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
  autocompleteItems,
  block,
  blockRefs,
  blocks,
  deleteWidget,
  executionState,
  fetchPipeline,
  fetchFileTree,
  messages = [],
  onChangeContent,
  pipeline,
  runBlock,
  runningBlocks,
  savePipelineContent,
  selected,
  setAnyInputFocused,
  setErrors,
  setSelectedBlock,
  setTextareaFocused,
  textareaFocused,
  updateWidget,
  width,
}: ChartBlockType, ref) {
  const refChartContainer = useRef(null);
  const themeContext = useContext(ThemeContext);

  const {
    data: dataBlock,
  } = api.blocks.pipelines.detail(
    pipeline?.uuid,
    block?.upstream_blocks[0],
  );
  const outputs = dataBlock?.block?.outputs || block?.outputs || [];

  const [autocompleteProviders, setAutocompleteProviders] = useState(null);
  const [chartType, setChartType] = useState<ChartTypeEnum>(block.configuration?.chart_type);
  const [configuration, setConfiguration] = useState<ConfigurationType>(block.configuration);
  const [content, setContent] = useState<string>(block.content);
  const [isEditing, setIsEditing] = useState<boolean>(!chartType || outputs.length === 0);
  const [isEditingBlock, setIsEditingBlock] = useState(false);
  const [chartWidth, setChartWidth] = useState<number>(null);
  const [upstreamBlocks, setUpstreamBlocks] = useState<string[]>(block?.upstream_blocks);
  const [runCount, setRunCount] = useState<number>(outputs?.length || 0);
  const [newBlockUuid, setNewBlockUuid] = useState(block.uuid);

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

  const messagesWithType = useMemo(() =>
    messages?.filter((kernelOutput: KernelOutputType) => kernelOutput?.type),
    [messages],
  );
  const hasError = !!messagesWithType.find(({ error }) => error);
  const hasOutput = messagesWithType.length >= 1;
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
      .replaceAll('\\\'', '\'');
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
    runBlock,
    savePipelineContent,
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

  useEffect(() => {
    setAutocompleteProviders({
      python: buildAutocompleteProvider({
        autocompleteItems,
        block,
        blocks,
        pipeline,
      }),
    });
  }, [
    autocompleteItems,
    block,
    blocks,
    pipeline,
  ]);

  const codeEditorEl = useMemo(() => (
    <CodeEditor
      autoHeight
      autocompleteProviders={autocompleteProviders}
      onChange={updateContent}
      selected={selected}
      setSelected={(value: boolean) => setSelectedBlock(value === true ? block : null)}
      setTextareaFocused={setTextareaFocused}
      showLineNumbers={false}
      textareaFocused={textareaFocused || (ChartTypeEnum.TABLE === chartType && !isEditing)}
      value={content}
      width="100%"
    />
  ), [
    autocompleteProviders,
    block,
    chartType,
    content,
    isEditing,
    selected,
    setSelectedBlock,
    setTextareaFocused,
    textareaFocused,
    updateContent,
  ]);

  const codeOutputEl = useMemo(() => (hasError || hasOutput) && (
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
      setTimeout(() => {
        const w = refChartContainer?.current?.getBoundingClientRect()?.width;
        if (w) {
          setChartWidth(w);
        }
      }, 100);
    } else if (rect) {
      setChartWidth(rect.width);
    }
  }, [
    isEditing,
    isEditingPrevious,
    refChartContainer,
    setChartWidth,
    width,
    widthPrevious,
  ]);

  const availableVariables = useMemo(() => {
    const arr = [];

    upstreamBlocks.forEach((blockUUID: string, idx: number) => {
      const b = blocksMapping[blockUUID];
      const blockColor =
        getColorsForBlockType(
          b?.type,
          { blockColor: b?.color, theme: themeContext },
        ).accent;

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
        </Spacing>,
      );
    });

    return arr;
  }, [
    blockRefs,
    blocksMapping,
    themeContext,
    upstreamBlocks,
  ]);

  const variablesMustDefine = useMemo(() => {
    const arr = [];

    // @ts-ignore
    const vars = configurationOptions?.code?.reduce((acc, { uuid }) => VARIABLE_NAMES.includes(uuid)
      ? acc.concat(uuid)
      : acc
    , []);

    vars?.forEach((varName: string) => {
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
          </Spacing>,
        );
      }
    });

    return arr;
  }, [
    chartType,
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
        if (defaultSettings.configuration) {
          updateConfiguration(defaultSettings.configuration(blockUpdated));
        }
        // @ts-ignore
        if (defaultSettings.content) {
          // @ts-ignore
          updateContent(defaultSettings.content(blockUpdated));
        }
      }
    }
  }, [
    block,
    chartType,
    chartTypePrevious,
    configuration,
    content,
    defaultSettings,
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
          onBlur: () => setSelectedBlock(block),
          onChange: e => updateConfiguration({
            [uuid]: e.target.value,
          }, {
            autoRun,
          }),
          onFocus: () => setSelectedBlock(block),
          value: configuration?.[uuid] || '',
        };

        const blocks = dataBlock?.block ? [dataBlock.block] : [];

        const columns = blocks.reduce((acc, {
          outputs,
        }) => {
          if (!outputs) {
            return acc;
          }

          return acc.concat(outputs.reduce((acc2, {
            sample_data: sampleData,
          }) => {
            if (sampleData?.columns) {
              return acc2.concat(sampleData.columns);
            }

            return acc2;
          }, []));
        }, []);

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
                  {sortByKey(columns.filter(col => !columnsFromConfig.includes(col)), v => v).map((val: string) => (
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
                  {sortByKey(columns, v => v).map((val: string) => (
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
    block,
    configuration,
    configurationOptions,
    dataBlock,
    setSelectedBlock,
    updateConfiguration,
  ]);

  const [updateBlock]: any = useMutation(
    api.widgets.pipelines.useUpdate(pipeline?.uuid, block.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setIsEditingBlock(false);
            fetchPipeline();
            fetchFileTree?.();
          },
          onErrorCallback: (response, errors) => setErrors?.({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const uuidKeyboard = `ChartBlock/${block.uuid}`;
  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping, keyHistory) => {
      if (isEditingBlock
        && String(keyHistory[0]) === String(KEY_CODE_ENTER)
        && String(keyHistory[1]) !== String(KEY_CODE_META)
      ) {
        updateBlock({
          widget: {
            ...block,
            name: newBlockUuid,
          },
        });
      }
    },
    [
      block,
      isEditingBlock,
      newBlockUuid,
      updateBlock,
    ],
  );

  return (
    <Col sm={12} md={12 * widthPercentage}>
      <ChartBlockStyle ref={ref}>
        <Spacing mt={1} pt={1} px={1}>
          <FlexContainer
            alignItems="center"
            fullWidth
            justifyContent="space-between"
          >
            <Flex flex={1} style={{ position: 'relative' }}>
              <LabelWithValueClicker
                bold={false}
                fullWidth
                inputValue={newBlockUuid}
                notRequired
                onBlur={() => setTimeout(() => setIsEditingBlock(false), 300)}
                onChange={(e) => {
                  setNewBlockUuid(e.target.value);
                  e.preventDefault();
                }}
                onClick={() => {
                  setAnyInputFocused(true);
                  setIsEditingBlock(true);
                }}
                onFocus={() => {
                  setAnyInputFocused(true);
                  setIsEditingBlock(true);
                }}
                small
                stacked
                value={!isEditingBlock && block.uuid}
              />

              {isEditingBlock && (
                <>
                  <Spacing ml={1} />

                  <Link
                    noWrapping
                    onClick={() => updateBlock({
                      widget: {
                        ...block,
                        name: newBlockUuid,
                      },
                    })}
                    preventDefault
                    sameColorAsText
                    small
                  >
                    Update chart name
                  </Link>
                </>
              )}
            </Flex>

            <Spacing mr={1} />

            <FlexContainer alignItems="center">
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
                  setUpstreamBlocks(value);
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

              <Spacing mr={1} />

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
          fullWidth
          justifyContent="space-between"
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

        {isEditing
          && !!configurationOptionsElsForCode?.length
          && BlockLanguageEnum.SQL !== block.language
          && (
          <>
            <Spacing my={1} px={1}>
              <Text bold>
                Custom chart code
              </Text>
              <Text muted>
                Write custom logic mapping data to input values for your chart.
                <br />
                This code is only executed if you don’t have any columns or metrics selected.
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

export default React.forwardRef(ChartBlock);
