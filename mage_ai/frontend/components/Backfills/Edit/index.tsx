import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import BackfillType, {
  BACKFILL_TYPE_CODE,
  BACKFILL_TYPE_DATETIME,
  IntervalTypeEnum,
  INTERVAL_TYPES,
} from '@interfaces/BackfillType';
import Button from '@oracle/elements/Button';
import Calendar, { TimeType } from '@oracle/components/Calendar';
import ClickOutside from '@oracle/components/ClickOutside';
import Divider from '@oracle/elements/Divider';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineType from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import {
  Alphabet,
  CalendarDate,
  Schedule,
} from '@oracle/icons';
import { BACKFILL_TYPES } from './constants';
import { CardStyle } from '../../Triggers/Edit/index.style';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import {
  PADDING_UNITS,
  UNIT,
} from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';
import { getDateAndTimeObjFromDatetimeString } from '@oracle/components/Calendar/utils';
import { getDatetimeFromDateAndTime } from '@components//Triggers/utils';
import { onSuccess } from '@api/utils/response';
import { parseVariables } from '@components/Sidekick/utils';
import { selectKeys } from '@utils/hash';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

type BackfillEditProps = {
  backfill: BackfillType;
  errors: ErrorsType,
  fetchBackfill: () => void;
  pipeline: PipelineType;
  setErrors: (errors: ErrorsType) => void;
  variables?: PipelineVariableType[];
};

function BackfillEdit({
  backfill: modelProp,
  errors,
  fetchBackfill,
  pipeline,
  setErrors,
  variables,
}: BackfillEditProps) {
  const router = useRouter();
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const [model, setModel] = useState<BackfillType>();
  const {
    block_uuid: blockUUID,
    id: modelID,
    interval_type: intervalType,
    interval_units: intervalUnits,
    name,
  } = model || {};
  const {
    uuid: pipelineUUID,
  } = pipeline;

  const [runtimeVariables, setRuntimeVariables] = useState<{ [ variable: string ]: string }>({});
  const [setupType, setSetupType] = useState<string>(
    blockUUID ? BACKFILL_TYPE_CODE : BACKFILL_TYPE_DATETIME,
  );

  // Date and time
  const [showCalendarStart, setShowCalendarStart] = useState<boolean>(false);
  const [showCalendarEnd, setShowCalendarEnd] = useState<boolean>(false);
  const [dateEnd, setDateEnd] = useState<Date>(null);
  const [dateStart, setDateStart] = useState<Date>(null);
  const [timeEnd, setTimeEnd] = useState<TimeType>({ hour: '00', minute: '00' });
  const [timeStart, setTimeStart] = useState<TimeType>({ hour: '00', minute: '00' });

  useEffect(() => {
    if (modelProp) {
      setModel(modelProp);

      const startDatetime = modelProp.start_datetime;
      if (startDatetime) {
        const startDatetimeObj = getDateAndTimeObjFromDatetimeString(
          startDatetime,
          { localTimezone: displayLocalTimezone },
        );
        setDateStart(startDatetimeObj?.date);
        setTimeStart(startDatetimeObj.time);
      }

      const endDatetime = modelProp.end_datetime;
      if (endDatetime) {
        const endDatetimeObj = getDateAndTimeObjFromDatetimeString(
          endDatetime,
          { localTimezone: displayLocalTimezone },
        );
        setDateEnd(endDatetimeObj?.date);
        setTimeEnd(endDatetimeObj?.time);
      }
    }
  }, [displayLocalTimezone, modelProp]);

  const detailsMemo = useMemo(() => {
    const rows = [
      [
        <FlexContainer
          alignItems="center"
          key="model_name_detail"
        >
          <Alphabet default size={1.5 * UNIT} />
          <Spacing mr={1} />
          <Text default>
            Backfill name
          </Text>
        </FlexContainer>,
        <TextInput
          key="model_name_input_detail"
          monospace
          onChange={(e) => {
            e.preventDefault();
            setModel(s => ({
              ...s,
              name: e.target.value,
            }));
          }}
          placeholder="Name this backfill"
          value={name}
        />,
      ],
    ];

    if (BACKFILL_TYPE_DATETIME === setupType) {
      rows.push(...[
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
          <div
            key="start_time_input"
            style={{ minHeight: `${UNIT * 5.75}px` }}
          >
            {!showCalendarStart && (
              <TextInput
                monospace
                onClick={() => setShowCalendarStart(val => !val)}
                onFocus={() => setShowCalendarStart(true)}
                placeholder="YYYY-MM-DD HH:MM"
                value={dateStart
                  ? getDatetimeFromDateAndTime(
                    dateStart,
                    timeStart,
                    { localTimezone: displayLocalTimezone })
                  : ''
                }
              />
            )}
            <div style={{ width: '400px' }}>
              <ClickOutside
                disableEscape
                onClickOutside={() => setShowCalendarStart(false)}
                open={showCalendarStart}
                style={{ position: 'relative' }}
              >
                <Calendar
                  localTime={displayLocalTimezone}
                  selectedDate={dateStart}
                  selectedTime={timeStart}
                  setSelectedDate={setDateStart}
                  setSelectedTime={setTimeStart}
                  topPosition
                />
              </ClickOutside>
            </div>
          </div>,
        ],
        [
          <FlexContainer
            alignItems="center"
            key="end_time"
          >
            <CalendarDate default size={1.5 * UNIT} />
            <Spacing mr={1} />
            <Text default>
              End date and time
            </Text>
          </FlexContainer>,
          <div
            key="end_time_input"
            style={{ minHeight: `${UNIT * 5.75}px` }}
          >
            {!showCalendarEnd && (
              <TextInput
                monospace
                onClick={() => setShowCalendarEnd(val => !val)}
                onFocus={() => setShowCalendarEnd(true)}
                placeholder="YYYY-MM-DD HH:MM"
                value={dateEnd
                  ? getDatetimeFromDateAndTime(
                    dateEnd,
                    timeEnd,
                    { localTimezone: displayLocalTimezone })
                  : ''
                }
              />
            )}
            <div style={{ width: '400px' }}>
              <ClickOutside
                disableEscape
                onClickOutside={() => setShowCalendarEnd(false)}
                open={showCalendarEnd}
                style={{ position: 'relative' }}
              >
                <Calendar
                  localTime={displayLocalTimezone}
                  selectedDate={dateEnd}
                  selectedTime={timeEnd}
                  setSelectedDate={setDateEnd}
                  setSelectedTime={setTimeEnd}
                  topPosition
                />
              </ClickOutside>
            </div>
          </div>,
        ],
        [
          <FlexContainer
            alignItems="center"
            key="interval_type"
          >
            <Schedule default size={1.5 * UNIT} />
            <Spacing mr={1} />
            <Text default>
              Interval type
            </Text>
          </FlexContainer>,
          <Select
            key="interval_type_input"
            monospace
            onChange={(e) => {
              e.preventDefault();
              setModel(s => ({
                ...s,
                interval_type: e.target.value,
              }));
            }}
            placeholder="Time spacing between each backfill"
            value={intervalType}
          >
            {INTERVAL_TYPES.map(value => (
              <option key={value} value={value}>
                {capitalize(value)}
              </option>
            ))}
          </Select>,
        ],
        [
          <FlexContainer
            alignItems="center"
            key="interval_units"
          >
            <Schedule default size={1.5 * UNIT} />
            <Spacing mr={1} />
            <Text default>
              Interval units
            </Text>
          </FlexContainer>,
          <TextInput
            disabled={!intervalType}
            key="interval_unit_input"
            monospace
            onChange={(e) => {
              e.preventDefault();
              setModel(s => ({
                ...s,
                interval_units: e.target.value,
              }));
            }}
            placeholder={intervalType
              ? `Number of ${intervalType}${intervalType !== IntervalTypeEnum.CUSTOM ? 's' : ''} between each backfill`
              : 'Interval type is required'
            }
            type="number"
            value={intervalUnits}
          />,
        ],
      ]);
    }

    return (
      <>
        <Spacing mb={2} px={PADDING_UNITS}>
          <Headline>
            Settings
          </Headline>
        </Spacing>

        <Divider light short />

        <Table
          columnFlex={[null, 1]}
          rows={rows}
        />
      </>
    );
  }, [
    dateEnd,
    dateStart,
    displayLocalTimezone,
    intervalType,
    intervalUnits,
    name,
    setupType,
    showCalendarStart,
    showCalendarEnd,
    timeEnd,
    timeStart,
  ]);

  const [updateModel, { isLoading: isLoadingUpdate }] = useMutation(
    api.backfills.useUpdate(modelID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchBackfill();
            router.push(
              '/pipelines/[pipeline]/backfills/[...slug]',
              `/pipelines/${pipelineUUID}/backfills/${modelID}`,
            );
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const onSave = useCallback(() => {
    const data: BackfillType = {
      ...selectKeys(model, [
        'name',
      ]),
      end_datetime: null,
      interval_type: null,
      interval_units: null,
      start_datetime: null,
      variables: parseVariables(runtimeVariables),
    };

    if (BACKFILL_TYPE_CODE === setupType) {
      // TODO (tommy dang): support custom code from block
    } else {
      data.interval_type = intervalType;
      data.interval_units = intervalUnits;
      data.end_datetime = (dateEnd && timeEnd?.hour && timeEnd?.minute)
        ? getDatetimeFromDateAndTime(
          dateEnd,
          timeEnd,
          {
            convertToUtc: displayLocalTimezone,
            includeSeconds: true,
            localTimezone: displayLocalTimezone,
          })
        : null;
      data.start_datetime = (dateStart && timeStart?.hour && timeStart?.minute)
        ? getDatetimeFromDateAndTime(
          dateStart,
          timeStart,
          {
            convertToUtc: displayLocalTimezone,
            includeSeconds: true,
            localTimezone: displayLocalTimezone,
          })
        : null;
    }

    // @ts-ignore
    return updateModel({ backfill: data });
  }, [
    dateEnd,
    dateStart,
    displayLocalTimezone,
    intervalType,
    intervalUnits,
    model,
    runtimeVariables,
    setupType,
    timeEnd,
    timeStart,
    updateModel,
  ]);

  const saveButtonDisabled = useMemo(() => {
    if (BACKFILL_TYPE_CODE === setupType) {
      return !blockUUID;
    } else {
      return !(dateEnd && dateStart && intervalType && intervalUnits);
    }
    return false;
  }, [
    blockUUID,
    dateEnd,
    dateStart,
    intervalType,
    intervalUnits,
    setupType,
  ]);

  return (
    <PipelineDetailPage
      // after={afterMemo}
      breadcrumbs={[
        {
          label: () => 'Backfills',
          linkProps: {
            as: `/pipelines/${pipelineUUID}/backfills`,
            href: '/pipelines/[pipeline]/backfills',
          },
        },
        {
          label: () => model?.name,
          linkProps: {
            as: `/pipelines/${pipelineUUID}/backfills/${modelID}`,
            href: '/pipelines/[pipeline]/backfills/[...slug]',
          },
        },
      ]}
      errors={errors}
      pageName={PageNameEnum.BACKFILLS}
      pipeline={pipeline}
      setErrors={setErrors}
      subheader={(
        <FlexContainer alignItems="center">
          <Button
            disabled={saveButtonDisabled}
            loading={isLoadingUpdate}
            onClick={onSave}
            outline
            primary
          >
            Save changes
          </Button>

          <Spacing mr={1} />

          <Button
            linkProps={{
              href: '/pipelines/[pipeline]/backfills/[...slug]',
              as: `/pipelines/${pipelineUUID}/backfills/${modelID}`,
            }}
            noHoverUnderline
            outline
            sameColorAsText
          >
            Cancel
          </Button>
        </FlexContainer>
      )}
      title={() => `Edit ${model?.name}`}
      uuid="backfill/edit"
    >
      <Spacing p={PADDING_UNITS}>
        <Spacing mb={2}>
          <Headline>
            Backfill type
          </Headline>

          <Text muted>
            How would you like this pipeline to be backfilled?
          </Text>
        </Spacing>

        <FlexContainer>
          {BACKFILL_TYPES.map(({
            label,
            description,
            uuid,
          }) => {
            const selected = setupType === uuid;
            const othersSelected = setupType && !selected;

            return (
              <Button
                key={uuid}
                noBackground
                noBorder
                noPadding
                onClick={() => {
                  setSetupType(uuid);
                }}
              >
                <CardStyle selected={selected}>
                  <FlexContainer alignItems="center">
                    <Flex>
                      <input checked={selected} type="radio" />
                    </Flex>

                    <Spacing mr={PADDING_UNITS} />

                    <Flex
                      alignItems="flex-start"
                      flexDirection="column"
                    >
                      <Headline
                        bold
                        default={!selected && !othersSelected}
                        level={5}
                        muted={!selected && othersSelected}
                      >
                        {label()}
                      </Headline>

                      <Text
                        default={!selected && !othersSelected}
                        leftAligned
                        muted={othersSelected}
                      >
                        {description()}
                      </Text>
                    </Flex>
                  </FlexContainer>
                </CardStyle>
              </Button>
            );
          })}
        </FlexContainer>
      </Spacing>

      <Spacing mt={5}>
        {detailsMemo}
      </Spacing>
    </PipelineDetailPage>
  );
}

export default BackfillEdit;
