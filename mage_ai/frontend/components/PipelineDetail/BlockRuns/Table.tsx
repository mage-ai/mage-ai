import React, { useContext, useMemo } from 'react';
import NextLink from 'next/link';
import Router from 'next/router';
import { ThemeContext } from 'styled-components';

import BlockRunType, { RunStatus } from '@interfaces/BlockRunType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import Link from '@oracle/elements/Link';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { TodoList } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy } from '@utils/array';

type BlockRunsTableProps = {
  blockRuns: BlockRunType[];
  onClickRow?: (rowIndex: number) => void;
  pipeline: PipelineType;
  selectedRun?: BlockRunType;
};

function BlockRunsTable({
  blockRuns,
  onClickRow,
  pipeline,
  selectedRun,
}: BlockRunsTableProps) {
  const themeContext = useContext(ThemeContext);
  const {
    uuid: pipelineUUID,
  } = pipeline || {};

  const blocks = useMemo(() => pipeline.blocks || [], [pipeline]);
  const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);

  const columnFlex = [null, 1, 3, 2, null, null];
  const columns = [
    {
      uuid: 'Date',
    },
    {
      uuid: 'Status',
    },
    {
      uuid: 'Trigger',
    },
    {
      uuid: 'Block',
    },
    {
      uuid: 'Completed',
    },
    {
      uuid: 'Logs',
    },
  ];

  return (
    <Table
      columnFlex={columnFlex}
      columns={columns}
      isSelectedRow={(rowIndex: number) => blockRuns[rowIndex].id === selectedRun?.id}
      onClickRow={onClickRow}
      rows={blockRuns?.map(({
        block_uuid: blockUUIDOrig,
        completed_at: completedAt,
        created_at: createdAt,
        id,
        pipeline_schedule_id: pipelineScheduleId,
        pipeline_schedule_name: pipelineScheduleName,
        status,
      }: BlockRunType) => {
        let blockUUID = blockUUIDOrig;

        let streamID;
        let index;
        const parts = blockUUID.split(':');

        if (PipelineTypeEnum.INTEGRATION === pipeline.type) {
          blockUUID = parts[0];
          streamID = parts[1];
          index = parts[2];
        }

        let block = blocksByUUID[blockUUID];
        if (!block) {
          block = blocksByUUID[parts[0]];
        }

        return [
          <Text monospace default>
            {createdAt}
          </Text>,
          <Text
            danger={RunStatus.FAILED === status}
            default={RunStatus.CANCELLED === status}
            info={RunStatus.INITIAL === status}
            monospace
            success={RunStatus.COMPLETED === status}
            warning={RunStatus.RUNNING === status}
          >
            {status}
          </Text>,
          <NextLink
            as={`/pipelines/${pipelineUUID}/triggers/${pipelineScheduleId}`}
            href={'/pipelines/[pipeline]/triggers/[...slug]'}
            passHref
          >
            <Link bold sameColorAsText>
              {pipelineScheduleName}
            </Link>
          </NextLink>,
          <NextLink
            as={`/pipelines/${pipelineUUID}/edit?block_uuid=${blockUUID}`}
            href={'/pipelines/[pipeline]/edit'}
            passHref
          >
            <Link
              bold
              sameColorAsText
              verticalAlignContent
            >
              <Circle
                color={getColorsForBlockType(block?.type, {
                  theme: themeContext,
                }).accent}
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
          </NextLink>,
          <Text monospace default>
            {completedAt || '-'}
          </Text>,
          <Button
            default
            iconOnly
            noBackground
            onClick={() => Router.push(
              `/pipelines/${pipelineUUID}/logs?block_run_id[]=${id}`,
            )}
          >
            <TodoList default size={2 * UNIT} />
          </Button>,
        ];
      })}
      uuid="block-runs"
    />
  );
}

export default BlockRunsTable;
