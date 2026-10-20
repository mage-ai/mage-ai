import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import BlockRunsTable from '@components/PipelineDetail/BlockRuns/Table';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CodeEditor from '@components/CodeEditor';
import DependencyGraph from '@components/DependencyGraph';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import TagsContainer from '@components/Tags/TagsContainer';
import Text from '@oracle/elements/Text';
import VersionControlFileDetail from './VersionControlFileDetail';
import useStatus from '@utils/models/status/useStatus';
import { AlertTriangle, Check } from '@oracle/icons';
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
import { KeyValueType, ObjectTypeEnum } from '@interfaces/CommandCenterType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PIPELINE_TYPE_LABEL_MAPPING } from '@interfaces/PipelineType';
import { RunStatus, RUN_STATUS_TO_LABEL } from '@interfaces/PipelineRunType';
import { ScheduleStatusEnum, SCHEDULE_TYPE_TO_LABEL } from '@interfaces/PipelineScheduleType';
import { capitalize, pluralize } from '@utils/string';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { getIconColor } from '../ItemRow/index.style';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { sortByKey } from '@utils/array';

const ICON_SIZE = 2.5 * UNIT;
const TEXT_PROPS = {
  default: true,
  large: true,
  monospace: true,
  rightAligned: true,
};

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

  const actions = application?.actions;

  const [modelState, setModel] = useState(null);
  const model = refUUID?.current === item?.uuid ? modelState : null;
  const [selectedTab, setSelectedTab] = useState<TabType>(null);

  const invokeActionAndCallback = useCallback((index: number, results: KeyValueType = {}) => {
    if (!actions?.length) {
      return;
    }

    const action = actions?.[index];

    const result = new Promise((resolve) => {
      return resolve(invokeRequest({
        action,
        focusedItemIndex,
        index,
        item,
        results,
      }).then(({
        data,
      }) => {
        const itemRef = itemsRef?.current?.[focusedItemIndex];
        refUUID.current = item?.uuid;

        setModel(prev => ({
          ...prev,
          ...data,
        }));
      }));
    });

    return result?.then((resultsInner: KeyValueType) => {
      if (index + 1 <= actions?.length - 1) {
        return invokeActionAndCallback(index + 1, {
          ...(results || {}),
          ...(resultsInner || {}),
        });
      }
    });
  }, [
    actions,
    focusedItemIndex,
    invokeRequest,
    item,
  ]);

  useEffect(() => {
    invokeActionAndCallback(0);
  }, [invokeActionAndCallback]);

  const tabs = useMemo(() => {
    const arr = [];

    if (ObjectTypeEnum.PIPELINE_RUN === item?.object_type) {
      arr.push(...[
        {
          uuid: 'Overview',
        },
        {
          uuid: 'Block runs',
        },
        {
          uuid: 'Graph',
        },
      ]);
    }

    return arr;
  }, [item]);

  const buttonTabsMemo = useMemo(() => {
    if (!tabs?.length) {
      return null;
    }

    const itemColor = getIconColor(item);

    return (
      <ButtonTabs
        allowScroll
        contained
        onClickTab={(tab: TabType) => {
          setSelectedTab?.(tab);
        }}
        selectedTabUUID={selectedTab?.uuid}
        tabs={tabs}
        underlineColor={itemColor?.accent}
        underlineStyle
      />
    );
  }, [item, selectedTab, tabs]);

  useEffect(() => {
    if (tabs?.length >= 1 && !selectedTab) {
      setSelectedTab(tabs?.[0]);
    }
  }, [selectedTab, tabs]);

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
    const {
      content,
      name,
      path,
    } = model?.file_content || {
      content: null,
      name: null,
      path: null,
    };

    const language = FILE_EXTENSION_TO_LANGUAGE_MAPPING[item?.metadata?.file?.extension];

    const editor = (
      <CodeEditor
        autoHeight
        language={language}
        padding={UNIT * 2}
        readOnly
        value={typeof content === 'string' && content ? content : ''}
      />
    );
    const dt = momentInLocalTimezone(
      dateFromFromUnixTimestamp(modifiedTimestamp),
      displayLocalTimezone,
    );

    contentEL = (
      <>
        <SetupSection>
          <SetupSectionRow title="Filename">
            <Text {...TEXT_PROPS} default={false}>
              {name}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="File path">
            <div style={{ maxWidth: '70%' }}>
              <Text {...TEXT_PROPS} overflowWrap>
                {path}
              </Text>
            </div>
          </SetupSectionRow>

          <SetupSectionRow title="Language">
            <Text {...TEXT_PROPS}>
              {LANGUAGE_DISPLAY_MAPPING[language] || language}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Size">
            <Text {...TEXT_PROPS}>
              {pluralize('byte', size, true)}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Modified">
            <Text {...TEXT_PROPS}>
              {dt?.format(DATE_FORMAT_FULL)} at {dt?.format(TIME_FORMAT_NO_SEC)}
            </Text>
          </SetupSectionRow>
        </SetupSection>

        <div style={{ marginBottom: PADDING_UNITS * UNIT }} />

        {editor}
      </>
    );
  } else if (ObjectTypeEnum.BLOCK === item?.object_type) {
    const {
      file_path: filePath,
      language,
      pipelines,
      type: blockType,
    } = item?.metadata?.block || {
      file_path: null,
      language: null,
      pipelines: null,
      type: null,
    };
    const {
      color: blockColor,
      configuration,
      content,
      name: nameBlock,
      uuid: blockUUID,
    } = model?.block || {
      color: null,
      configuration: null,
      content: null,
      name: null,
      uuid: null,
    };

    const editor = (
      <CodeEditor
        autoHeight
        language={language}
        padding={UNIT * 2}
        readOnly
        value={content}
      />
    );

    contentEL = (
      <>
        <SetupSection>
          <SetupSectionRow title="Name">
            <Text {...TEXT_PROPS} default={false}>
              {nameBlock || name || blockUUID}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Type">
            <Text
              {...TEXT_PROPS}
              color={getColorsForBlockType(blockType, {
                blockColor,
              })?.accent}
            >
              {BLOCK_TYPE_NAME_MAPPING[blockType]}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Language">
            <Text {...TEXT_PROPS}>
              {LANGUAGE_DISPLAY_MAPPING[language]}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="File path">
            <div style={{ maxWidth: '70%' }}>
              <Text {...TEXT_PROPS} overflowWrap>
                {configuration?.file_source?.path
                  || configuration?.file_path
                  || filePath
                }
              </Text>
            </div>
          </SetupSectionRow>

          <SetupSectionRow title="Pipelines">
            <FlexContainer
              flexDirection="column"
              alignItems="flex-end"
            >
              {sortByKey(pipelines || [], ({ uuid }) => uuid)?.map(({
                uuid
              }, idx) => (
                <Link
                  key={`${uuid}-${idx}-link`}
                  preventDefault
                  href="#"
                  large
                  monospace
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/pipelines/${uuid}/edit`, null, {
                      shallow: true,
                    });
                  }}
                  style={{
                    marginTop: idx >= 1 ? 4 : 0,
                  }}
                >
                  {uuid}
                </Link>
              ))}
            </FlexContainer>
          </SetupSectionRow>
        </SetupSection>

        <div style={{ marginBottom: PADDING_UNITS * UNIT }} />

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
    } = model?.pipeline || item?.metadata?.pipeline || {};
    const {
      repo_path: repoPath,
    } = item?.metadata?.pipeline || {};

    const dt = updatedAt && datetimeInLocalTimezone(
      updatedAt,
      displayLocalTimezone,
    );

    contentEL = (
      <>
        <SetupSection>
          <SetupSectionRow title="Name">
            <Text large rightAligned>
              {name || uuid}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Description">
            <div style={{ maxWidth: '70%' }}>
              <Text {...TEXT_PROPS} disableWordBreak muted={!description} monospace={!description}>
                {description || '-'}
              </Text>
            </div>
          </SetupSectionRow>

          <SetupSectionRow title="Type">
            <Text {...TEXT_PROPS}>
              {PIPELINE_TYPE_LABEL_MAPPING[type]}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Project">
            <Text {...TEXT_PROPS} muted={!repoPath}>
              {repoPath || '-'}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Tags">
            {tags?.length >= 1 && (
              <TagsContainer
                tags={tags?.map(t => ({ uuid: t }))}
              />
            )}
            {!tags?.length && <Text monospace muted>-</Text>}
          </SetupSectionRow>

          <SetupSectionRow title="Updated at">
            <Text {...TEXT_PROPS}>
              {dt}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Triggers">
            <Text {...TEXT_PROPS}>
              {schedules?.length || 0}
            </Text>
          </SetupSectionRow>

          <SetupSectionRow title="Blocks">
            <FlexContainer alignItems="flex-end" flexDirection="column">
              {blocks?.map(({
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

                return (
                  <Link
                    block
                    color={accent}
                    key={`${blockUUID}-${idx}-link`}
                    preventDefault
                    href="#"
                    large
                    monospace
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/pipelines/${uuid}/edit?block_uuid=${blockUUID}`, null, {
                        shallow: true,
                      });
                    }}
                    style={{
                      marginTop: idx >= 1 ? 4 : null,
                    }}
                  >
                    {blockUUID}
                  </Link>
                );
              })}
            </FlexContainer>
          </SetupSectionRow>
        </SetupSection>

        <DependencyGraph
          disabled
          enablePorts={false}
          height={UNIT * 50}
          pannable={false}
          pipeline={{
            blocks,
            uuid,
          }}
          zoomable={false}
        />
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
    } = model?.pipeline_schedule || item?.metadata?.pipeline || {};
    const {
      next_pipeline_run_date: nextPipelineRunDate,
      pipeline_runs_count: pipelineRunsCount,
      runtime_average: runtimeAverage,
      tags,
    } = model?.pipeline_schedule || {};

    const startTimeString = startTime && datetimeInLocalTimezone(
      startTime,
      displayLocalTimezone,
    );
    const nextRunString = nextPipelineRunDate && datetimeInLocalTimezone(
      nextPipelineRunDate,
      displayLocalTimezone,
    );
    const project = repoPath?.split(status?.repo_path_root)[1]?.slice(1);

    contentEL = (
      <SetupSection>
        <SetupSectionRow title="Name">
          <Text large muted={!name} rightAligned>
            {name}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Description">
          <div style={{ maxWidth: '70%' }}>
            <Text {...TEXT_PROPS} disableWordBreak muted={!description} monospace={!description}>
              {description || '-'}
            </Text>
          </div>
        </SetupSectionRow>

        <SetupSectionRow title="Type">
          <Text {...TEXT_PROPS} monospace={false} muted={!scheduleType}>
            {capitalize(SCHEDULE_TYPE_TO_LABEL[scheduleType]?.() || '')}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Frequency">
          <Text {...TEXT_PROPS} muted={!scheduleInterval}>
            {scheduleInterval}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Status">
          <Text
            {...TEXT_PROPS}
            danger={ScheduleStatusEnum.INACTIVE === statusTrigger}
            muted={!statusTrigger}
            success={ScheduleStatusEnum.ACTIVE === statusTrigger}
          >
            {capitalize(statusTrigger || '')}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Tags">
          {tags?.length >= 1 && (
            <TagsContainer
              tags={tags?.map(t => ({ uuid: t }))}
            />
          )}
          {!tags?.length && <Text monospace muted>-</Text>}
        </SetupSectionRow>

        <SetupSectionRow title="Pipeline">
          <Link
            block
            preventDefault
            href="#"
            large
            monospace
            onClick={(e) => {
              e.preventDefault();
              router.push(`/pipelines/${pipelineUUID}/edit`, null, {
                shallow: true,
              });
            }}
          >
            {pipelineUUID}
          </Link>
        </SetupSectionRow>

        <SetupSectionRow title="Project">
          <Text {...TEXT_PROPS} monospace={!repoPath} muted={!repoPath}>
            {repoPath?.length >= 1
              ?  project?.length >= 1 ? project : status?.repo_path_relative
              : '-'
            }
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Start">
          <Text {...TEXT_PROPS} muted={!startTimeString}>
            {startTimeString || '-'}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Next run">
          <Text {...TEXT_PROPS} muted={!nextRunString}>
            {nextRunString || '-'}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Runs">
          <Text {...TEXT_PROPS} muted={!pipelineRunsCount}>
            {pipelineRunsCount || 0}
          </Text>
        </SetupSectionRow>

        <SetupSectionRow title="Average time">
          <Text {...TEXT_PROPS} muted={!runtimeAverage}>
            {runtimeAverage ? pluralize('second', runtimeAverage, true) : '-'}
          </Text>
        </SetupSectionRow>
      </SetupSection>
    );
  } else if (ObjectTypeEnum.PIPELINE_RUN === item?.object_type) {
    const {
      pipeline_run: run,
      trigger,
    } = item?.metadata || {
      pipeline_run: {},
      trigger: {},
    };

    const {
      completed_at: completedAt,
      execution_date: executionDate,
      id,
      passed_sla: passedSla,
      pipeline_schedule_id: triggerID,
      pipeline_uuid: pipelineUUID,
      started_at: startedAt,
      status,
    } = model?.pipeline_run || run || {};
    const {
      name,
    } = trigger || {};

    contentEL = (
      <>
        {buttonTabsMemo}

        {'Overview' === selectedTab?.uuid && (
          <SetupSection borderless noBackground>
            <SetupSectionRow title={`Trigger ${triggerID}`}>
              <Text {...TEXT_PROPS} default={false} muted={!name}>
                {name}
              </Text>
            </SetupSectionRow>

            <SetupSectionRow title="Run ID">
              <Text {...TEXT_PROPS} muted={!id} rightAligned>
                {id}
              </Text>
            </SetupSectionRow>

            <SetupSectionRow title="Pipeline">
              <Link
                block
                preventDefault
                href="#"
                large
                monospace
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/pipelines/${pipelineUUID}/edit`, null, {
                    shallow: true,
                  });
                }}
              >
                {pipelineUUID}
              </Link>
            </SetupSectionRow>

            <SetupSectionRow title="Status">
              <Text
                {...TEXT_PROPS}
                danger={RunStatus.FAILED === status}
                muted={!status}
                success={RunStatus.COMPLETED === status}
                warning={RunStatus.CANCELLED === status}
              >
                {RUN_STATUS_TO_LABEL[status] || '-'}
              </Text>
            </SetupSectionRow>

            <SetupSectionRow title="Execution date">
              <Text {...TEXT_PROPS} muted={!executionDate}>
                {executionDate || '-'}
              </Text>
            </SetupSectionRow>

            <SetupSectionRow title="Started at">
              <Text {...TEXT_PROPS} muted={!startedAt}>
                {startedAt || '-'}
              </Text>
            </SetupSectionRow>

            <SetupSectionRow title="Completed at">
              <Text {...TEXT_PROPS} muted={!completedAt}>
                {completedAt || '-'}
              </Text>
            </SetupSectionRow>

            <SetupSectionRow title="Passed SLA">
              {passedSla ? <AlertTriangle danger size={ICON_SIZE} /> : <Check size={ICON_SIZE} success />}
            </SetupSectionRow>
          </SetupSection>
        )}

        {'Block runs' === selectedTab?.uuid && model?.block_runs?.length >= 1 && (
          <BlockRunsTable
            blockRuns={model?.block_runs}
            pipeline={{
              blocks: model?.blocks,
              uuid: pipelineUUID,
            }}
          />
        )}

        {'Graph' === selectedTab?.uuid && model?.blocks?.length >= 1 && (
          <DependencyGraph
            disabled
            enablePorts={false}
            height={UNIT * 50}
            pannable={false}
            pipeline={{
              blocks: model?.blocks,
              uuid: pipelineUUID,
            }}
            zoomable={false}
          />
        )}
      </>
    );
  } else if (ObjectTypeEnum.VERSION_CONTROL_FILE === item?.object_type) {
    contentEL = <VersionControlFileDetail model={model} />;
  }

  return (
    <ApplicationContentStyle>
      {contentEL}
    </ApplicationContentStyle>
  );
}

export default ApplicationItemDetail;
