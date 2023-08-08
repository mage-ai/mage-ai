import GlobalDataProductType from '@interfaces/GlobalDataProductType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type OutdatedAfterFieldProps = {
  objectAttributes: GlobalDataProductType;
  originalAttributes?: GlobalDataProductType;
  setObjectAttributes: (func: (prev: GlobalDataProductType) => GlobalDataProductType) => void;
};

function OutdatedAfterField({
  objectAttributes,
  originalAttributes,
  setObjectAttributes,
}: OutdatedAfterFieldProps) {
  return (
    <>
      <Spacing mb={1} px={PADDING_UNITS}>
        <Text bold>
          Outdated after
        </Text>
        <Text muted small>
          After the global data product successfully completes running,
          how long after that will the global data product be outdated?
        </Text>
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
            uuid: 'seconds',
          },
          {
            uuid: 'weeks',
          },
          {
            uuid: 'months',
          },
          {
            uuid: 'years',
          },
        ].map(({
          uuid,
        }: {
          uuid: string;
        }) => {
          const value = objectAttributes?.outdated_after?.[uuid];
          const valueOriginal = originalAttributes?.outdated_after?.[uuid];

          return [
            <Text default key={`label-${uuid}`} monospace>
              {uuid} {valueOriginal && (
                <Text inline monospace muted>
                  (default: {valueOriginal})
                </Text>
              )}
            </Text>,
            <TextInput
              compact
              key={`input-${uuid}`}
              monospace
              // @ts-ignore
              onChange={e => setObjectAttributes(prev => ({
                ...prev,
                outdated_after: {
                  ...prev?.outdated_after,
                  [uuid]: e.target.value?.length === 0 ? null : Number(e.target.value),
                },
              }))}
              placeholder="Enter a number"
              primary
              setContentOnMount
              small
              type="number"
              value={(typeof value === 'undefined' || value === null) ? '' : value}
            />,
          ];
        })}
      />
    </>
  );
}

export default OutdatedAfterField;
