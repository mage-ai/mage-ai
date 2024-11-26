import React, { useContext, useMemo, useState } from 'react';
import moment from 'moment';
import NextLink from 'next/link';
import Router from 'next/router';
import { ThemeContext } from 'styled-components';
import { useMutation } from 'react-query';

import AuthToken from '@api/utils/AuthToken';
import BlockRunType, { RunStatus } from '@interfaces/BlockRunType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Table, { SortedColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import { FileExtensionEnum } from '@interfaces/FileType';
import { ResponseTypeEnum } from '@api/constants';
import { Save, Logs } from '@oracle/icons';
import {
  SortDirectionEnum,
  SortQueryEnum,
  TIMEZONE_TOOLTIP_PROPS,
  getRunStatusTextProps,
} from '@components/shared/Table/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { dateFormatLong, datetimeInLocalTimezone, utcStringToElapsedTime } from '@utils/date';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { prettyUnitOfTime } from '@utils/string';
import { openSaveFileDialog } from '@components/PipelineDetail/utils';
import { queryFromUrl } from '@utils/url';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

// The DEFAULT_SORTABLE_BR_COL_INDEXES and COL_IDX_TO_BLOCK_RUN_ATTR_MAPPING
// must be updated if the columns in the Block Runs table are rearranged.
export const DEFAULT_SORTABLE_BR_COL_INDEXES = [0, 2, 4, 5, 6];
export const COL_IDX_TO_BLOCK_RUN_ATTR_MAPPING = {
  0: 'status',
  2: 'block_uuid',
  4: 'created_at',
  5: 'started_at',
  6: 'completed_at',
};

type BlockRunsTableProps = {
  blockRuns: BlockRunType[];
  onClickRow?: (rowIndex: number) => void;
  pipeline: PipelineType;
  selectedRun?: BlockRunType;
  setErrors?: (errors: ErrorsType) => void;
  sortableColumnIndexes?: number[];
};

function BlockRunsTable({
  blockRuns,
  onClickRow,
  pipeline,
  selectedRun,
  setErrors,
  sortableColumnIndexes,
}: BlockRunsTableProps) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const themeContext = useContext(ThemeContext);
  const [blockOutputDownloadProgress, setBlockOutputDownloadProgress] = useState<string>(null);
  const [blockRunIdDownloading, setBlockRunIdDownloading] = useState<number>(null);
  const { uuid: pipelineUUID, type: pipelineType } = pipeline || {};

  const blocks = useMemo(() => pipeline.blocks || [], [pipeline]);
  const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);
  const isIntegration = useMemo(
    () => PipelineTypeEnum.INTEGRATION === pipelineType,
    [pipelineType],
  );
  const isStandardPipeline = useMemo(
    () => PipelineTypeEnum.PYTHON === pipelineType,
    [pipelineType],
  );

  const q = queryFromUrl();
  const sortColumnIndexQuery = q?.[SortQueryEnum.SORT_COL_IDX];
  const sortedColumnInit: SortedColumnType = useMemo(
    () =>
      sortColumnIndexQuery
        ? {
            columnIndex: +sortColumnIndexQuery,
            sortDirection: q?.[SortQueryEnum.SORT_DIRECTION] || SortDirectionEnum.ASC,
          }
        : undefined,
    [q, sortColumnIndexQuery],
  );

  const token = useMemo(() => new AuthToken()?.decodedToken?.token, []);
  const [downloadBlockOutputAsCsvFile, { isLoading: isLoadingDownloadBlockOutputAsCsvFile }]: any =
    useMutation(
      ({ blockUUID, pipelineRunId }: any) =>
        api.block_outputs.pipelines.downloads.detailAsync(
          pipeline?.uuid,
          blockUUID,
          { pipeline_run_id: pipelineRunId, token },
          {
            onDownloadProgress: p =>
              setBlockOutputDownloadProgress((Number(p?.loaded || 0) / 1000000).toFixed(3)),
            responseType: ResponseTypeEnum.BLOB,
          },
        ),
      {
        onSuccess: (response: any) =>
          onSuccess(response, {
            callback: blobResponse => {
              setBlockRunIdDownloading(null);
              openSaveFileDialog(blobResponse, `block_output.${FileExtensionEnum.CSV}`);
            },
            onErrorCallback: (response, errors) =>
              setErrors?.({
                errors,
                response,
              }),
          }),
      },
    );

  const atLeastOneCompleted = useMemo(
    () => blockRuns.some(({ completed_at }) => !!completed_at),
    [blockRuns],
  );

  const timezoneTooltipProps = useMemo(
    () => (displayLocalTimezone ? TIMEZONE_TOOLTIP_PROPS : {}),
    [displayLocalTimezone],
  );
  const { columns, columnFlex } = useMemo(() => {
    const colFlex = [1, null, 2, null, 2, 1, 1, 1, null];
    const arr = [
      {
        uuid: 'Status',
      },
      {
        center: true,
        uuid: 'Logs',
      },
      {
        uuid: 'Block',
      },
      {
        uuid: 'ID',
      },
      {
        uuid: 'Trigger',
      },
      {
        ...timezoneTooltipProps,
        uuid: 'Created at',
      },
      {
        ...timezoneTooltipProps,
        uuid: 'Started at',
      },
      {
        ...timezoneTooltipProps,
        uuid: 'Completed at',
      },
    ];

    if (atLeastOneCompleted) {
      arr.push({
        center: true,
        uuid: 'Runtime',
      });
      colFlex.push(null);
    }

    if (isStandardPipeline) {
      arr.push({
        uuid: 'Output',
      });
    }

    return {
      columnFlex: colFlex,
      columns: arr,
    };
  }, [isStandardPipeline, atLeastOneCompleted, timezoneTooltipProps]);

  return (
    <Table
      columnFlex={columnFlex}
      columns={columns}
      isSelectedRow={(rowIndex: number) => blockRuns[rowIndex].id === selectedRun?.id}
      onClickRow={onClickRow}
      rows={blockRuns?.map((blockRun: BlockRunType) => {
        const {
          block_uuid: blockUUIDOrig,
          completed_at: completedAt,
          created_at: createdAt,
          id,
          metrics,
          pipeline_run_id: pipelineRunId,
          pipeline_schedule_id: pipelineScheduleId,
          pipeline_schedule_name: pipelineScheduleName,
          started_at: startedAt,
          status,
        } = blockRun || {};
        let blockUUID = blockUUIDOrig;

        let streamID;
        let index;
        const parts = blockUUID.split(':');
        const downloadingOutput =
          blockRunIdDownloading === id && isLoadingDownloadBlockOutputAsCsvFile;

        if (isIntegration) {
          blockUUID = parts[0];
          streamID = parts[1];
          index = parts[2];
        }

        let block = blocksByUUID[blockUUID];
        if (!block) {
          block = blocksByUUID[parts[0]];
        }

        const runtime =
          startedAt && completedAt ? moment(completedAt).diff(moment(startedAt), 'seconds') : null;

        const rows = [
          <Text {...getRunStatusTextProps(status)} key={`${id}_status`}>
            {status}
          </Text>,
          <Button
            default
            iconOnly
            key={`${id}_logs`}
            noBackground
            onClick={() => Router.push(`/pipelines/${pipelineUUID}/logs?block_run_id[]=${id}`)}
          >
            <Logs default size={2 * UNIT} />
          </Button>,
          <NextLink
            as={`/pipelines/${pipelineUUID}/edit?block_uuid=${blockUUID}`}
            href={'/pipelines/[pipeline]/edit'}
            key={`${id}_block_uuid`}
            passHref
          >
            <Link bold fitContentWidth verticalAlignContent>
              <Circle
                color={
                  getColorsForBlockType(block?.type, {
                    blockColor: block?.color,
                    theme: themeContext,
                  }).accent
                }
                size={UNIT * 1.5}
                square
              />
              <Spacing mr={1} />
              <Text monospace sky>
                {blockUUID}
                {streamID && ':'}
                {streamID && (
                  <Text default inline monospace>
                    {streamID}
                  </Text>
                )}
                {index >= 0 && ':'}
                {index >= 0 && (
                  <Text default inline monospace>
                    {index}
                  </Text>
                )}
              </Text>
            </Link>
          </NextLink>,
          <Text
            default
            key={`${id}_block_run_id`}
            monospace
            small
          >
            {id}
          </Text>,
          <NextLink
            as={`/pipelines/${pipelineUUID}/triggers/${pipelineScheduleId}`}
            href={'/pipelines/[pipeline]/triggers/[...slug]'}
            key={`${id}_trigger`}
            passHref
          >
            <Link bold sky>
              {pipelineScheduleName}
            </Link>
          </NextLink>,
          <Text
            default
            key={`${id}_created_at`}
            monospace
            small
            title={createdAt ? utcStringToElapsedTime(createdAt) : null}
          >
            {displayLocalTimezone
              ? datetimeInLocalTimezone(createdAt, displayLocalTimezone)
              : dateFormatLong(createdAt, { includeSeconds: true })}
          </Text>,
          <Text
            default
            key={`${id}_started_at`}
            monospace
            small
            title={startedAt ? utcStringToElapsedTime(startedAt) : null}
          >
            {startedAt ? (
              displayLocalTimezone ? (
                datetimeInLocalTimezone(startedAt, displayLocalTimezone)
              ) : (
                dateFormatLong(startedAt, { includeSeconds: true })
              )
            ) : (
              <>&#8212;</>
            )}
          </Text>,
          <Text
            default
            key={`${id}_completed_at`}
            monospace
            small
            title={completedAt ? utcStringToElapsedTime(completedAt) : null}
          >
            {completedAt ? (
              displayLocalTimezone ? (
                datetimeInLocalTimezone(completedAt, displayLocalTimezone)
              ) : (
                dateFormatLong(completedAt, { includeSeconds: true })
              )
            ) : (
              <>&#8212;</>
            )}
          </Text>,
          <Text default key={`${id}_runtime`} monospace small>
            {runtime ? prettyUnitOfTime(runtime) : '-'}
          </Text>,
        ];

        if (isStandardPipeline) {
          rows.push(
            <FlexContainer alignItems="center" justifyContent="center" key={`${id}_save_output`}>
              <Tooltip
                appearBefore
                autoHide={!downloadingOutput}
                block
                forceVisible={downloadingOutput}
                label={
                  downloadingOutput
                    ? `${blockOutputDownloadProgress || 0}mb downloaded...`
                    : 'Save block run output as CSV file (not supported for dynamic blocks)'
                }
                size={null}
              >
                <Button
                  default
                  disabled={
                    !isStandardPipeline ||
                    !(RunStatus.COMPLETED === status) ||
                    isLoadingDownloadBlockOutputAsCsvFile
                  }
                  iconOnly
                  loading={downloadingOutput}
                  noBackground
                  onClick={() => {
                    setBlockOutputDownloadProgress(null);
                    setBlockRunIdDownloading(id);
                    downloadBlockOutputAsCsvFile({ blockUUID, pipelineRunId });
                  }}
                >
                  <Save default size={2 * UNIT} />
                </Button>
              </Tooltip>
            </FlexContainer>,
          );
        }

        return rows;
      })}
      sortableColumnIndexes={sortableColumnIndexes}
      sortedColumn={sortedColumnInit}
      uuid="block-runs"
    />
  );
}

export default BlockRunsTable;
