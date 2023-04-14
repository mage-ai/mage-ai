import Ansi from 'ansi-to-react';
import NextLink from 'next/link';
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
import Circle from '@oracle/elements/Circle';
import Divider from '@oracle/elements/Divider';
import Filter, { FilterQueryType } from '@components/Logs/Filter';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import LogDetail from '@components/Logs/Detail';
import LogType, { LogRangeEnum } from '@interfaces/LogType';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import LogToolbar from '@components/Logs/Toolbar';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { ChevronRight } from '@oracle/icons';
import {
  LIMIT_PARAM,
  LOG_OFFSET_INTERVAL,
  LOG_RANGE_SEC_INTERVAL_MAPPING,
  LOG_STREAM_OFFSET_INTERVAL,
  OFFSET_PARAM,
} from '@components/Logs/Toolbar/constants';
import { LogLevelIndicatorStyle } from '@components/Logs/index.style';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { calculateStartTimestamp } from '@utils/number';
import { find, indexBy, sortByKey } from '@utils/array';
import { formatTimestamp } from '@utils/models/log';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { goToWithQuery } from '@utils/routing';
import { ignoreKeys, isEqual } from '@utils/hash';
import { numberWithCommas } from '@utils/string';
import { queryFromUrl } from '@utils/url';

const LOG_UUID_PARAM = 'log_uuid';
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
  const isIntegrationPipeline = useMemo(() => PipelineTypeEnum.INTEGRATION === pipeline?.type, [pipeline]);
  const isStreamingPipeline = useMemo(() => PipelineTypeEnum.STREAMING === pipeline?.type, [pipeline]);
  const logOffsetInterval = isStreamingPipeline ? LOG_STREAM_OFFSET_INTERVAL : LOG_OFFSET_INTERVAL;

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
  } = useMemo(() => {
    if (dataLogs?.logs?.[0]) {
      const {
        block_run_logs: brLogs,
        pipeline_run_logs: prLogs,
      } = dataLogs.logs?.[0] || {};

      return {
        blockRunLogs: brLogs.flat(),
        pipelineRunLogs: prLogs.flat(),
      };
    }

    return {
      blockRunLogs: [],
      pipelineRunLogs: [],
    };
  }, [
    dataLogs,
  ]);
  const allPastLogsLoaded = !dataLogs?.metadata?.next;
  const logsAll: LogType[] = useMemo(() => sortByKey(
      blockRunLogs.concat(pipelineRunLogs),
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

  const { _limit, _offset } = q;
  const qPrev = usePrevious(q);
  useEffect(() => {
    if (onlyLoadPastDayLogs) {
      goToWithQuery({
        [LIMIT_PARAM]: logOffsetInterval,
        [OFFSET_PARAM]: 0,
        start_timestamp: dayAgoTimestamp,
      });
    } else if (isStreamingPipeline && !_limit) {
      goToWithQuery({
        [LIMIT_PARAM]: logOffsetInterval,
        [OFFSET_PARAM]: 0,
      });
    }
  }, [
    _limit,
    dayAgoTimestamp,
    isStreamingPipeline,
    logOffsetInterval,
    onlyLoadPastDayLogs,
  ]);
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

  const limit = +(_limit || 0);
  const offset = +(_offset || 0);
  const logGroupingCount = dataLogs?.metadata?.count || 1;
  const loadPastLogInterval = useCallback(() => {
    let newLimit = limit;
    let newOffset = offset;
    if (!allPastLogsLoaded) {
      newLimit = Math.min(logGroupingCount, (limit + logOffsetInterval));
      newOffset = Math.min(
        (offset + logOffsetInterval),
        logGroupingCount - (logGroupingCount % logOffsetInterval),
      );
      goToWithQuery({
        ...q,
        [LIMIT_PARAM]: newLimit,
        [OFFSET_PARAM]: newOffset,
      });
    }
  }, [
    allPastLogsLoaded,
    logGroupingCount,
    limit,
    logOffsetInterval,
    offset,
    q,
  ]);
  const loadNewerLogInterval = useCallback(() => {
    let newLimit = limit;
    let newOffset = offset;
    if (limit >= logOffsetInterval) {
      newLimit = Math.max(logOffsetInterval, (limit - logOffsetInterval));
      if (limit >= logGroupingCount && (logGroupingCount % logOffsetInterval !== 0)) {
        newLimit = logGroupingCount - (logGroupingCount % logOffsetInterval);
      }
      newOffset = Math.max(0, (offset - logOffsetInterval));
      goToWithQuery({
        ...q,
        [LIMIT_PARAM]: newLimit,
        [OFFSET_PARAM]: newOffset,
      });
    }
  }, [
    logGroupingCount,
    limit,
    logOffsetInterval,
    offset,
    q,
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
      pageName={PageNameEnum.PIPELINE_LOGS}
      pipeline={pipeline}
      subheader={null}
      title={({ name }) => `${name} logs`}
      uuid="pipeline/logs"
    >
      <Spacing px={PADDING_UNITS} py={1}>
        <Text>
          {!isLoading && (
            <>
              {numberWithCommas(filteredLogCount)} logs displayed
              <LogToolbar
                allPastLogsLoaded={allPastLogsLoaded}
                loadNewerLogInterval={loadNewerLogInterval}
                loadPastLogInterval={loadPastLogInterval}
                logOffsetInterval={logOffsetInterval}
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

      {!isLoading && logsFiltered.length >= 1 && (
        <Table
          columnFlex={[null, null, 1, 9, null]}
          columnMaxWidth={(idx: number) => idx === 3 ? '100px' : null}
          columns={[
            {
              label: () => '',
              uuid: '!',
            },
            {
              uuid: 'Date',
            },
            {
              uuid: 'Block',
            },
            {
              uuid: 'Message',
            },
            {
              label: () => '',
              uuid: '>',
            },
          ]}
          compact
          onClickRow={(rowIndex: number) => {
            const log = logsFiltered[rowIndex];
            let logUUID = log.data?.uuid;

            if (query[LOG_UUID_PARAM] === logUUID) {
              logUUID = null;
            }

            goToWithQuery({ [LOG_UUID_PARAM]: logUUID });
            setSelectedLog(logUUID ? log : null);
          }}
          rows={logsFiltered?.map(({
            content,
            data,
            name,
          }: LogType) => {
            const {
              block_uuid: blockUUIDProp,
              level,
              message,
              timestamp,
            } = data || {};

            let idEl;
            let blockUUID = blockUUIDProp || name.split('.log')[0];

            let streamID;
            let index;
            const parts = blockUUID.split(':');
            if (isIntegrationPipeline) {
              blockUUID = parts[0];
              streamID = parts[1];
              index = parts[2];
            }

            let block = blocksByUUID[blockUUID];
            if (!block) {
              block = blocksByUUID[parts[0]];
            }

            if (block) {
              const color = getColorsForBlockType(
                block.type,
                { blockColor: block.color, theme: themeContext },
              ).accent;

              idEl = (
                <FlexContainer alignItems="center">
                  <NextLink
                    as={`/pipelines/${pipelineUUID}/edit?block_uuid=${blockUUID}`}
                    href="/pipelines/[pipeline]/edit"
                    passHref
                  >
                    <Link
                      block
                      fullWidth
                      sameColorAsText
                      verticalAlignContent
                    >
                      <Circle
                        color={color}
                        size={UNIT * 1.5}
                        square
                      />

                      <Spacing mr={1} />

                      <Text monospace>
                        {blockUUID}{streamID && ': '}{streamID && (
                          <Text default inline monospace>
                            {streamID}
                          </Text>
                        )}{index >= 0 && ': '}{index >= 0 && (
                          <Text default inline monospace>
                            {index}
                          </Text>
                        )}
                      </Text>
                    </Link>
                  </NextLink>
                </FlexContainer>
              );
            }

            return [
              <Flex
                alignItems="center"
                justifyContent="center"
                key="log_type"
              >
                <LogLevelIndicatorStyle {...{ [level?.toLowerCase()]: true }} />
              </Flex>,
              <Text
                default
                key="log_timestamp"
                monospace
              >
                {formatTimestamp(timestamp)}
              </Text>,
              idEl,
              <Text
                key="log_message"
                monospace
                preWrap
                textOverflow
                title={message || content}
              >
                <Ansi>
                  {message || content}
                </Ansi>
              </Text>,
              <Flex
                flex={1}
                justifyContent="flex-end"
                key="chevron_right_icon"
              >
                <ChevronRight default size={2 * UNIT} />
              </Flex>,
            ];
          })}
          uuid="logs"
        />
      )}

      <Spacing p={PADDING_UNITS} ref={bottomOfPageButtonRef}>
        <KeyboardShortcutButton
          blackBorder
          inline
          onClick={() => {
            setScrollToBottom(true);
            if (q?._offset === '0' && q?._limit === String(logOffsetInterval)) {
              fetchLogs(null);
            } else {
              goToWithQuery({
                _limit: logOffsetInterval,
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
