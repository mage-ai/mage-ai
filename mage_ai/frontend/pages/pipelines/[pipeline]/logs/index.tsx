import NextLink from 'next/link';
import { ThemeContext } from 'styled-components';
import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import BlockRunType, { RunStatus } from '@interfaces/BlockRunType';
import Circle from '@oracle/elements/Circle';
import Divider from '@oracle/elements/Divider';
import Filter, { FilterQueryType } from '@components/Logs/Filter';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import LogDetail from '@components/Logs/Detail';
import LogType, { LogDataType, LogLevelEnum } from '@interfaces/LogType';
import PipelineDetailPage from '@components/PipelineDetailPage';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { ChevronRight } from '@oracle/icons';
import { LogLevelIndicatorStyle } from '@components/Logs/index.style';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { formatTimestamp, initializeLogs } from '@utils/models/log';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { goToWithQuery } from '@utils/routing';
import { ignoreKeys, isEmptyObject, isEqual } from '@utils/hash';
import { indexBy, sortByKey } from '@utils/array';
import { numberWithCommas } from '@utils/string';
import { queryFromUrl } from '@utils/url';

const ITEMS_PER_PAGE = 40;
const LOG_UUID_PARAM = 'log_uuid';

type BlockRunsProp = {
  pipeline: {
    uuid: string;
  };
};

function BlockRuns({
  pipeline: pipelineProp,
}: BlockRunsProp) {
  const themeContext = useContext(ThemeContext);
  const pipelineUUID = pipelineProp.uuid;

  const [offset, setOffset] = useState(ITEMS_PER_PAGE);
  const [query, setQuery] = useState<FilterQueryType>(null);
  const [selectedLog, setSelectedLog] = useState<LogType>(null);

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

  const { data: dataLogs } = api.logs.pipelines.list(
    pipelineUUID,
    ignoreKeys(query, [LOG_UUID_PARAM]),
    {},
    {
      pauseFetch: !query,
    });
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
    }
  }, [
    dataLogs,
  ]);
  const logsAll: LogType[] = useMemo(() => {
    return sortByKey(
      blockRunLogs
        .concat(pipelineRunLogs)
        .reduce((acc, log) => acc.concat(initializeLogs(log)), []),
      ({ data }) => data?.timestamp || 0,
    );
  }, [
    blockRunLogs,
    pipelineRunLogs,
  ]);
  const logsFiltered: LogType[] = useMemo(() => {
    return logsAll
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
      });
  }, [
    blocksByUUID,
    logsAll,
    query,
  ]);
  const logs: LogType[] = useMemo(() => logsFiltered.slice(0, offset), [
      logsFiltered,
      offset,
    ]);

  const q = queryFromUrl();
  const qPrev = usePrevious(q);
  useEffect(() => {
    if (!isEqual(q, qPrev)) {
      setOffset(ITEMS_PER_PAGE);
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
      setSelectedLog(logsAll.find(({ data }) => data?.uuid === logUUID))
    }
  }, [
    logsAll,
    q,
    selectedLog,
    selectedLogPrev,
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
      before={(
        <Filter
          blocks={blocks}
          query={query}
        />
      )}
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
              {numberWithCommas(logs.length)} logs of {numberWithCommas(logsFiltered.length)} found
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
          compact
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
              <Flex alignItems="center" justifyContent="center">
                <LogLevelIndicatorStyle {...{[level?.toLowerCase()]: true}} />
              </Flex>,
              <Text default monospace>
                {formatTimestamp(timestamp)}
              </Text>,
              idEl,
              <Text monospace textOverflow>
                {message || content}
              </Text>,
              <Flex flex={1} justifyContent="flex-end">
                <ChevronRight default size={2 * UNIT} />
              </Flex>,
            ];
          })}
          uuid="logs"
        />
      )}

      {offset < logsFiltered.length && (
        <Spacing p={PADDING_UNITS}>
          <KeyboardShortcutButton
            blackBorder
            inline
            onClick={() => setOffset(prev => prev + ITEMS_PER_PAGE)}
            sameColorAsText
            uuid="logs/load_more"
          >
            Load more logs
          </KeyboardShortcutButton>
        </Spacing>
      )}
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
