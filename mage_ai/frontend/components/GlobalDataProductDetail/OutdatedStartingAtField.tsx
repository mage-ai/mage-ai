import GlobalDataProductType from '@interfaces/GlobalDataProductType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { range } from '@utils/array';

type OutdatedStartingAtFieldProps = {
  objectAttributes: GlobalDataProductType;
  originalAttributes?: GlobalDataProductType;
  setObjectAttributes: (func: (prev: GlobalDataProductType) => GlobalDataProductType) => void;
};

function OutdatedStartingAtField({
  objectAttributes,
  originalAttributes,
  setObjectAttributes,
}: OutdatedStartingAtFieldProps) {
  return (
    <>
      <Spacing mb={1} px={PADDING_UNITS}>
        <Text bold>
          Outdated starting at <Text inline muted>
            (optional)
          </Text>
        </Text>
        <Text muted small>
          If enough time has passed since the last global data product has ran successfully and
          the global data product is determined to be outdated, then you can configure it to be
          outdated at a specific date or time.
        </Text>

        <div style={{ marginTop: 4 }}>
          <Text muted small>
            For example, let’s say the global data product is outdated after 12 hours.
            The last successful run was yesterday at 18:00. The global data product will be
            outdated today at 06:00. However, if the <Text bold inline muted small>
              Outdated starting at
            </Text> has a value of 17
            for <Text bold inline muted small>
              Hour of day
            </Text>, then the global data product won’t run again until today at 17:00.
          </Text>
        </div>
      </Spacing>

      <Table
        columnFlex={[null, 1]}
        columns={[
          {
            uuid: 'Unit',
          },
          {
            uuid: 'Value',
          },
        ]}
        rows={[
          {
            uuid: 'second_of_minute',
            values: range(60).map((_, i) => ({
              uuid: i,
              value: i,
            })),
          },
          {
            uuid: 'minute_of_hour',
            values: range(60).map((_, i) => ({
              uuid: i,
              value: i,
            })),
          },
          {
            uuid: 'hour_of_day',
            values: range(24).map((_, i) => ({
              uuid: i,
              value: i,
            })),
          },
          {
            uuid: 'day_of_week',
            values: [
              'Sunday',
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
            ].map((uuid, idx) => ({
              uuid,
              value: idx,
            })),
          },
          {
            uuid: 'day_of_month',
            values: range(31).map((_, i) => ({
              uuid: i + 1,
              value: i + 1,
            })),
          },
          {
            uuid: 'day_of_year',
            values: range(365).map((_, i) => ({
              uuid: i + 1,
              value: i + 1,
            })),
          },
          {
            uuid: 'week_of_month',
            values: range(5).map((_, i) => ({
              uuid: i + 1,
              value: i + 1,
            })),
          },
          {
            uuid: 'week_of_year',
            values: range(52).map((_, i) => ({
              uuid: i + 1,
              value: i + 1,
            })),
          },
          {
            uuid: 'month_of_year',
            values: [
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December',
            ].map((month, idx) => ({
              uuid: month,
              value: idx + 1,
            })),
          },
          // @ts-ignore
        ].map(({
          uuid,
          values,
        }: {
          uuid: string;
          values?: {
            uuid: string;
            value: number;
          };
        }) => {
          let inputEl;

          const value = objectAttributes?.outdated_starting_at?.[uuid];
          const valueOriginal = originalAttributes?.outdated_starting_at?.[uuid];

          const sharedProps = {
            compact: true,
            key: `outdated-starting-at-input-${uuid}`,
            monospace: true,
            onChange: e => setObjectAttributes(prev => ({
              ...prev,
              outdated_starting_at: {
                ...prev?.outdated_starting_at,
                [uuid]: e.target.value?.length === 0 ? null : Number(e.target.value),
              },
            })),
            primary: true,
            small: true,
            value: (typeof value === 'undefined' || value === null) ? '' : value,
          };

          if (values) {
            inputEl = (
              <Select
                {...sharedProps}
                placeholder="Select a value"
              >
                {/* @ts-ignore */}
                {values.map(({
                  uuid,
                  value,
                }) => (
                  <option key={value} value={value}>
                    {uuid}
                  </option>
                ))}
              </Select>
            );
          } else {
            inputEl = (
              <TextInput
                {...sharedProps}
                placeholder="Enter a number"
                setContentOnMount
                type="number"
              />
            );
          }

          return [
            <Text default key={`outdated-starting-at-label-${uuid}`} monospace>
              {capitalizeRemoveUnderscoreLower(uuid)} {valueOriginal && (
                <Text inline monospace muted>
                  (default: {valueOriginal})
                </Text>
              )}
            </Text>,
            inputEl,
          ];
        })}
      />
    </>
  );
}

export default OutdatedStartingAtField;
