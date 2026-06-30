import { ThemeContext } from 'styled-components';
import { parse } from 'yaml';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import Filter, { FilterQueryType, FilterQueryParamEnum } from '@components/Logs/Filter';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import LogDetail, { TAB_DETAILS } from '@components/Logs/Detail';
import LogsTable, { LOG_UUID_PARAM } from '@components/Logs/Table';
import LogToolbar, { SHARED_BUTTON_PROPS } from '@components/Logs/Toolbar';
import LogType, { LogRangeEnum } from '@interfaces/LogType';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import usePrevious from '@utils/usePrevious';
import {
  LOG_FILE_COUNT_INTERVAL,
  LOG_RANGE_SEC_INTERVAL_MAPPING,
} from '@components/Logs/Toolbar/constants';
import { LOCAL_STORAGE_KEY_AUTO_SCROLL_LOGS } from '@storage/constants';
import { MetaQueryEnum } from '@api/constants';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SEARCH_INPUT_PROPS } from '@components/shared/Table/Toolbar/constants';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { calculateStartTimestamp } from '@utils/number';
import { find, indexBy, sortByKey } from '@utils/array';
import { get, set } from '@storage/localStorage';
import { goToWithQuery } from '@utils/routing';
import { ignoreKeys, isEmptyObject, isEqual } from '@utils/hash';
import { Close } from '@oracle/icons';
import { getLogMessageText, initializeLogs } from '@utils/models/log';
import { numberWithCommas } from '@utils/string';
import { queryFromUrl } from '@utils/url';

const PIPELINE_RUN_ID_PARAM = 'pipeline_run_id[]';
const BLOCK_RUN_ID_PARAM = 'block_run_id[]';
const LOG_SEARCH_INPUT_MAX_WIDTH = UNIT * 40;
const LOG_SEARCH_INPUT_MIN_WIDTH = UNIT * 24;

type PipelineLogsPageProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineLogsPage({
  pipeline: pipelineProp,
}: PipelineLogsPageProp) {
  const themeContext = useContext(ThemeContext);
  const tableInnerRef = useRef(null);
  const logSearchInputRef = useRef(null);
  const pipelineUUID = pipelineProp.uuid;

  const [query, setQuery] = useState<FilterQueryType>(null);
  const [selectedLog, setSelectedLog] = useState<LogType>(null);
  const [selectedRange, setSelectedRange] = useState<LogRangeEnum>(null);
  const [errors, setErrors] = useState<ErrorsType>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>(TAB_DETAILS);
  const [autoScrollLogs, setAutoScrollLogs] = useState(get(LOCAL_STORAGE_KEY_AUTO_SCROLL_LOGS, true));
  const [logSearchText, setLogSearchText] = useState<string>('');

  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID, {
    includes_content: false,
    includes_outputs: false,
  }, {
    revalidateOnFocus: false,
  });
  const pipeline: PipelineType = useMemo(() => ({
    ...dataPipeline?.pipeline,
    uuid: pipelineUUID,
  }), [
    dataPipeline,
    pipelineUUID,
  ]);
  const isIntegrationPipeline = pipeline?.type === PipelineTypeEnum.INTEGRATION;

  const blocks = useMemo(() => pipeline.blocks || [], [pipeline]);
  const blocksByUUID = useMemo(() => {
    let indexedBlocks = indexBy(blocks, ({ uuid }) => uuid);
    if (isIntegrationPipeline) {
      const dataLoaderBlock: BlockType = find(blocks, ({ type }) => BlockTypeEnum.DATA_LOADER === type);
      const dataLoaderBlockContent = dataLoaderBlock
        ? parse(dataLoaderBlock.content)
        : {};
      const blockTypesByStreamIds = (dataLoaderBlockContent?.catalog?.streams || [])
        .reduce((acc, { tap_stream_id }) => {
          const currentStreamBlockTypeMapping = {};
          blocks.forEach(({ uuid, type }) => {
            const currentKey = `${uuid}:${tap_stream_id}`;
            currentStreamBlockTypeMapping[currentKey] = { type };
          });

          return {
            ...acc,
            ...currentStreamBlockTypeMapping,
          };
        }, {});

      indexedBlocks = {
        ...blockTypesByStreamIds,
        ...indexedBlocks,
      };
    }

    return indexedBlocks;
  }, [blocks, isIntegrationPipeline]);

  const q = queryFromUrl();
  // Currently only supporting saving the log scroll position for trigger logs without filters
  const saveScrollPosition = useMemo(() => (
    q?.hasOwnProperty(FilterQueryParamEnum.PIPELINE_SCHEDULE_ID)
      && !q?.hasOwnProperty(FilterQueryParamEnum.LEVEL)
      && !q?.hasOwnProperty(FilterQueryParamEnum.BLOCK_TYPE)
      && !q?.hasOwnProperty(FilterQueryParamEnum.BLOCK_UUID)
  ), [q]);

  const onlyLoadPastDayLogs = !q?.start_timestamp
    && !(q?.hasOwnProperty(PIPELINE_RUN_ID_PARAM) || q?.hasOwnProperty(BLOCK_RUN_ID_PARAM));
  const dayAgoTimestamp = calculateStartTimestamp(LOG_RANGE_SEC_INTERVAL_MAPPING[LogRangeEnum.LAST_DAY]);
  const { data: dataLogs, mutate: fetchLogs } = api.logs.pipelines.list(
    query ? pipelineUUID : null,
    ignoreKeys(
      onlyLoadPastDayLogs
        ? {
          ...query,
          start_timestamp: dayAgoTimestamp,
        }
        : query,
      [LOG_UUID_PARAM],
    ),
    { refreshInterval: 5000 },
  );
  const isLoading = !dataLogs;
  const {
    blockRunLogs,
    pipelineRunLogs,
    totalBlockRunLogCount,
    totalPipelineRunLogCount,
  } = useMemo(() => {
    if (dataLogs?.logs?.[0]) {
      const {
        block_run_logs: brLogs,
        pipeline_run_logs: prLogs,
        total_block_run_log_count: brLogCount,
        total_pipeline_run_log_count: prLogCount,
      } = dataLogs.logs?.[0] || {};

      return {
        blockRunLogs: brLogs,
        pipelineRunLogs: prLogs,
        totalBlockRunLogCount: brLogCount,
        totalPipelineRunLogCount: prLogCount,
      };
    }

    return {
      blockRunLogs: [],
      pipelineRunLogs: [],
      totalBlockRunLogCount: 0,
      totalPipelineRunLogCount: 0,
    };
  }, [
    dataLogs,
  ]);
  const allPastLogsLoaded = +q?._limit >= totalBlockRunLogCount && +q?._limit >= totalPipelineRunLogCount;
  const logsAll: LogType[] = useMemo(() => sortByKey(
      blockRunLogs
        .concat(pipelineRunLogs)
        .reduce((acc, log) => acc.concat(initializeLogs(log)), []),
      ({ data }) => data?.timestamp || 0,
    ), [
    blockRunLogs,
    pipelineRunLogs,
  ]);

  const logsFiltered: LogType[] = useMemo(() => logsAll
    .filter(({ data }: LogType) => {
      const evals = [];

      if (!query) {
        return true;
      }

      // Filter out empty logs
      evals.push(!isEmptyObject(data));

      if (query['level[]']) {
        evals.push(query['level[]'].includes(data?.level));
      }
      if (query['block_type[]']) {
        let blockUUID = data?.block_uuid;
        if (isIntegrationPipeline) {
          const blockUUIDWithoutStreamIndex = data?.block_uuid?.split(':')
            .slice(0, 2)
            .join(':');
          blockUUID = blockUUIDWithoutStreamIndex;
        }
        evals.push(query['block_type[]'].includes(blocksByUUID[blockUUID]?.type));
      }
      if (query[PIPELINE_RUN_ID_PARAM]) {
        const pipelineRunId = data?.pipeline_run_id;
        evals.push(query[PIPELINE_RUN_ID_PARAM].includes(String(pipelineRunId)));
      }
      if (query[BLOCK_RUN_ID_PARAM]) {
        const blockRunId = data?.block_run_id;
        evals.push(query[BLOCK_RUN_ID_PARAM].includes(String(blockRunId)));
      }

      return evals.every(v => v);
    }), [
      blocksByUUID,
      isIntegrationPipeline,
      logsAll,
      query,
  ]);
  const filteredLogCount = logsFiltered.length;
  const logSearchQuery = useMemo(() => logSearchText.trim().toLowerCase(), [logSearchText]);
  const logsDisplayed: LogType[] = useMemo(() => {
    if (!logSearchQuery?.length) {
      return logsFiltered;
    }

    return logsFiltered.filter((log: LogType) => (
      getLogMessageText(log).toLowerCase().includes(logSearchQuery)
    ));
  }, [
    logSearchQuery,
    logsFiltered,
  ]);
  const displayedLogCount = logsDisplayed.length;
  const hasLogSearch = logSearchQuery.length >= 1;

  const qPrev = usePrevious(q);
  useEffect(() => {
    if (onlyLoadPastDayLogs) {
      goToWithQuery({
        [MetaQueryEnum.LIMIT]: LOG_FILE_COUNT_INTERVAL,
        [MetaQueryEnum.OFFSET]: 0,
        start_timestamp: dayAgoTimestamp,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyLoadPastDayLogs]);
  useEffect(() => {
    if (!isEqual(q, qPrev)) {
      setQuery(q);
    }
  }, [
    q,
    qPrev,
  ]);

  const selectedLogPrev = usePrevious(selectedLog);
  useEffect(() => {
    const logUUID = q[LOG_UUID_PARAM];
    if (logUUID && !selectedLog && !selectedLogPrev) {
      setSelectedLog(logsAll.find(({ data }) => data?.uuid === logUUID));
    }
  }, [
    logsAll,
    q,
    selectedLog,
    selectedLogPrev,
  ]);
  useEffect(() => {
    if (selectedLog?.data?.uuid
      && !logsDisplayed.some(({ data }) => data?.uuid === selectedLog.data?.uuid)
    ) {
      goToWithQuery({ [LOG_UUID_PARAM]: null });
      setSelectedLog(null);
    }
  }, [
    logsDisplayed,
    selectedLog,
  ]);

  const { _limit, _offset } = q;
  const limit = +(_limit || 0);
  const offset = +(_offset || 0);
  const greaterLogCount = Math.max(totalBlockRunLogCount, totalPipelineRunLogCount);
  const loadPastLogInterval = useCallback(() => {
    let newLimit = limit;
    let newOffset = offset;
    if (totalBlockRunLogCount > limit || totalPipelineRunLogCount > limit) {
      newLimit = Math.min(greaterLogCount, (limit + LOG_FILE_COUNT_INTERVAL));
      newOffset = Math.min(
        (offset + LOG_FILE_COUNT_INTERVAL),
        greaterLogCount - (greaterLogCount % LOG_FILE_COUNT_INTERVAL),
      );
      goToWithQuery({
        ...q,
        [MetaQueryEnum.LIMIT]: newLimit,
        [MetaQueryEnum.OFFSET]: newOffset,
      });
    }
  }, [greaterLogCount, limit, offset, q, totalBlockRunLogCount, totalPipelineRunLogCount]);
  const loadNewerLogInterval = useCallback(() => {
    let newLimit = limit;
    let newOffset = offset;
    if (limit >= LOG_FILE_COUNT_INTERVAL) {
      newLimit = Math.max(LOG_FILE_COUNT_INTERVAL, (limit - LOG_FILE_COUNT_INTERVAL));
      if (limit >= greaterLogCount && (greaterLogCount % LOG_FILE_COUNT_INTERVAL !== 0)) {
        newLimit = greaterLogCount - (greaterLogCount % LOG_FILE_COUNT_INTERVAL);
      }
      newOffset = Math.max(0, (offset - LOG_FILE_COUNT_INTERVAL));
      goToWithQuery({
        ...q,
        [MetaQueryEnum.LIMIT]: newLimit,
        [MetaQueryEnum.OFFSET]: newOffset,
      });
    }
  }, [greaterLogCount, limit, offset, q]);
  const toggleAutoScrollLogs = useCallback(() => {
    const autoScrollLogsVal = !autoScrollLogs;
    setAutoScrollLogs(autoScrollLogsVal);
    set(LOCAL_STORAGE_KEY_AUTO_SCROLL_LOGS, autoScrollLogsVal);
  }, [autoScrollLogs]);

  const LogsTableMemo = useMemo(() => (
    <LogsTable
      autoScrollLogs={autoScrollLogs}
      blocksByUUID={blocksByUUID}
      logs={logsDisplayed}
      onRowClick={setSelectedTab}
      pipeline={pipeline}
      query={query}
      saveScrollPosition={saveScrollPosition}
      setSelectedLog={setSelectedLog}
      tableInnerRef={tableInnerRef}
      themeContext={themeContext}
    />
  ), [
    autoScrollLogs,
    blocksByUUID,
    logsDisplayed,
    pipeline,
    query,
    saveScrollPosition,
    themeContext,
  ]);

  return (
    <PipelineDetailPage
      after={selectedLog && (
        <LogDetail
          log={selectedLog}
          onClose={() => {
            goToWithQuery({ [LOG_UUID_PARAM]: null });
            setSelectedLog(null);
          }}
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
        />
      )}
      afterHidden={!selectedLog}
      afterWidth={80 * UNIT}
      before={(
        <Filter
          blocks={blocks}
          query={query}
        />
      )}
      beforeWidth={20 * UNIT}
      breadcrumbs={[
        {
          label: () => 'Logs',
        },
      ]}
      errors={errors}
      pageName={PageNameEnum.PIPELINE_LOGS}
      pipeline={pipeline}
      setErrors={setErrors}
      subheader={null}
      title={({ name }) => `${name} logs`}
      uuid="pipeline/logs"
    >
      <Spacing px={PADDING_UNITS} py={1}>
        {!isLoading && (
          <FlexContainer
            alignItems="center"
            flexWrap="wrap"
            justifyContent="space-between"
            style={{ gap: UNIT }}
          >
            <Flex
              alignItems="center"
              flexWrap="wrap"
              style={{ gap: UNIT }}
            >
              <Text>
                {hasLogSearch
                  ? `${numberWithCommas(displayedLogCount)} of ${numberWithCommas(filteredLogCount)} logs match`
                  : `${numberWithCommas(filteredLogCount)} logs found`
                }
              </Text>

              <LogToolbar
                allPastLogsLoaded={allPastLogsLoaded}
                loadNewerLogInterval={loadNewerLogInterval}
                loadPastLogInterval={loadPastLogInterval}
                saveScrollPosition={saveScrollPosition}
                selectedRange={selectedRange}
                setSelectedRange={setSelectedRange}
              />
            </Flex>

            <Flex
              alignItems="center"
              flex="1 1 240px"
              justifyContent="flex-end"
              style={{
                gap: UNIT,
                maxWidth: LOG_SEARCH_INPUT_MAX_WIDTH + (UNIT * 5),
                minWidth: LOG_SEARCH_INPUT_MIN_WIDTH,
              }}
            >
              <TextInput
                {...SEARCH_INPUT_PROPS}
                maxWidth={LOG_SEARCH_INPUT_MAX_WIDTH}
                minWidth={LOG_SEARCH_INPUT_MIN_WIDTH}
                onChange={e => setLogSearchText(e.target.value)}
                paddingVertical={6}
                placeholder="Search messages"
                ref={logSearchInputRef}
                value={logSearchText}
              />

              {logSearchText && (
                <Button
                  iconOnly
                  noBackground
                  noBorder
                  onClick={() => {
                    setLogSearchText('');
                    logSearchInputRef?.current?.focus();
                  }}
                  title="Clear search"
                >
                  <Close default size={2 * UNIT} />
                </Button>
              )}
            </Flex>
          </FlexContainer>
        )}
        {isLoading && (
          <Text>
            Searching...
          </Text>
        )}
      </Spacing>

      <Divider light />

      {isLoading && (
        <Spacing p={PADDING_UNITS}>
          <Spinner />
        </Spacing>
      )}

      {!isLoading && logsDisplayed.length >= 1 && LogsTableMemo}

      {!isLoading && logsDisplayed.length === 0 && (
        <Spacing p={PADDING_UNITS}>
          <Text muted>
            {hasLogSearch ? 'No matching logs found.' : 'No logs found.'}
          </Text>
        </Spacing>
      )}

      <Spacing p={`${UNIT * 1.5}px`}>
        <FlexContainer alignItems="center">
          <KeyboardShortcutButton
            {...SHARED_BUTTON_PROPS}
            onClick={() => {
              if (q?._offset === '0' && q?._limit === String(LOG_FILE_COUNT_INTERVAL)) {
                fetchLogs(null);
              } else {
                goToWithQuery({
                  _limit: LOG_FILE_COUNT_INTERVAL,
                  _offset: 0,
                });
              }
            }}
            uuid="logs/toolbar/load_newest"
          >
            Load latest logs
          </KeyboardShortcutButton>

          <Spacing mr={1} />

          <KeyboardShortcutButton
            {...SHARED_BUTTON_PROPS}
            backgroundColor={dark.background.page}
            onClick={() => {
              tableInnerRef?.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'end',
                inline: 'nearest',
              });
            }}
            uuid="logs/toolbar/scroll_to_bottomt"
          >
            Scroll to bottom
          </KeyboardShortcutButton>

          <Spacing mr={1} />

          <Flex>
            <Text noWrapping>
              Auto-scroll to new logs
            </Text>
            <Spacing mr={1} />
            <ToggleSwitch
              checked={autoScrollLogs}
              compact
              onCheck={toggleAutoScrollLogs}
            />
          </Flex>
        </FlexContainer>
      </Spacing>
    </PipelineDetailPage>
  );
}

PipelineLogsPage.getInitialProps = async (ctx: any) => {
  const {
    pipeline: pipelineUUID,
  }: {
    pipeline: string;
  } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PrivateRoute(PipelineLogsPage);
