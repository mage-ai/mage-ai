import NextLink from 'next/link';
import { ThemeContext } from 'styled-components';
import { useContext, useEffect, useMemo, useState } from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Divider from '@oracle/elements/Divider';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import SetupSection, { SetupSectionRow } from '@components/shared/SetupSection';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SCHEDULE_TYPE_TO_LABEL } from '@interfaces/PipelineScheduleType';
import { StreamStateData } from '@interfaces/IntegrationSourceType';
import { blocksWithStreamsWithIncrementalReplicationMethod } from '@utils/models/pipeline';
import { capitalize } from '@utils/string';
import { datetimeInLocalTimezone } from '@utils/date';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

type BookmarkValuesProps = {
  pipeline: PipelineType;
};

const SHARED_ROW_PROPS = {
  large: false,
};

function BookmarkValues({
  pipeline,
}: BookmarkValuesProps) {
  const themeContext = useContext(ThemeContext);
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  console.log(displayLocalTimezone)

  const [bookmarkValuesMapping, setBookmarkValuesMapping] = useState<{
    [blockUUID: string]: {
      [streamID: string]: {
        [column: string]: string | number | boolean;
      };
    };
  }>(null);

  const blocksWithStreamsMapping = useMemo(() => pipeline?.blocks
    ? blocksWithStreamsWithIncrementalReplicationMethod(pipeline)
    : null,
  [
    pipeline,
  ]);

  const blockUUIDs = useMemo(() => Object.keys(blocksWithStreamsMapping || {}) || [], [
    blocksWithStreamsMapping,
  ]);

  const { data } = api.integration_sources.pipelines.list(pipeline?.uuid, {
    block_uuid: blockUUIDs,
  }, {}, {
    pauseFetch: !blockUUIDs?.length,
  });

  const stateDataArr: StreamStateData[] = useMemo(() => data?.integration_sources, [data]);

  useEffect(() => {
    if (stateDataArr?.length >= 1 && !bookmarkValuesMapping) {
      const mapping = {};

      stateDataArr?.map(({
        block,
        streams,
      }) => {
        const blockUUID = block?.uuid;
        mapping[blockUUID] = {};

        Object.entries(streams || {})?.forEach(([streamID, v]) => {
          mapping[blockUUID][streamID] = v?.state?.bookmarks?.[streamID];
        });
      });

      setBookmarkValuesMapping(mapping);
    }
  }, [
    bookmarkValuesMapping,
    setBookmarkValuesMapping,
    stateDataArr,
  ]);

  return (
    <Spacing p={PADDING_UNITS}>
      {!data && <Spinner inverted small /> }

      {stateDataArr?.map(({
        block,
        pipeline_run: pipelineRun,
        pipeline_schedule: pipelineSchedule,
        streams,
      }) => {
        const blockUUID = block?.uuid;

        return (
          <SetupSection
            title={(
              <Text
                color={getColorsForBlockType(
                  block?.type,
                  {
                    blockColor: block?.color,
                    theme: themeContext,
                  },
                ).accent}
                monospace
              >
                {blockUUID}
              </Text>
            )}
          >
            <Accordion noBorder noBoxShadow>
              {Object.entries(streams || {}).map(([streamID, { record, state }]) => {
                const bookmarkData = state?.bookmarks?.[streamID] || {};

                return (
                  <AccordionPanel
                    noBorderRadius
                    noPaddingContent
                    title={(
                      <Text default monospace>
                        {streamID}
                      </Text>
                    )}
                    titleXPadding={PADDING_UNITS * UNIT}
                    titleYPadding={PADDING_UNITS * UNIT}
                  >
                    <SetupSectionRow {...SHARED_ROW_PROPS} title="Last pipeline run started at">
                      <Text default monospace>
                        {pipelineRun?.started_at && datetimeInLocalTimezone(
                          pipelineRun?.started_at,
                          displayLocalTimezone,
                        )}
                      </Text>
                    </SetupSectionRow>

                    <Divider light />

                    <SetupSectionRow {...SHARED_ROW_PROPS} title="Last pipeline run completed at">
                      <Text default monospace>
                        {pipelineRun?.completed_at && datetimeInLocalTimezone(
                          pipelineRun?.completed_at,
                          displayLocalTimezone,
                        )}
                      </Text>
                    </SetupSectionRow>

                    <Divider light />

                    <Divider light />

                    <SetupSectionRow {...SHARED_ROW_PROPS} title="Trigger">
                      <NextLink
                        as={`/pipelines/${pipeline?.uuid}/triggers/${pipelineSchedule?.id}`}
                        href={'/pipelines/[pipeline]/triggers/[...slug]'}
                        passHref
                      >
                        <Link block default openNewWindow>
                          <Text default monospace>
                            {pipelineSchedule?.name}
                          </Text>
                        </Link>
                      </NextLink>
                    </SetupSectionRow>

                    <Divider light />

                    <SetupSectionRow {...SHARED_ROW_PROPS} title="Type">
                      <Text default monospace>
                        {capitalize(SCHEDULE_TYPE_TO_LABEL[pipelineSchedule?.schedule_type]?.() || '')}
                      </Text>
                    </SetupSectionRow>

                    <Divider light />

                    <SetupSectionRow {...SHARED_ROW_PROPS} title="Frequency">
                      <Text default monospace>
                        {pipelineSchedule?.schedule_interval}
                      </Text>
                    </SetupSectionRow>

                    <Divider light />

                    <Spacing p={PADDING_UNITS}>
                      <Text bold large>
                        Bookmark values
                      </Text>

                      <Spacing mt={1}>
                        <Text muted small>
                          Overriding the bookmark values will be applied to all pipeline runs
                          <br />
                          for this trigger until there is at least 1 successful pipeline run
                          in this trigger.
                        </Text>
                      </Spacing>
                    </Spacing>

                    <Divider light short />

                    {!Object.values(bookmarkData || {})?.length && (
                      <Spacing p={PADDING_UNITS}>
                        <Text muted>
                          There are currently no bookmark values for this stream.
                        </Text>
                      </Spacing>
                    )}

                    {Object.entries(bookmarkData || {}).map(([column, v]) => (
                      <SetupSectionRow
                        {...SHARED_ROW_PROPS}
                        title={(
                          <Text default monospace>
                            {column}
                          </Text>
                        )}
                        key={`${blockUUID}-bookmark-values-${column}`}
                        textInput={{
                          monospace: true,
                          onChange: e => setBookmarkValuesMapping(prev => ({
                            ...prev,
                            [blockUUID]: {
                              ...bookmarkValuesMapping?.[blockUUID],
                              [streamID]: {
                                ...bookmarkValuesMapping?.[blockUUID]?.[streamID],
                                [column]: e.target.value,
                              },
                            },
                          })),
                          value: bookmarkValuesMapping?.[blockUUID]?.[streamID]?.[column] || '',
                        }}
                      />
                    ))}

                    <Divider light />

                    <SetupSectionRow
                      {...SHARED_ROW_PROPS}
                      title="Record"
                      description="The most recently synced record."
                      key={`block-uuid-${blockUUID}-${streamID}`}
                    >
                      <Table
                        columnFlex={[1, null]}
                        columns={[
                          {
                            uuid: 'Column',
                          },
                          {
                            uuid: 'Value',
                          },
                        ]}
                        rows={Object.entries(record || {})?.map(([k, v]) => [
                          <Text default key={k} monospace>
                            {k}
                          </Text>,
                          <Text default key={`${k}-${v}`} monospace>
                            {v}
                          </Text>,
                        ])}
                      />
                    </SetupSectionRow>
                  </AccordionPanel>
                );
              })}
            </Accordion>
          </SetupSection>
        );
      })}
    </Spacing>
  );
}

export default BookmarkValues;
