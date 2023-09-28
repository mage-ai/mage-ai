import { useEffect, useMemo } from 'react';

import Chip from '@oracle/components/Chip';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import StreamSettingsEditorTable from '../StreamSettingsEditorTable';
import StreamTableSelector from '../StreamTableSelector';
import Text from '@oracle/elements/Text';
import { BackgroundStyle } from '../index.style';
import { InputTypeEnum } from '../constants';
import { StreamDetailProps } from '../StreamDetail/constants';
import { COLUMN_TYPES } from '@interfaces/IntegrationSourceType';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import {
  AttributeUUIDEnum,
  AttributesMappingType,
  StreamMapping,
  getParentStreamID,
  getStreamID,
} from '@utils/models/block';
import { capitalizeRemoveUnderscoreLower, pluralize } from '@utils/string';
import { ignoreKeys } from '@utils/hash';
import { sortByKey } from '@utils/array';

type StreamSchemaPropertiesEditorProps = {
  attributesMapping: AttributesMappingType;
  selectedStreamMapping: StreamMapping;
  setAttributesMapping: (prev: (v: AttributesMappingType) => AttributesMappingType) => void;
  setSelectedStreamMapping: (prev: StreamMapping) => StreamMapping | StreamMapping;
};

function StreamSchemaPropertiesEditor({
  attributesMapping,
  highlightedColumnsMapping,
  selectedStreamMapping,
  setAttributesMapping,
  setHighlightedColumnsMapping,
  setSelectedStreamMapping,
  stream,
  streamMapping,
  updateStreamsInCatalog,
}: StreamSchemaPropertiesEditorProps & StreamDetailProps) {
  useEffect(() => {
    if (stream && !selectedStreamMapping) {
      const id = getStreamID(stream || {});
      const idParent = getParentStreamID(stream || {});

      if (idParent) {
        setSelectedStreamMapping({
          noParents: {},
          parents: {
            [idParent]: {
              [id]: stream,
            },
          },
        });
      } else if (id) {
        setSelectedStreamMapping({
          noParents: {
            [id]: stream,
          },
          parents: {},
        });
      }
    }
  }, [
    selectedStreamMapping,
    setSelectedStreamMapping,
    stream,
  ]);

  const tableMemo = useMemo(() => (
    <StreamSettingsEditorTable
      attributes={[
        {
          label: () => 'Include property when syncing',
          inputType: InputTypeEnum.CHECKBOX,
          uuid: AttributeUUIDEnum.PROPERTY_SELECTED,
        },
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
      ]}
      attributesMapping={attributesMapping}
      rowGroupHeaders={[
        'Options',
        'Column types',
      ]}
      rowsGroupedByIndex={[
        [0, 1, 2, 3],
        COLUMN_TYPES?.map((_, idx: number) => idx + 4),
      ]}
      setAttributesMapping={setAttributesMapping}
    />
  ), [
    attributesMapping,
    setAttributesMapping,
  ]);

  const streamsTableMemo = useMemo(() => {
    return (
      <StreamTableSelector
        selectedStreamMapping={selectedStreamMapping}
        setSelectedStreamMapping={setSelectedStreamMapping}
        streamMapping={streamMapping}
      />
    );
  }, [
    selectedStreamMapping,
    setSelectedStreamMapping,
    streamMapping,
  ]);

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

  return (
    <BackgroundStyle>
      <Spacing p={PADDING_UNITS}>
        <div>
          <Headline>
            {!columns?.length && 'Choose at least 1 property'}
            {columns?.length >= 1 && `${pluralize('property', columns?.length || 0)} chosen`}
          </Headline>

          <Spacing mt={1}>
            <Text default>
              {!columns?.length && 'Click 1 or more rows in the table to select which schema properties to apply bulk changes to.'}
              {columns?.length >= 1 && (
                <>
                  Clicking the Apply button below will use the values from the selected
                  properties below and change the values of those properties in all the selected
                  columns for all the selected streams.
                </>
              )}
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

      {streamsTableMemo}
    </BackgroundStyle>
  );
}

export default StreamSchemaPropertiesEditor;
