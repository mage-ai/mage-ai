import NextLink from 'next/link';

import BlockType from '@interfaces/BlockType';
import Checkbox from '@oracle/elements/Checkbox';
import GlobalDataProductType from '@interfaces/GlobalDataProductType';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type OutdatedStartingAtFieldProps = {
  blocks?: BlockType[];
  objectAttributes: GlobalDataProductType;
  originalAttributes?: GlobalDataProductType;
  setObjectAttributes: (func: (prev: GlobalDataProductType) => GlobalDataProductType) => void;
};

function OutdatedStartingAtField({
  blocks,
  objectAttributes,
  originalAttributes,
  setObjectAttributes,
}: OutdatedStartingAtFieldProps) {
  return (
    <>
      <Spacing mb={1} px={PADDING_UNITS}>
        <Text bold>
          Block data to output
        </Text>
        <Text muted small>
          The data output from the block(s) you select below will be the data product
          that is returned when a downstream entity is requesting data from this
          global data product.
        </Text>

        <div style={{ marginTop: 4 }}>
          <Text muted small>
            When requesting data from this global data product,
            the selected block(s) will return data from its most recent partition.
            You can override this by adding a value in the partitions setting. For example,
            if you set the partitions value to 5, then the selected block will return data
            from its 5 most recent partitions. If you set the partitions value to 0, then
            all the partitions will be returned.
          </Text>
        </div>
      </Spacing>

      <Table
        columnFlex={[null, 1, null]}
        columns={[
          {
            label: () => '',
            uuid: 'selected',
          },
          {
            uuid: 'Block UUID',
          },
          {
            uuid: 'Partitions',
          },
        ]}
        // @ts-ignore
        rows={blocks?.map(({
          uuid,
        }) => {
          const settings = objectAttributes?.settings;
          const blockSettings = settings?.[uuid];
          const value = blockSettings?.partitions;

          const blockSettingsOriginal = originalAttributes?.settings?.[uuid];
          const valueOriginal = blockSettingsOriginal?.partitions;

          const selected = !!blockSettings || !!blockSettingsOriginal;

          const setSelected = (value: boolean) => {
            setObjectAttributes(prev => {
              const settingsPrev = prev?.settings || {};

              if (value) {
                settingsPrev[uuid] = {};
              } else {
                delete settingsPrev?.[uuid];
              }

              return {
                ...prev,
                settings: settingsPrev,
              };
            });
          };

          return [
            <Checkbox
              checked={selected}
              key={`selected--${uuid}`}
              onClick={() => setSelected(!selected)}
            />,
            <div key={`block-uuid-${uuid}`}>
              <NextLink
                as={`/pipelines/${objectAttributes?.object_uuid}/edit?block_uuid=${uuid}`}
                href={'/pipelines/[pipeline]/edit'}
                passHref
              >
                <Link
                  monospace
                  openNewWindow
                  sameColorAsText
                >
                  {uuid}
                </Link>
              </NextLink> {valueOriginal && (
                <Text inline monospace muted>
                  (default: {valueOriginal})
                </Text>
              )}
            </div>,
            <TextInput
              compact
              key={`input-${uuid}`}
              monospace
              // @ts-ignore
              onChange={e => setObjectAttributes(prev => ({
                ...prev,
                settings: {
                  ...prev?.settings,
                  [uuid]: {
                    ...prev?.settings?.[uuid],
                    partitions: e.target.value?.length === 0 ? null : Number(e.target.value),
                  },
                },
              }))}
              placeholder="1"
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

export default OutdatedStartingAtField;
