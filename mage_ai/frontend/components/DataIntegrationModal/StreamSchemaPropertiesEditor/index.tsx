import { useEffect, useMemo } from 'react';

import Chip from '@oracle/components/Chip';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import StreamSettingsEditorTable from '../StreamSettingsEditorTable';
import StreamTableSelector from '../StreamTableSelector';
import Text from '@oracle/elements/Text';
import {
  AttributeUUIDEnum,
  AttributesMappingType,
  StreamMapping,
  getParentStreamID,
  getStreamID,
} from '@utils/models/block';
import { BackgroundStyle } from '../index.style';
import { COLUMN_TYPES, ReplicationMethodEnum } from '@interfaces/IntegrationSourceType';
import { DESTINATIONS_NO_UNIQUE_OR_KEY_SUPPORT } from '@interfaces/IntegrationSourceType';
import { InputTypeEnum } from '../constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { StreamDetailProps } from '../StreamDetail/constants';
import { capitalizeRemoveUnderscoreLower, pluralize } from '@utils/string';
import { ignoreKeys } from '@utils/hash';
import { rangeSequential, sortByKey } from '@utils/array';

type StreamSchemaPropertiesEditorProps = {
  attributesMapping: AttributesMappingType;
  selectedStreamMapping: StreamMapping;
  setAttributesMapping: (prev: (v: AttributesMappingType) => AttributesMappingType) => void;
  setSelectedStreamMapping: (prev: StreamMapping) => StreamMapping | StreamMapping;
};

function StreamSchemaPropertiesEditor({
  attributesMapping,
  block,
  highlightedColumnsMapping,
  selectedStreamMapping,
  setAttributesMapping,
  setHighlightedColumnsMapping,
  setSelectedStreamMapping,
  stream,
  streamMapping,
  updateStreamsInCatalog,
}: StreamSchemaPropertiesEditorProps & StreamDetailProps) {
  const blockDestinationType = block?.metadata?.data_integration?.destination;
  const supportsUniqueAndKeyProperties = useMemo(() =>
    !DESTINATIONS_NO_UNIQUE_OR_KEY_SUPPORT.includes(blockDestinationType),
    [blockDestinationType],
  );

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

  const usingIncrementalReplication = useMemo(() =>
    stream?.replication_method === ReplicationMethodEnum.INCREMENTAL,
    [stream?.replication_method],
  );
  const tableMemo = useMemo(() => {
    const streamSettingAttributes = [
      {
        label: () => 'Include property when syncing',
        inputType: InputTypeEnum.CHECKBOX,
        uuid: AttributeUUIDEnum.PROPERTY_SELECTED,
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

    if (usingIncrementalReplication) {
      streamSettingAttributes.splice(1, 0,
        {
          label: () => 'Bookmark property',
          inputType: InputTypeEnum.CHECKBOX,
          uuid: AttributeUUIDEnum.BOOKMARK_PROPERTIES,
        },
      );
    }

    if (supportsUniqueAndKeyProperties) {
      streamSettingAttributes.splice(1, 0,
        {
          label: () => 'Unique constraint',
          inputType: InputTypeEnum.CHECKBOX,
          uuid: AttributeUUIDEnum.UNIQUE_CONSTRAINTS,
        },
        {
          label: () => 'Key property',
          inputType: InputTypeEnum.CHECKBOX,
          uuid: AttributeUUIDEnum.KEY_PROPERTIES,
        },
      );
    }

    let optionsRowGroupingIndexCount = 2;
    if (usingIncrementalReplication) {
      optionsRowGroupingIndexCount += 1;
    }
    if (supportsUniqueAndKeyProperties) {
      optionsRowGroupingIndexCount += 2;
    }
    const optionsRowGroupingIndexes = rangeSequential(optionsRowGroupingIndexCount);

    return (
      <StreamSettingsEditorTable
        attributes={streamSettingAttributes}
        attributesMapping={attributesMapping}
        rowGroupHeaders={[
          'Options',
          'Column types',
        ]}
        rowsGroupedByIndex={[
          optionsRowGroupingIndexes,
          COLUMN_TYPES?.map((_, idx: number) => idx + optionsRowGroupingIndexCount),
        ]}
        setAttributesMapping={setAttributesMapping}
      />
    );
  }, [
    attributesMapping,
    setAttributesMapping,
    supportsUniqueAndKeyProperties,
    usingIncrementalReplication,
  ]);

  const streamsTableMemo = useMemo(() => (
    <StreamTableSelector
      selectedStreamMapping={selectedStreamMapping}
      setSelectedStreamMapping={setSelectedStreamMapping}
      streamMapping={streamMapping}
    />
  ), [
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
