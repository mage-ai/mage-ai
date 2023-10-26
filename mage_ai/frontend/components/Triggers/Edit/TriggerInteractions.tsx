import { useMemo } from 'react';

import BlockInteractionController from '@components/Interactions/BlockInteractionController';
import BlockType from '@interfaces/BlockType';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import InteractionType, {
  InteractionVariableType,
  InteractionVariableTypeEnum,
} from '@interfaces/InteractionType';
import PipelineInteractionType, { BlockInteractionType } from '@interfaces/PipelineInteractionType';
import PipelineScheduleType, { ScheduleTypeEnum } from '@interfaces/PipelineScheduleType';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS, UNIT, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import {
  Alphabet,
  CalendarDate,
  DocumentIcon,
  Lightning,
  NumberHash,
  NumberWithDecimalHash,
  Schedule,
  Switch,
  TodoList,
} from '@oracle/icons';
import { TimeType } from '@oracle/components/Calendar';
import { capitalizeRemoveUnderscoreLower, isJsonString } from '@utils/string';
import { getDatetimeFromDateAndTime } from '../utils';
import { indexBy } from '@utils/array';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { useWindowSize } from '@utils/sizes';

type TriggerInteractions = {
  containerRef: any;
  date?: Date;
  interactions: InteractionType[];
  pipeline: PipelineType;
  pipelineInteraction: PipelineInteractionType;
  pipelineSchedule: PipelineScheduleType;
  setVariables: (prev: any) => {
    [key: string]: any;
  };
  showSummary?: boolean;
  time?: TimeType;
  triggerTypes?: {
    label: () => string;
    uuid: ScheduleTypeEnum;
  }[];
  variables: {
    [key: string]: any;
  };
};

const INTERACTION_VARIABLE_VALUE_TYPE_ICON_MAPPING = {
  [InteractionVariableTypeEnum.DATE]: CalendarDate,
  [InteractionVariableTypeEnum.DATETIME]: Schedule,
  [InteractionVariableTypeEnum.DICTIONARY]: DocumentIcon,
  [InteractionVariableTypeEnum.FLOAT]: NumberWithDecimalHash,
  [InteractionVariableTypeEnum.INTEGER]: NumberHash,
  [InteractionVariableTypeEnum.LIST]: TodoList,
  [InteractionVariableTypeEnum.STRING]: Alphabet,
};

function TriggerInteractions({
  containerRef,
  date,
  interactions,
  pipeline,
  pipelineInteraction,
  pipelineSchedule,
  setVariables,
  showSummary,
  time,
  triggerTypes,
  variables,
}) {
  const interactionsMapping = useMemo(() => indexBy(interactions || [], ({ uuid }) => uuid), [
    interactions,
  ]);

  const blocks = useMemo(() => pipeline?.blocks || [], [pipeline]);
  const blockInteractionsMapping = useMemo(() => pipelineInteraction?.blocks || {}, [
    pipelineInteraction,
  ]);

  const interactionsMemo = useMemo(() => {
    const arr = [];

    const blocksCount = blocks?.length || 0;

    blocks?.map((block: BlockType, idx: number) => {
      const {
        uuid: blockUUID,
      } = block || {
        uuid: null,
      }

      const blockInteractions = blockInteractionsMapping?.[blockUUID] || [];
      const hasBlockInteractions = blockInteractions?.length >= 1;

      arr.push(
        <Spacing p={PADDING_UNITS}>
          {blockInteractions?.map((blockInteraction: BlockInteractionType, idx: number) => (
            <Spacing
              key={`${blockInteraction?.uuid}-${idx}`}
              mt={idx >= 1 ? PADDING_UNITS * 2 : 0}
            >
              <BlockInteractionController
                blockInteraction={blockInteraction}
                containerRef={containerRef}
                interaction={interactionsMapping?.[blockInteraction?.uuid]}
                setVariables={setVariables}
                variables={variables}
              />
            </Spacing>
          ))}
        </Spacing>
      );
    });

    return arr;
  }, [
    blocks,
    containerRef,
    interactionsMapping,
    setVariables,
    variables,
  ]);

  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const startTime = useMemo(() => (date && time?.hour && time?.minute)
    ? getDatetimeFromDateAndTime(
      date,
      time,
      {
        convertToUtc: displayLocalTimezone,
        includeSeconds: true,
        localTimezone: displayLocalTimezone,
      })
    : null
  , [
    date,
    displayLocalTimezone,
    time,
  ]);

  const variablesTableMemo = useMemo(() => {
    const arr = [];

    const blocksCount = blocks?.length || 0;

    blocks?.map((block: BlockType, idx1: number) => {
      const {
        uuid: blockUUID,
      } = block || {
        uuid: null,
      }

      const blockInteractions = blockInteractionsMapping?.[blockUUID] || [];

      blockInteractions?.forEach((blockInteraction: BlockInteractionType, idx2: number) => {
        const interaction = interactionsMapping?.[blockInteraction?.uuid];

        Object.entries(interaction?.variables || {}).forEach(([
          variableUUID,
          variable,
        ], idx3: number) => {
          const {
            name,
            required,
            types,
          }: InteractionVariableType = variable;

          const value = variables?.[variableUUID];
          const missingValue = typeof value === 'undefined'
          const invalid = required && missingValue;
          const Icon = INTERACTION_VARIABLE_VALUE_TYPE_ICON_MAPPING?.[types[0]] || Alphabet;

          const values = [];

          if (typeof value !== 'undefined')  {
            if (value && Array.isArray(value || [])) {
              value?.forEach((val) => {
                values.push((val && typeof val === 'object')
                  ? values.push(JSON.stringify(val))
                  : values.push(String(val))
                );
              });
            } else if (value && typeof value === 'object') {
              Object.entries(value || {}).forEach(([label, val]) => {
                if (val) {
                  values.push(String(label));
                }
              });
            } else {
              values.push(String(value));
            }
          } else {
            values.push(value || '');
          }

          arr.push([
            <FlexContainer
              alignItems="center"
              key={`${blockUUID}-${variableUUID}-label-${name}-${idx1}-${idx2}-${idx3}`}
            >
              <Icon default size={1.5 * UNIT} />

              <Spacing mr={1} />

              <Text default monospace>
                {variableUUID}
              </Text>
            </FlexContainer>,
            <Spacing
              key={`${blockUUID}-${variableUUID}-value-${name}-${value}-${idx1}-${idx2}-${idx3}`}
              py={PADDING_UNITS}
            >
              <Text
                danger={invalid}
                monospace={!invalid}
                muted={missingValue}
              >
                {missingValue && !invalid && '-'}
                {invalid && 'This is required'}
                {!missingValue && !invalid && values?.map(i => String(i))?.join(', ')}
              </Text>
            </Spacing>,
          ]);
        });
      });
    });

    return (
      <Table
        columnFlex={[null, 1]}
        rows={arr}
      />
    );
  }, [
    blocks,
    interactionsMapping,
    variables,
  ]);

  return (
    <>
      {!showSummary && interactionsMemo}

      {showSummary && (
        <>
          <Spacing p={PADDING_UNITS}>
            <Headline>
              Settings
            </Headline>
          </Spacing>

          <Divider light short />

          <Table
            columnFlex={[null, 1]}
            rows={[
              [
                <FlexContainer
                  alignItems="center"
                  key="trigger_type"
                >
                  <Lightning default />
                  <Spacing mr={1} />
                  <Text default>
                    Trigger type
                  </Text>
                </FlexContainer>,
                <Spacing key="trigger_type_input" py={PADDING_UNITS}>
                  <Text
                    danger={!pipelineSchedule?.schedule_type}
                    monospace
                  >
                    {pipelineSchedule?.schedule_type
                      ? triggerTypes?.find(({
                        uuid,
                      }) => uuid === pipelineSchedule?.schedule_type)?.label?.()
                      : 'This is required'
                    }
                  </Text>
                </Spacing>,
              ],
              [
                <FlexContainer
                  alignItems="center"
                  key="trigger_name"
                >
                  <Alphabet default />
                  <Spacing mr={1} />
                  <Text default>
                    Trigger name
                  </Text>
                </FlexContainer>,
                <Spacing key="trigger_name_input" py={PADDING_UNITS}>
                  <Text
                    danger={!pipelineSchedule?.name}
                    monospace
                  >
                    {pipelineSchedule?.name || 'This is required'}
                  </Text>
                </Spacing>,
              ],
              [
                <FlexContainer
                  alignItems="center"
                  key="trigger_description"
                >
                  <Alphabet default />
                  <Spacing mr={1} />
                  <Text default>
                    Trigger description
                  </Text>
                </FlexContainer>,
                <Spacing key="trigger_description_input" py={PADDING_UNITS}>
                  <Text
                    monospace
                    muted={!pipelineSchedule?.description}
                  >
                    {pipelineSchedule?.description || '-'}
                  </Text>
                </Spacing>,
              ],
              [
                <FlexContainer
                  alignItems="center"
                  key="frequency"
                >
                  <Schedule default size={1.5 * UNIT} />
                  <Spacing mr={1} />
                  <Text default>
                    Frequency
                  </Text>
                </FlexContainer>,
                <Spacing key="frequency_input" py={PADDING_UNITS}>
                  <Text
                    danger={!pipelineSchedule?.schedule_interval}
                    monospace
                    muted={!pipelineSchedule?.schedule_interval}
                  >
                    {pipelineSchedule?.schedule_interval && capitalizeRemoveUnderscoreLower(
                      pipelineSchedule?.schedule_interval?.substring(1) || '',
                    )}
                    {!pipelineSchedule?.schedule_interval && 'This is required'}
                  </Text>
                </Spacing>,
              ],
              [
                <FlexContainer
                  alignItems="center"
                  key="start_time"
                >
                  <CalendarDate default size={1.5 * UNIT} />
                  <Spacing mr={1} />
                  <Text default>
                    Start date and time
                  </Text>
                </FlexContainer>,
                <Spacing key="start_time_input" py={PADDING_UNITS}>
                  <Text
                    danger={!startTime}
                    monospace={!!startTime}
                    muted={!startTime}
                  >
                    {startTime || 'This is required'}
                  </Text>
                </Spacing>,
              ],
            ]}
          />

          <Spacing p={PADDING_UNITS}>
            <Headline>
              Customize
            </Headline>
          </Spacing>

          <Divider light short />

          {variablesTableMemo}
        </>
      )}
    </>
  );
}

export default TriggerInteractions;
