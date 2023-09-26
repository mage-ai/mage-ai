import { useCallback, useMemo, useState } from 'react';

import Checkbox from '@oracle/elements/Checkbox';
import Chip from '@oracle/components/Chip';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import {
  AttributeType,
  AttributeUUIDEnum,
  InputTypeEnum,
} from './constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { StreamDetailProps } from './StreamDetail/constants';
import { ignoreKeys } from '@utils/hash';
import { pluralize } from '@utils/string';
import { remove, sortByKey } from '@utils/array';

function StreamSchemaPropertiesEditor({
  block,
  blocksMapping,
  highlightedColumnsMapping,
  setBlockAttributes,
  setHighlightedColumnsMapping,
  stream,
  streamMapping,
  updateStreamsInCatalog,
}: StreamDetailProps) {
  const [attributesMapping, setAttributesMapping] =
    useState<{
      [attribute: string]: {
        selected: boolean;
        value?: boolean | number | string;
      };
    }>({});

  const columns = useMemo(() => {
    const arr = Object.entries(highlightedColumnsMapping || {})?.reduce((acc, [
      column,
      highlighted,
    ]) => {
      if (highlighted) {
        return acc.concat(column);
      }

      return acc;
    }, []);

    return sortByKey(arr, i => i);
  }, [
    highlightedColumnsMapping,
  ]);

  const attributesToRender: AttributeType = [
    {
      label: () => 'Unique constraints',
      inputType: InputTypeEnum.CHECKBOX,
      uuid: AttributeUUIDEnum.UNIQUE_CONSTRAINTS,
    },
    {
      label: () => 'Bookmark properties',
      inputType: InputTypeEnum.CHECKBOX,
      uuid: AttributeUUIDEnum.BOOKMARK_PROPERTIES,
    },
    {
      label: () => 'Key properties',
      inputType: InputTypeEnum.CHECKBOX,
      uuid: AttributeUUIDEnum.KEY_PROPERTIES,
    },
    {
      label: () => 'Partition keys',
      inputType: InputTypeEnum.CHECKBOX,
      uuid: AttributeUUIDEnum.PARTITION_KEYS,
    },
  ];

  const renderRow = useCallback((attribute: AttributeType) => {
    const {
      inputType,
      label,
      uuid,
    } = attribute;
    const data = attributesMapping?.[uuid];
    const isSelected = !!data?.selected;
    const value = data?.value;

    let inputEl;

    if (InputTypeEnum.CHECKBOX === inputType) {
      inputEl = (
        <Checkbox
          checked={!!value}
          disabled={!isSelected}
          onClick={() => setAttributesMapping(prev => ({
            ...prev,
            [uuid]: {
              ...prev?.[uuid],
              value: !value,
            },
          }))}
        />
      );
    }

    return [
      <Checkbox
        checked={isSelected}
        key={`${uuid}-checkbox`}
        onClick={() => setAttributesMapping(prev => ({
          ...prev,
          [uuid]: {
            ...prev?.[uuid],
            selected: !isSelected,
          },
        }))}
      />,
      <Text
        key={`${uuid}-name`}
        muted={!isSelected}
      >
        {label()}
      </Text>,
      <FlexContainer
        alignItems="center"
        justifyContent="center"
        key={`${uuid}-value`}
      >
        {inputEl}
      </FlexContainer>,
    ];
  }, [
    attributesMapping,
    setAttributesMapping,
  ]);

  const tableMemo = useMemo(() => (
    <Table
      columnFlex={[null, 1, null]}
      columns={[
        {
          label: () => '',
          uuid: 'action',
        },
        {
          uuid: 'Attribute',
        },
        {
          uuid: 'Value',
        },
      ]}
      rows={attributesToRender.map(renderRow)}
    />
  ), [
    attributesToRender,
    renderRow,
  ]);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <Spacing mb={PADDING_UNITS}>
          <Text bold large>
            {pluralize('column', columns?.length || 0)} to apply changes on
          </Text>
        </Spacing>

        <FlexContainer
          alignItems="center"
          flexWrap="wrap"
        >
          {columns?.map((column: string) => (
            <div
              key={`${column}-chip`}
              style={{
                marginBottom: UNIT / 2,
                marginRight: UNIT / 2,
              }}
            >
              <Chip
                label={column}
                onClick={() => {
                  setHighlightedColumnsMapping((prev) => {
                    const exists = !!prev?.[column];

                    if (exists) {
                      return ignoreKeys(prev, [column]);
                    }

                    return {
                      ...prev,
                      [column]: true,
                    };
                  });
                }}
              />
            </div>
          ))}
        </FlexContainer>
      </Spacing>

      {tableMemo}
    </>
  );
}

export default StreamSchemaPropertiesEditor;
