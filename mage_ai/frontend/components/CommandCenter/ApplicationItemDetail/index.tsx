import { useEffect, useRef, useState } from 'react';

import CodeEditor from '@components/CodeEditor';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import TagsContainer from '@components/Tags/TagsContainer';
import Text from '@oracle/elements/Text';
import useStatus from '@utils/models/status/useStatus';
import { ApplicationContentStyle } from '../index.style';
import { ApplicationProps } from '../ItemApplication/constants';
import { BLOCK_TYPE_NAME_MAPPING, LANGUAGE_DISPLAY_MAPPING } from '@interfaces/BlockType';
import {
  DATE_FORMAT_FULL,
  TIME_FORMAT_NO_SEC,
  dateFromFromUnixTimestamp,
  datetimeInLocalTimezone,
  momentInLocalTimezone,
} from '@utils/date';
import { FILE_EXTENSION_TO_LANGUAGE_MAPPING } from '@interfaces/FileType';
import { ObjectTypeEnum } from '@interfaces/CommandCenterType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PIPELINE_TYPE_LABEL_MAPPING } from '@interfaces/PipelineType';
import { SetupSectionRow } from '@components/shared/SetupSection';
import { ScheduleStatusEnum, SCHEDULE_TYPE_TO_LABEL } from '@interfaces/PipelineScheduleType';
import { capitalize, pluralize } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

function ApplicationItemDetail({
  application,
  applicationsRef,
  executeAction,
  focusedItemIndex,
  invokeRequest,
  item,
  itemsRef,
  refError,
  removeApplication,
  router,
}: ApplicationProps) {
  const refUUID = useRef(null);
  const { status } = useStatus();

  const action = application?.action;

  const [modelState, setModel] = useState(null);
  const model = refUUID?.current === item?.uuid ? modelState : null;

  useEffect(() => {
    invokeRequest({
      action,
      focusedItemIndex,
      item,
    }).then(() => {
      const itemRef = itemsRef?.current?.[focusedItemIndex];
      refUUID.current = item?.uuid;
      setModel(itemRef?.actionResults?.[action?.uuid]?.[action?.request?.response_resource_key]);
    });
  }, [action, focusedItemIndex, invokeRequest, item]);

  const displayLocalTimezone = shouldDisplayLocalTimezone();
  let contentEL;

  if (ObjectTypeEnum.FILE === item?.object_type) {
    const {
      extension,
      modified_timestamp: modifiedTimestamp,
      size,
    } = item?.metadata?.file || {
      extension: null,
      modified_timestamp: null,
      size: null,
    };

    const language = FILE_EXTENSION_TO_LANGUAGE_MAPPING[item?.metadata?.file?.extension];

    const editor = (
      <CodeEditor
        autoHeight
        language={language}
        padding={UNIT * 2}
        readOnly
        value={model?.content}
      />
    );
    const dt = momentInLocalTimezone(
      dateFromFromUnixTimestamp(modifiedTimestamp),
      displayLocalTimezone,
    );

    contentEL = (
      <>
        <Spacing mb={PADDING_UNITS}>
          <SetupSectionRow title="Filename">
            <Text monospace rightAligned>
              {model?.name}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="File path">
            <div style={{ maxWidth: '70%' }}>
              <Text default monospace rightAligned>
                {model?.path}
              </Text>
            </div>
          </SetupSectionRow>

          <SetupSectionRow title="Language">
            <Text default rightAligned>
              {LANGUAGE_DISPLAY_MAPPING[language] || language}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Size">
            <Text default monospace rightAligned>
              {pluralize('byte', size, true)}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Modified">
            <Text default monospace rightAligned>
              {dt?.format(DATE_FORMAT_FULL)} at {dt?.format(TIME_FORMAT_NO_SEC)}
            </Text>
          </SetupSectionRow>
        </Spacing>

        {editor}
      </>
    );
  } else if (ObjectTypeEnum.BLOCK === item?.object_type) {
    const {
      color: blockColor,
      name,
      file_path: filePath,
      pipelines,
      type: blockType,
      uuid: blockUUID,
    } = item?.metadata?.block || {
      color: null,
      file_path: null,
      name: null,
      pipelines: null,
      type: null,
      uuid: null,
    };

    const editor = (
      <CodeEditor
        autoHeight
        language={model?.language}
        padding={UNIT * 2}
        readOnly
        value={model?.content}
      />
    );

    const pipelinesCount = pipelines?.length || 0;

    const pipelineUUIDs = [];
    pipelines?.forEach(({
      uuid
    }, idx) => {
      pipelineUUIDs.push(
        <Link
          block
          key={`${uuid}-${idx}-link`}
          preventDefault
          href="#"
          monospace
          onClick={(e) => {
            e.preventDefault();
            router.push(`/pipelines/${uuid}/edit`, null, {
              shallow: true,
            });
          }}
          style={{
            marginLeft: 12,
          }}
        >
          {uuid}
        </Link>
      );
    });

    contentEL = (
      <>
        <Spacing mb={PADDING_UNITS}>
          <SetupSectionRow title="Name">
            <Text monospace rightAligned>
              {model?.name || name || blockUUID}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Type">
            <Text
              color={getColorsForBlockType(blockType, {
                blockColor,
              })?.accent}
              rightAligned
            >
              {BLOCK_TYPE_NAME_MAPPING[blockType]}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Language">
            <Text default rightAligned>
              {LANGUAGE_DISPLAY_MAPPING[model?.language]}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="File path">
            <div style={{ maxWidth: '70%' }}>
              <Text default monospace rightAligned>
                {model?.configuration?.file_source?.path
                  || model?.configuration?.file_path
                  || filePath
                }
              </Text>
            </div>
          </SetupSectionRow>

          <SetupSectionRow title="Pipelines">
            <FlexContainer
              flexWrap="wrap"
              justifyContent="flex-end"
              style={{ maxWidth: '70%' }}
            >
              {pipelineUUIDs}
            </FlexContainer>
          </SetupSectionRow>
        </Spacing>

        {editor}
      </>
    );
  } else if (ObjectTypeEnum.PIPELINE === item?.object_type) {
    const {
      blocks,
      description,
      name,
      schedules,
      tags,
      type,
      updated_at: updatedAt,
      uuid,
    } = model || item?.metadata?.pipeline || {};
    const {
      repo_path: repoPath,
    } = item?.metadata?.pipeline || {};

    const dt = updatedAt && datetimeInLocalTimezone(
      updatedAt,
      displayLocalTimezone,
    );

    const blocksCount = blocks?.length || 0;

    const blockUUIDs = [];
    blocks?.forEach(({
      color: blockColor,
      type: blockType,
      uuid: blockUUID,
    }, idx) => {
      const {
        accent
      } = getColorsForBlockType(blockType, {
        blockColor,
      }) || {
        accent: null,
      };

      blockUUIDs.push(
        <Link
          block
          color={accent}
          key={`${blockUUID}-${idx}-link`}
          preventDefault
          href="#"
          monospace
          onClick={(e) => {
            e.preventDefault();
            router.push(`/pipelines/${uuid}/edit?block_uuid=${blockUUID}`, null, {
              shallow: true,
            });
          }}
          style={{
            marginLeft: 12,
          }}
        >
          {blockUUID}
        </Link>
      );
    });

    contentEL = (
      <>
        <SetupSectionRow title="Name">
          <Text rightAligned>
            {name || uuid}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Description">
          <div style={{ maxWidth: '70%' }}>
            <Text disableWordBreak rightAligned>
              {description}
            </Text>
          </div>
        </SetupSectionRow>

        <SetupSectionRow title="Type">
          <Text default monospace rightAligned>
            {PIPELINE_TYPE_LABEL_MAPPING[type]}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Project">
          <Text default monospace rightAligned>
            {repoPath}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Tags">
          <TagsContainer
            tags={tags?.map(t => ({ uuid: t }))}
          />
        </SetupSectionRow>

        <SetupSectionRow title="Updated at">
          <Text default monospace rightAligned>
            {dt}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Triggers">
          <Text default monospace rightAligned>
            {schedules?.length || 0}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Blocks">
          <Text monospace rightAligned>
            {blockUUIDs}
          </Text>
        </SetupSectionRow>
      </>
    );
  } else if (ObjectTypeEnum.TRIGGER === item?.object_type) {
    const {
      description,
      global_data_product_uuid: globalDataProductUuid,
      id,
      name,
      pipeline_uuid: pipelineUUID,
      repo_path: repoPath,
      schedule_interval: scheduleInterval,
      schedule_type: scheduleType,
      settings,
      sla,
      start_time: startTime,
      status: statusTrigger,
      variables,
    } = model || item?.metadata?.pipeline || {};
    const {
      next_pipeline_run_date: nextPipelineRunDate,
      pipeline_runs_count: pipelineRunsCount,
      runtime_average: runtimeAverage,
      tags,
    } = model || {};

    const startTimeString = startTime && datetimeInLocalTimezone(
      startTime,
      displayLocalTimezone,
    );
    const nextRunString = nextPipelineRunDate && datetimeInLocalTimezone(
      nextPipelineRunDate,
      displayLocalTimezone,
    );

    contentEL = (
      <>
        <SetupSectionRow title="Name">
          <Text muted={!name} rightAligned>
            {name}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Description">
          <div style={{ maxWidth: '70%' }}>
            <Text disableWordBreak muted={!description} rightAligned>
              {description}
            </Text>
          </div>
        </SetupSectionRow>

        <SetupSectionRow title="Type">
          <Text default muted={!scheduleType} rightAligned>
            {capitalize(SCHEDULE_TYPE_TO_LABEL[scheduleType]?.() || '')}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Frequency">
          <Text default monospace muted={!scheduleInterval} rightAligned>
            {scheduleInterval}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Status">
          <Text
            danger={ScheduleStatusEnum.INACTIVE === statusTrigger}
            monospace
            muted={!statusTrigger}
            rightAligned
            success={ScheduleStatusEnum.ACTIVE === statusTrigger}
          >
            {capitalize(statusTrigger || '')}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Tags">
          <TagsContainer
            tags={tags?.map(t => ({ uuid: t }))}
          />
        </SetupSectionRow>

        <SetupSectionRow title="Pipeline">
          <Link
            block
            preventDefault
            href="#"
            monospace
            onClick={(e) => {
              e.preventDefault();
              router.push(`/pipelines/${uuid}/edit`, null, {
                shallow: true,
              });
            }}
          >
            {pipelineUUID}
          </Link>
        </SetupSectionRow>

        <SetupSectionRow title="Project">
          <Text default monospace muted={!repoPath} rightAligned>
            {repoPath?.split(status?.repo_path_root)[1]?.slice(1)}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Start">
          <Text default monospace muted={!startTimeString} rightAligned>
            {startTimeString}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Next run">
          <Text default monospace muted={!nextRunString} rightAligned>
            {nextRunString}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Runs">
          <Text default monospace muted={!pipelineRunsCount} rightAligned>
            {pipelineRunsCount || 0}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Average time">
          <Text monospace muted={!runtimeAverage} rightAligned>
            {runtimeAverage || '-'}
          </Text>
        </SetupSectionRow>
      </>
    );
  }

  return (
    <ApplicationContentStyle>
      {contentEL}
    </ApplicationContentStyle>
  );
}

export default ApplicationItemDetail;
