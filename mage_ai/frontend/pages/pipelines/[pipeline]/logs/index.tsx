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
import Filter, { FilterQueryType } from '@components/Logs/Filter';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import LogDetail from '@components/Logs/Detail';
import LogType, { LogRangeEnum } from '@interfaces/LogType';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import LogsTable, { LOG_UUID_PARAM } from '@components/Logs/Table';
import LogToolbar from '@components/Logs/Toolbar';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import {
  LIMIT_PARAM,
  OFFSET_PARAM,
  LOG_FILE_COUNT_INTERVAL,
  LOG_RANGE_SEC_INTERVAL_MAPPING,
} from '@components/Logs/Toolbar/constants';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { calculateStartTimestamp } from '@utils/number';
import { find, indexBy, sortByKey } from '@utils/array';
import { initializeLogs } from '@utils/models/log';
import { goToWithQuery } from '@utils/routing';
import { ignoreKeys, isEqual } from '@utils/hash';
import { numberWithCommas } from '@utils/string';
import { queryFromUrl } from '@utils/url';

const PIPELINE_RUN_ID_PARAM = 'pipeline_run_id[]';
const BLOCK_RUN_ID_PARAM = 'block_run_id[]';

type PipelineLogsPageProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineLogsPage({
  pipeline: pipelineProp,
}: PipelineLogsPageProp) {
  const themeContext = useContext(ThemeContext);
  const bottomOfPageButtonRef = useRef(null);
  const pipelineUUID = pipelineProp.uuid;

  const [query, setQuery] = useState<FilterQueryType>(null);
  const [selectedLog, setSelectedLog] = useState<LogType>(null);
  const [selectedRange, setSelectedRange] = useState<LogRangeEnum>(null);
  const [scrollToBottom, setScrollToBottom] = useState(false);
  const [errors, setErrors] = useState<ErrorsType>(null);

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

  const qPrev = usePrevious(q);
  useEffect(() => {
    if (onlyLoadPastDayLogs) {
      goToWithQuery({
        [LIMIT_PARAM]: LOG_FILE_COUNT_INTERVAL,
        [OFFSET_PARAM]: 0,
        start_timestamp: dayAgoTimestamp,
      });
    }
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
    if (scrollToBottom && !isLoading) {
      bottomOfPageButtonRef?.current?.scrollIntoView();
      setScrollToBottom(false);
    }
  }, [
    scrollToBottom,
    isLoading,
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
        [LIMIT_PARAM]: newLimit,
        [OFFSET_PARAM]: newOffset,
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
        [LIMIT_PARAM]: newLimit,
        [OFFSET_PARAM]: newOffset,
      });
    }
  }, [greaterLogCount, limit, offset, q]);

  const LogsTableMemo = useMemo(() => (
    <LogsTable
      blocksByUUID={blocksByUUID}
      logs={logsFiltered}
      pipeline={pipeline}
      query={query}
      setSelectedLog={setSelectedLog}
      themeContext={themeContext}
    />
  ), [blocksByUUID, logsFiltered, pipeline, query, themeContext]);

  return (
    <PipelineDetailPage
      after={selectedLog && (
        <LogDetail
          log={selectedLog}
          onClose={() => {
            goToWithQuery({ [LOG_UUID_PARAM]: null });
            setSelectedLog(null);
          }}
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
        <Text>
          {!isLoading && (
            <>
              {numberWithCommas(filteredLogCount)} logs found
              <LogToolbar
                allPastLogsLoaded={allPastLogsLoaded}
                loadNewerLogInterval={loadNewerLogInterval}
                loadPastLogInterval={loadPastLogInterval}
                selectedRange={selectedRange}
                setSelectedRange={setSelectedRange}
              />
            </>
          )}
          {isLoading && 'Searching...'}
        </Text>
      </Spacing>

      <Divider light />

      {isLoading && (
        <Spacing p={PADDING_UNITS}>
          <Spinner />
        </Spacing>
      )}

      {!isLoading && logsFiltered.length >= 1 && LogsTableMemo}

      <Spacing p={`${UNIT * 1.5}px`} ref={bottomOfPageButtonRef}>
        <KeyboardShortcutButton
          blackBorder
          inline
          onClick={() => {
            setScrollToBottom(true);
            if (q?._offset === '0' && q?._limit === String(LOG_FILE_COUNT_INTERVAL)) {
              fetchLogs(null);
            } else {
              goToWithQuery({
                _limit: LOG_FILE_COUNT_INTERVAL,
                _offset: 0,
              });
            }
          }}
          paddingBottom={UNIT * 0.75}
          paddingTop={UNIT * 0.75}
          uuid="logs/toolbar/load_newest"
        >
          Load latest logs
        </KeyboardShortcutButton>
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
