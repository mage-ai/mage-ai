import NextLink from 'next/link';
import { ThemeContext } from 'styled-components';
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import LogToolbar from '@components/Logs/Toolbar';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { ChevronRight } from '@oracle/icons';
import { LOG_ITEMS_PER_PAGE, LOG_RANGE_SEC_INTERVAL_MAPPING } from '@components/Logs/Toolbar/constants';
import { LogLevelIndicatorStyle } from '@components/Logs/index.style';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { calculateStartTimestamp } from '@utils/number';
import { formatTimestamp, initializeLogs } from '@utils/models/log';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { goToWithQuery } from '@utils/routing';
import { ignoreKeys, isEqual } from '@utils/hash';
import { indexBy, sortByKey } from '@utils/array';
import { numberWithCommas } from '@utils/string';
import { queryFromUrl } from '@utils/url';

const LOG_UUID_PARAM = 'log_uuid';
const PIPELINE_RUN_ID_PARAM = 'pipeline_run_id[]';
const BLOCK_RUN_ID_PARAM = 'block_run_id[]';

type BlockRunsProp = {
  pipeline: {
    uuid: string;
  };
};

function BlockRuns({
  pipeline: pipelineProp,
}: BlockRunsProp) {
  const themeContext = useContext(ThemeContext);
  const bottomOfPageButtonRef = useRef(null);
  const pipelineUUID = pipelineProp.uuid;

  const [offset, setOffset] = useState(LOG_ITEMS_PER_PAGE);
  const [query, setQuery] = useState<FilterQueryType>(null);
  const [selectedLog, setSelectedLog] = useState<LogType>(null);
  const [selectedRange, setSelectedRange] = useState<LogRangeEnum>(null);
  const [scrollToBottom, setScrollToBottom] = useState(false);

  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID);
  const pipeline = useMemo(() => ({
    ...dataPipeline?.pipeline,
    uuid: pipelineUUID,
  }), [
    dataPipeline,
    pipelineUUID,
  ]);
  const blocks = useMemo(() => pipeline.blocks || [], [pipeline]);
  const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);

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
    {},
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
        blockRunLogs: brLogs,
        pipelineRunLogs: prLogs,
      };
    }

    return {
      blockRunLogs: [],
      pipelineRunLogs: [],
    };
  }, [
    dataLogs,
  ]);
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
          evals.push(query['block_type[]'].includes(blocksByUUID[data?.block_uuid]?.type));
        }

        return evals.every(v => v);
      }), [
    blocksByUUID,
    logsAll,
    query,
  ]);
  const filteredLogCount = logsFiltered.length;
  const logs: LogType[] = useMemo(() => logsFiltered.slice(
    Math.max(0, (filteredLogCount - offset)),
  ), [
      filteredLogCount,
      logsFiltered,
      offset,
    ]);

  const qPrev = usePrevious(q);
  useEffect(() => {
    if (onlyLoadPastDayLogs) {
      goToWithQuery({
        start_timestamp: dayAgoTimestamp,
      });
    }
  }, []);
  useEffect(() => {
    if (!isEqual(q, qPrev)) {
      setOffset(LOG_ITEMS_PER_PAGE);
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
              {numberWithCommas(logs.length)} logs of {numberWithCommas(filteredLogCount)} found
              <LogToolbar
                logCount={filteredLogCount}
                logOffset={offset}
                selectedRange={selectedRange}
                setLogOffset={setOffset}
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

      {!isLoading && logs.length >= 1 && (
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
            const log = logs[rowIndex];
            let logUUID = log.data?.uuid;

            if (query[LOG_UUID_PARAM] === logUUID) {
              logUUID = null;
            }

            goToWithQuery({ [LOG_UUID_PARAM]: logUUID });
            setSelectedLog(logUUID ? log : null);
          }}
          rows={logs.map(({
            content,
            createdAt,
            data,
            name,
          }: LogType) => {
            const {
              block_uuid: blockUUIDProp,
              level,
              message,
              pipeline_uuid: pUUID,
              timestamp,
            } = data || {};

            let idEl;
            const blockUUID = blockUUIDProp || name.split('.log')[0];
            const block = blocksByUUID[blockUUID];
            if (block) {
              const color = getColorsForBlockType(block.type, { theme: themeContext }).accent;

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
                        {blockUUID}
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
                textOverflow
              >
                {message || content}
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
            fetchLogs(null);
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

BlockRuns.getInitialProps = async (ctx: any) => {
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

export default BlockRuns;
