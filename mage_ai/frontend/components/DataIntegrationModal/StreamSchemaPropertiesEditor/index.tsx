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
import { COLUMN_TYPES } from '@interfaces/IntegrationSourceType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { StreamDetailProps } from './StreamDetail/constants';
import { capitalizeRemoveUnderscoreLower, pluralize } from '@utils/string';
import { ignoreKeys } from '@utils/hash';
import { pauseEvent } from '@utils/events';
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
        value?: boolean | number | string | {
          [columnType]: string;
        };
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
      label: () => 'Unique constraint',
      inputType: InputTypeEnum.CHECKBOX,
      uuid: AttributeUUIDEnum.UNIQUE_CONSTRAINTS,
    },
    {
      label: () => 'Bookmark property',
      inputType: InputTypeEnum.CHECKBOX,
      uuid: AttributeUUIDEnum.BOOKMARK_PROPERTIES,
    },
    {
      label: () => 'Key property',
      inputType: InputTypeEnum.CHECKBOX,
      uuid: AttributeUUIDEnum.KEY_PROPERTIES,
    },
    {
      label: () => 'Partition key',
      inputType: InputTypeEnum.CHECKBOX,
      uuid: AttributeUUIDEnum.PARTITION_KEYS,
    },
    ...COLUMN_TYPES.map((columnType: string) => ({
      label: () => capitalizeRemoveUnderscoreLower(columnType),
      inputType: InputTypeEnum.CHECKBOX,
      uuid: columnType,
    })),
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
          onClick={(e) => {
            pauseEvent(e);
            setAttributesMapping(prev => ({
              ...prev,
              [uuid]: {
                ...prev?.[uuid],
                value: !value,
              },
            }));
          }}
        />
      );
    }

    return [
      <Checkbox
        checked={isSelected}
        key={`${uuid}-checkbox`}
        onClick={(e) => {
          pauseEvent(e);
          setAttributesMapping(prev => ({
            ...prev,
            [uuid]: {
              ...prev?.[uuid],
              selected: !isSelected,
            },
          }));
        }}
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

  const tableMemo = useMemo(() => {
    return (
      <Table
        alignTop
        columnFlex={[null, 1, null]}
        columns={[
          {
            uuid: 'Use',
          },
          {
            uuid: 'Attribute',
          },
          {
            uuid: 'Value',
          },
        ]}
        groupsInline
        onClickRow={(rowIndex: number) => {
          const attribute = attributesToRender?.[rowIndex];
          const uuid = attribute?.uuid;
          const data = attributesMapping?.[uuid];
          const isSelected = !!data?.selected;

          setAttributesMapping(prev => ({
            ...prev,
            [uuid]: {
              ...prev?.[uuid],
              selected: !isSelected,
            },
          }));
        }}
        rowGroupHeaders={[
          'Options',
          'Column types',
        ]}
        rowsGroupedByIndex={[
          [0, 1, 2, 3],
          attributesToRender?.map((_, idx: number) => idx + 4),
        ]}
        rows={attributesToRender.map(renderRow)}
      />
    );
  }, [
    attributesMapping,
    attributesToRender,
    renderRow,
  ]);

  return (
    <>
      <Spacing p={PADDING_UNITS}>
        <div>
          <Text bold large>
            {pluralize('property', columns?.length || 0)} to apply changes on
          </Text>

          <Spacing mt={1}>
            <Text default>
              {!columns?.length && 'Click 1 or more rows in the table to select which schema properties to apply bulk changes to.'}
              {columns?.length >= 1 && 'The properties chosen below can have bulk changes applied to it.'}
            </Text>
          </Spacing>
        </div>

        {columns?.length >= 1 && (
          <Spacing mt={PADDING_UNITS}>
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
        )}
      </Spacing>

      {tableMemo}
    </>
  );
}

export default StreamSchemaPropertiesEditor;
