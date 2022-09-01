import NextLink from 'next/link';
import moment from 'moment';
import { ThemeContext } from 'styled-components';
import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import BlockRunType, { RunStatus } from '@interfaces/BlockRunType';
import Circle from '@oracle/elements/Circle';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import LogType, { LogDataType, LogLevelEnum } from '@interfaces/LogType';
import PipelineDetailPage from '@components/PipelineDetailPage';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ChevronRight } from '@oracle/icons';
import { LogLevelIndicatorStyle } from '@components/Logs/index.style';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { indexBy, sortByKey } from '@utils/array';
import { initializeLogs } from '@utils/models/log';
import { queryFromUrl } from '@utils/url';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

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
  const [query, setQuery] = useState<{
    pipeline_run_id?: number;
  }>(null);

  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID);
  const pipeline = useMemo(() => ({
    ...dataPipeline?.pipeline,
    uuid: pipelineUUID,
  }), [
    dataPipeline,
    pipelineUUID,
  ]);
  const blocksByUUID =
    useMemo(() => indexBy(pipeline.blocks || [], ({ uuid }) => uuid), [pipeline]);

  const { data: dataLogs } = api.logs.pipelines.list(pipelineUUID, query, {}, {
    pauseFetch: !query,
  });
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
        blockRunLogs: brLogs.reduce((acc, log) => acc.concat(initializeLogs(log)), []),
        pipelineRunLogs: prLogs.reduce((acc, log) => acc.concat(initializeLogs(log)), []),
      };
    }

    return {
      blockRunLogs: [],
      pipelineRunLogs: [],
    }
  }, [
    dataLogs,
  ]);
  const logs: LogType[] = useMemo(() => sortByKey(
    blockRunLogs.concat(pipelineRunLogs),
    ({ data }) => data?.timestamp || 0,
  ), [
    blockRunLogs,
    pipelineRunLogs,
  ]);

  useEffect(() => {
    const { pipeline_run_id: pipelineRunId } = queryFromUrl();
    if (pipelineRunId) {
      setQuery({ pipeline_run_id: pipelineRunId });
    } else {
      setQuery({});
    }
  }, []);

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Logs',
        },
      ]}
      pageName={PageNameEnum.PIPELINE_LOGS}
      pipeline={pipeline}
      subheader={null}
      title={({ name }) => `${name} logs`}
    >
      {logs.length >= 1 && (
        <Table
          buildLinkProps={(rowIndex: number) => {
            const id = logs[rowIndex].data?.pipeline_schedule_id;

            if (id) {
              return {
                as: `/pipelines/${pipelineUUID}/schedules/${id}`,
                href: '/pipelines/[pipeline]/schedules/[...slug]',
              };
            }
          }}
          columnFlex={[null, null, null, 1, null]}
          columnMaxWidth={(col: string) => col === 'Message' ? '100px' : null}
          columns={[
            {
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
          rows={logs.map(({
            content,
            createdAt,
            data,
          }: LogType) => {
            const {
              // block_run_id: blockRunId,
              block_uuid: blockUUID,
              // error,
              // error_stack,
              // error_stacktrace,
              level,
              message,
              // pipeline_run_id: pipelineRunId,
              pipeline_uuid: pUUID,
              timestamp,
            } = data || {};

            let idEl;
            if (blockUUID) {
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
                        muted
                        fullWidth
                        verticalAlignContent
                      >
                        <Circle
                          color={color}
                          size={UNIT * 1.5}
                          square
                        />

                        <Spacing mr={1} />

                        <Text muted monospace>
                          {blockUUID}
                        </Text>
                      </Link>
                    </NextLink>
                  </FlexContainer>
                );
              }
            }

            // Click to show error

            return [
              <Flex alignItems="center" justifyContent="center">
                <LogLevelIndicatorStyle
                  critical={LogLevelEnum.CRITICAL === level}
                  debug={LogLevelEnum.DEBUG === level}
                  error={LogLevelEnum.ERROR === level || LogLevelEnum.EXCEPTION === level}
                  info={LogLevelEnum.INFO === level}
                  log={LogLevelEnum.LOG === level}
                  warning={LogLevelEnum.WARNING === level}
                />
              </Flex>,
              <Text muted monospace>
                {timestamp && moment.unix(timestamp).utc().format('YYYY-MM-DD HH:mm:ss')}
              </Text>,
              idEl,
              <Text monospace textOverflow>
                {message || content}
              </Text>,
              <Flex flex={1} justifyContent="flex-end">
                <ChevronRight muted size={2 * UNIT} />
              </Flex>,
            ];
          })}
          uuid="logs"
        />
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
