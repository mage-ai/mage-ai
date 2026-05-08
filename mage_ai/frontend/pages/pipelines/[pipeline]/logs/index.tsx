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
import Select from '@oracle/elements/Inputs/Select';
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
import { TabType } from '@oracle/components/Tabs/ButtonTabs';
import { calculateStartTimestamp } from '@utils/number';
import { find, indexBy, sortByKey } from '@utils/array';
import { get, set } from '@storage/localStorage';
import { goToWithQuery } from '@utils/routing';
import { ignoreKeys, isEmptyObject, isEqual } from '@utils/hash';
import { initializeLogs } from '@utils/models/log';
import { numberWithCommas } from '@utils/string';
import { queryFromUrl } from '@utils/url';
import {
  LogSearchFieldEnum,
  logMatchesSearchByField,
  normalizeSearchQuery,
} from '@components/Logs/search';

const PIPELINE_RUN_ID_PARAM = 'pipeline_run_id[]';
const BLOCK_RUN_ID_PARAM = 'block_run_id[]';
const SEARCH_FIELD_OPTIONS: Array<{ label: string; value: LogSearchFieldEnum }> = [
  {
    label: 'All fields',
    value: LogSearchFieldEnum.ALL,
  },
  {
    label: 'Message',
    value: LogSearchFieldEnum.MESSAGE,
  },
  {
    label: 'Error',
    value: LogSearchFieldEnum.ERROR,
  },
  {
    label: 'Block UUID',
    value: LogSearchFieldEnum.BLOCK_UUID,
  },
  {
    label: 'Level',
    value: LogSearchFieldEnum.LEVEL,
  },
  {
    label: 'Pipeline run ID',
    value: LogSearchFieldEnum.PIPELINE_RUN_ID,
  },
  {
    label: 'Block run ID',
    value: LogSearchFieldEnum.BLOCK_RUN_ID,
  },
  {
    label: 'Log UUID',
    value: LogSearchFieldEnum.LOG_UUID,
  },
];

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
  const pipelineUUID = pipelineProp.uuid;

  const [query, setQuery] = useState<FilterQueryType>(null);
  const [selectedLog, setSelectedLog] = useState<LogType>(null);
  const [selectedRange, setSelectedRange] = useState<LogRangeEnum>(null);
  const [errors, setErrors] = useState<ErrorsType>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>(TAB_DETAILS);
  const [autoScrollLogs, setAutoScrollLogs] = useState(get(LOCAL_STORAGE_KEY_AUTO_SCROLL_LOGS, true));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchField, setSearchField] = useState<LogSearchFieldEnum>(LogSearchFieldEnum.ALL);
  const [matchIndex, setMatchIndex] = useState<number>(0);
  const [pendingSearchDirection, setPendingSearchDirection] = useState<1 | -1>(null);
  const [refreshVersion, setRefreshVersion] = useState<number>(0);

  useEffect(() => {
    // forcing a refresh of the logs when navigating between pipelines to reset the state of the page
    setRefreshVersion(previousValue => previousValue + 1);
  }, []);

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
  const logIndexByUUID = useMemo(() => logsFiltered.reduce((acc, log, idx) => {
    const logUUID = log?.data?.uuid;
    if (logUUID) {
      acc[logUUID] = idx;
    }

    return acc;
  }, {}), [logsFiltered]);
  const normalizedSearchQuery = useMemo(() => normalizeSearchQuery(searchQuery), [searchQuery]);
  const matchedLogs: LogType[] = useMemo(() => {
    if (!normalizedSearchQuery) {
      return [];
    }

    return logsFiltered.filter(log => logMatchesSearchByField(log, normalizedSearchQuery, searchField));
  }, [logsFiltered, normalizedSearchQuery, searchField]);
  const matchedLogIndices: number[] = useMemo(
    () => matchedLogs
      .map(log => logIndexByUUID[log?.data?.uuid])
      .filter((idx: number) => typeof idx === 'number'),
    [logIndexByUUID, matchedLogs],
  );

  useEffect(() => {
    setMatchIndex(previousMatchIndex => {
      if (!matchedLogs?.length) {
        return 0;
      }

      return Math.min(previousMatchIndex, matchedLogs.length - 1);
    });
  }, [matchedLogs]);

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
  const jumpToMatch = useCallback((direction = 1) => {
    if (!normalizedSearchQuery) {
      return;
    }

    const currentLogUUID = q?.[LOG_UUID_PARAM] as string;
    const currentLogIndex = typeof logIndexByUUID?.[currentLogUUID] === 'number'
      ? logIndexByUUID?.[currentLogUUID]
      : -1;

    const pickMatchIndex = (fallbackToBoundary = false) => {
      if (!matchedLogIndices.length) {
        return -1;
      }

      if (direction === 1) {
        const indexInMatchedLogs = matchedLogIndices.findIndex(idx => idx > currentLogIndex);
        if (indexInMatchedLogs >= 0) {
          return indexInMatchedLogs;
        }
        return fallbackToBoundary ? 0 : -1;
      }

      let indexInMatchedLogs = -1;
      matchedLogIndices.forEach((idx, idxMatched) => {
        if (idx < currentLogIndex) {
          indexInMatchedLogs = idxMatched;
        }
      });
      if (indexInMatchedLogs >= 0) {
        return indexInMatchedLogs;
      }
      return fallbackToBoundary ? matchedLogIndices.length - 1 : -1;
    };

    const nextMatchIndex = pickMatchIndex();
    if (nextMatchIndex >= 0 && matchedLogs[nextMatchIndex]) {
      const matchedLog = matchedLogs[nextMatchIndex];
      setPendingSearchDirection(null);
      setMatchIndex(nextMatchIndex);
      goToWithQuery({ [LOG_UUID_PARAM]: matchedLog?.data?.uuid });
      setSelectedLog(matchedLog || null);
      return;
    }

    // If we reached the boundary of currently loaded logs, page and retry.
    if (direction === 1 && !allPastLogsLoaded) {
      setPendingSearchDirection(1);
      loadPastLogInterval();
      return;
    }

    if (direction === -1 && offset > 0) {
      setPendingSearchDirection(-1);
      loadNewerLogInterval();
      return;
    }

    const boundaryMatchIndex = pickMatchIndex(true);
    if (boundaryMatchIndex >= 0 && matchedLogs[boundaryMatchIndex]) {
      const matchedLog = matchedLogs[boundaryMatchIndex];
      setPendingSearchDirection(null);
      setMatchIndex(boundaryMatchIndex);
      goToWithQuery({ [LOG_UUID_PARAM]: matchedLog?.data?.uuid });
      setSelectedLog(matchedLog || null);
    }
  }, [
    allPastLogsLoaded,
    loadNewerLogInterval,
    loadPastLogInterval,
    logIndexByUUID,
    matchedLogIndices,
    matchedLogs,
    normalizedSearchQuery,
    offset,
    q,
  ]);

  useEffect(() => {
    if (!pendingSearchDirection) {
      return;
    }

    if (!normalizedSearchQuery) {
      setPendingSearchDirection(null);
      return;
    }

    if (matchedLogs.length >= 1) {
      jumpToMatch(pendingSearchDirection);
      return;
    }

    const noMoreLogsToPage = pendingSearchDirection === 1
      ? allPastLogsLoaded
      : offset <= 0;

    if (noMoreLogsToPage) {
      setPendingSearchDirection(null);
    }
  }, [
    allPastLogsLoaded,
    jumpToMatch,
    matchedLogs,
    normalizedSearchQuery,
    offset,
    pendingSearchDirection,
  ]);

  const LogsTableMemo = useMemo(() => (
    <LogsTable
      autoScrollLogs={autoScrollLogs}
      blocksByUUID={blocksByUUID}
      jumpToLogUUID={q?.[LOG_UUID_PARAM] as string}
      logs={logsFiltered}
      onRowClick={setSelectedTab}
      pipeline={pipeline}
      query={query}
      refreshVersion={refreshVersion}
      saveScrollPosition={saveScrollPosition}
      searchQuery={searchQuery}
      setSelectedLog={setSelectedLog}
      tableInnerRef={tableInnerRef}
      themeContext={themeContext}
    />
  ), [
    autoScrollLogs,
    blocksByUUID,
    logsFiltered,
    pipeline,
    q,
    query,
    saveScrollPosition,
    searchQuery,
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
          searchQuery={searchQuery}
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
          <>
            <Text>
              {numberWithCommas(filteredLogCount)} logs found
            </Text>

            <LogToolbar
              allPastLogsLoaded={allPastLogsLoaded}
              loadNewerLogInterval={loadNewerLogInterval}
              loadPastLogInterval={loadPastLogInterval}
              saveScrollPosition={saveScrollPosition}
              selectedRange={selectedRange}
              setSelectedRange={setSelectedRange}
            />

            <Spacing pb={1}>
              <FlexContainer alignItems="center">
                <TextInput
                  compact
                  defaultColor
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if ('Enter' === e.key) {
                      e.preventDefault();
                      jumpToMatch(1);
                    }
                  }}
                  placeholder="Search in currently loaded logs"
                  value={searchQuery}
                />

                <Spacing mr={1} />

                <Select
                  compact
                  defaultColor
                  onChange={e => setSearchField(e.target.value as LogSearchFieldEnum)}
                  value={searchField}
                >
                  {SEARCH_FIELD_OPTIONS.map(({ label, value }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>

                <Spacing mr={1} />

                <KeyboardShortcutButton
                  {...SHARED_BUTTON_PROPS}
                  disabled={!searchQuery}
                  onClick={() => {
                    setSearchQuery('');
                    setMatchIndex(0);
                    setPendingSearchDirection(null);
                  }}
                  uuid="logs/clear_search"
                >
                  Clear
                </KeyboardShortcutButton>

                <Spacing mr={1} />

                <KeyboardShortcutButton
                  {...SHARED_BUTTON_PROPS}
                  disabled={matchedLogs.length <= 0}
                  onClick={() => jumpToMatch(-1)}
                  uuid="logs/previous_match"
                >
                  Previous match
                </KeyboardShortcutButton>

                <Spacing mr={1} />

                <KeyboardShortcutButton
                  {...SHARED_BUTTON_PROPS}
                  disabled={matchedLogs.length <= 0}
                  onClick={() => jumpToMatch(1)}
                  uuid="logs/next_match"
                >
                  Next match
                </KeyboardShortcutButton>

                <Spacing mr={1} />

                <Text muted small>
                  {normalizedSearchQuery
                    ? `${numberWithCommas(matchedLogs.length)} matches in current page (Next/Previous can auto-page)`
                    : 'Enter text to search logs'}
                </Text>
              </FlexContainer>
            </Spacing>
          </>
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

      {!isLoading && logsFiltered.length >= 1 && LogsTableMemo}

      <Spacing p={`${UNIT * 1.5}px`}>
        <FlexContainer alignItems="center">
          <KeyboardShortcutButton
            {...SHARED_BUTTON_PROPS}
            onClick={() => {
              setRefreshVersion(previousValue => previousValue + 1); // adding refresh version trigger
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
