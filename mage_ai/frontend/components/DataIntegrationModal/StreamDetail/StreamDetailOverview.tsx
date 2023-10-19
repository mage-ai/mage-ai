import { useCallback, useMemo, useRef, useState } from 'react';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Chip from '@oracle/components/Chip';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import Tooltip from '@oracle/components/Tooltip';
import {
  ColumnTypeEnum,
  IntegrationSourceEnum,
  ReplicationMethodEnum,
  UniqueConflictMethodEnum,
} from '@interfaces/IntegrationSourceType';
import { SectionStyle } from './index.style';
import { StreamsOverviewProps } from '../StreamsOverview';
import { StreamType } from '@interfaces/IntegrationSourceType';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower, pluralize } from '@utils/string';
import {
  getSchemaPropertiesWithMetadata,
  getStreamID,
  getStreamIDWithParentStream,
  isStreamSelected,
  updateStreamMetadata,
} from '@utils/models/block';
import { remove, sortByKey } from '@utils/array';

type StreamDetailOverviewProps = {
  setBlockAttributes: (prev: any) => void;
  stream: StreamType;
} & StreamsOverviewProps;

function StreamDetailOverview({
  block,
  blocksMapping,
  onChangeBlock,
  setBlockAttributes,
  stream,
  streamMapping,
  updateStreamsInCatalog: updateStreamsInCatalogProp,
}: StreamDetailOverviewProps) {
  const timeout = useRef(null);

  const [destinationTablesByStreamUUID, setDestinationTablesByStreamUUID] = useState<{
    [uuid: string]: string;
  }>({});

  const {
    auto_add_new_fields: autoAddNewFields,
    bookmark_properties: bookmarkProperties,
    destination_table: destinationTableInit,
    disable_column_type_check: disableColumnTypeCheck,
    key_properties: keyProperties,
    partition_keys: partitionKeys,
    replication_method: replicationMethod,
    run_in_parallel: runInParallel,
    unique_conflict_method: uniqueConflictMethod,
    unique_constraints: uniqueConstraints,
  } = stream || {};
  const streamID = getStreamID(stream);
  const streamUUID = getStreamIDWithParentStream(stream);
  const isSelected = isStreamSelected(stream);
  const dataIntegration = block?.metadata?.data_integration;
  const dataIntegrationUUID = dataIntegration?.source || dataIntegration?.destination;

  const updateStreamsInCatalog =
    useCallback((streams: StreamType[]) => updateStreamsInCatalogProp(
      streams,
      b => onChangeBlock?.(b),
    ),
    [
      onChangeBlock,
      updateStreamsInCatalogProp,
    ]);

  const updateValue = useCallback((column: string, value: any) => {
    updateStreamsInCatalog([
      {
        ...stream,
        [column]: value,
      }
    ]);
  }, [
    stream,
    updateStreamsInCatalog,
  ]);

  const summaryTable = useMemo(() => {
    const columns = [];
    const columnsByType = {};
    const columnsSelected = []
    const schemaProperties = getSchemaPropertiesWithMetadata(stream) || {};

    Object.entries(schemaProperties || {})?.forEach(([
      column,
      {
        metadata,
        type: types,
      },
    ]) => {
      columns.push(column);
      if (!metadata || !metadata?.metadata || metadata?.metadata?.selected) {
        columnsSelected.push(column);
      }

      const types2 = types?.filter(t => t !== ColumnTypeEnum.NULL);
      if (types?.length >= 1) {
        const t = types[types?.length - 1];
        if (!columnsByType?.[t]) {
          columnsByType[t] = [];
        }
        columnsByType[t].push(column);
      }
    });

    return (
      <Table
        columnFlex={[1, 1]}
        rows={[
          [
            <Text key="columns">
              Number of columns selected
            </Text>,
            <Text key="columns-value" monospace rightAligned>
              {columnsSelected?.length} <Text inline monospace muted>/</Text> {columns?.length}
            </Text>,
          ],
          ...sortByKey(Object.entries(columnsByType), ([colType,]) => colType).map(([
            colType,
            columnsOfType,
          ]) => [
            <Text key={`columns-${colType}`}>
              {capitalizeRemoveUnderscoreLower(colType)} columns
            </Text>,
            <Text key={`columns-value-${colType}`} monospace rightAligned>
              {columnsOfType?.length}
            </Text>,
          ]),
          ...[
            ['Bookmarks', bookmarkProperties, 'bookmark_properties'],
            ['Unique constraints', uniqueConstraints, 'unique_constraints'],
            ['Key properties', keyProperties, 'key_properties'],
            ['Partition keys', partitionKeys, 'partition_keys'],
          ].map(([
            attributeName,
            arr,
            key,
          ]) => [
            <Text key={attributeName as string}>
              {attributeName}
            </Text>,
            <FlexContainer
              alignItems="center"
              flexWrap="wrap"
              justifyContent="flex-end"
              key={`${attributeName}-value`}
            >
              {!arr?.length && (
                <Text muted monospace>
                  -
                </Text>
              )}
              {sortByKey(arr || [], i => i)?.map((column: string) => (
                <div key={`${attributeName}-value-${column}`} style={{ marginLeft: UNIT / 2 }}>
                  <Chip
                    label={column}
                    onClick={() => updateValue(
                      key as string,
                      remove(arr, i => i === column),
                    )}
                    xsmall
                  />
                </div>
              ))}
            </FlexContainer>,
          ]),
        ]}
      />
    );
  }, [
    bookmarkProperties,
    keyProperties,
    partitionKeys,
    stream,
    uniqueConstraints,
    updateValue,
  ]);

  const destinationTable =
    useMemo(() => streamUUID in destinationTablesByStreamUUID
      ? destinationTablesByStreamUUID?.[streamUUID]
      : destinationTableInit
     , [
        destinationTableInit,
        destinationTablesByStreamUUID,
        streamUUID,
      ]);

  return (
    <Spacing p={PADDING_UNITS}>
      <Spacing mb={PADDING_UNITS}>
        <SectionStyle>
          <Text default uppercase>
            Output
          </Text>

          <Spacing mt={PADDING_UNITS}>
            <FlexContainer alignItems="center">
              <FlexContainer alignItems="center">
                <Text large>
                  Destination table
                </Text>

                <Spacing mr={1} />

                <Tooltip
                  label={(
                    <Text>
                      By default, this stream will be saved to your destination under the
                      table named <Text bold inline monospace>
                        {streamID}
                      </Text>. To change the table name, enter in a different value.
                    </Text>
                  )}
                  lightBackground
                />

                <Spacing mr={PADDING_UNITS} />
              </FlexContainer>

              <Flex flex={1}>
                <TextInput
                  fullWidth
                  monospace
                  onChange={(e) => {
                    const val = e?.target?.value;

                    setDestinationTablesByStreamUUID(prev => ({
                      ...prev,
                      [streamUUID]: val,
                    }));

                    clearTimeout(timeout.current);
                    timeout.current = setTimeout(() => updateValue('destination_table', val), 300);
                  }}
                  value={destinationTable || ''}
                />
              </Flex>
            </FlexContainer>
          </Spacing>
        </SectionStyle>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <SectionStyle>
          <Text default uppercase>
            Settings
          </Text>

          <Spacing mt={PADDING_UNITS}>
            <FlexContainer alignItems="center">
              <Text large>
                Replication method
              </Text>

              <Spacing mr={1} />

              <Tooltip
                label={(
                  <Text>
                    Do you want to synchronize the entire stream (<Text bold inline monospace>
                      {ReplicationMethodEnum.FULL_TABLE}
                    </Text>)
                    on each pipeline run or
                    only new records (<Text bold inline monospace>
                      {ReplicationMethodEnum.INCREMENTAL}
                    </Text>)?
                    {IntegrationSourceEnum.POSTGRESQL === dataIntegrationUUID &&
                      <Text>
                        Log-based incremental replication (<Text bold inline monospace>
                          {ReplicationMethodEnum.LOG_BASED}
                        </Text>)
                        is also available for PostgreSQL sources.
                      </Text>
                    }
                  </Text>
                )}
                lightBackground
              />

              <Spacing mr={PADDING_UNITS} />

              <Select
                defaultColor
                onChange={e => updateValue('replication_method', e.target.value)}
                placeholder="Select an option"
                value={replicationMethod}
              >
                {Object.values(ReplicationMethodEnum).map(value => (
                  <option disabled={ReplicationMethodEnum.FULL_TABLE !== value} key={value} value={value}>
                    {ReplicationMethodEnum.FULL_TABLE !== value && '[COMING SOON] '}
                    {capitalizeRemoveUnderscoreLower(value)}
                  </option>
                ))}
              </Select>
            </FlexContainer>
          </Spacing>

          <Spacing mt={PADDING_UNITS}>
            <FlexContainer alignItems="center">
              <Text large>
                Unique conflict method
              </Text>

              <Spacing mr={1} />

              <Tooltip
                label={(
                  <Text>
                    If a new record has the same value as an existing record in
                    the {pluralize('unique column', uniqueConstraints?.length)}
                    {uniqueConstraints?.length > 0 && <>&nbsp;</>}
                    {uniqueConstraints?.sort().map((col: string, idx: number) => (
                      <Text
                        bold
                        inline
                        key={col}
                        monospace
                      >
                        {uniqueConstraints?.length !== 1 && idx === uniqueConstraints?.length - 1
                          ? <Text inline key={col}> and </Text>
                          : (idx >= 1 && <>,&nbsp;</>)}
                        {col}
                      </Text>
                    ))}, how do you want to resolve the conflict?
                    The conflict method <Text bold inline monospace>
                      {UniqueConflictMethodEnum.IGNORE}
                    </Text> will skip the new record if it’s a duplicate of an existing record.
                    The conflict method <Text bold inline monospace>
                      {UniqueConflictMethodEnum.UPDATE}
                    </Text> will not save the new record and instead update the existing record
                    with the new record’s properties.
                  </Text>
                )}
                lightBackground
              />

              <Spacing mr={PADDING_UNITS} />

              <Select
                defaultColor
                onChange={e => updateValue('unique_conflict_method', e.target.value)}
                placeholder="Select an option"
                value={uniqueConflictMethod}
              >
                {Object.values(UniqueConflictMethodEnum).map(value => (
                  <option key={value} value={value}>
                    {capitalizeRemoveUnderscoreLower(value)}
                  </option>
                ))}
              </Select>
            </FlexContainer>
          </Spacing>
        </SectionStyle>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <SectionStyle>
          <Text default uppercase>
            Options
          </Text>

          <Spacing mt={PADDING_UNITS}>
            <FlexContainer alignItems="center" justifyContent="space-between">
              <Flex flexDirection="column">
                <Text bold large>
                  Run streams in parallel
                </Text>

                <Spacing mt={1}>
                  <Text default>
                    Parallel streams will be run at the same time,
                    so make sure there are no dependencies between them.
                  </Text>
                </Spacing>
              </Flex>

              <Spacing mr={PADDING_UNITS} />

              <ToggleSwitch
                checked={!!runInParallel}
                onCheck={(valFunc: (val: boolean) => boolean) => updateValue(
                  'run_in_parallel',
                  valFunc(runInParallel),
                )}
              />
            </FlexContainer>
          </Spacing>

          {BlockTypeEnum.DATA_EXPORTER === block?.type && (
            <>
              <Spacing mt={PADDING_UNITS}>
                <FlexContainer alignItems="center" justifyContent="space-between">
                  <Flex flexDirection="column">
                    <Text bold large>
                      Automatically add new fields
                    </Text>

                    <Spacing mt={1}>
                      <Text default>
                        Turn the toggle on if you want new table columns in each data source stream
                        to be automatically added and synced with the data destination.
                      </Text>
                    </Spacing>
                  </Flex>

                  <Spacing mr={PADDING_UNITS} />

                  <ToggleSwitch
                    checked={!!autoAddNewFields}
                    onCheck={(valFunc: (val: boolean) => boolean) => updateValue(
                      'auto_add_new_fields',
                      valFunc(autoAddNewFields),
                    )}
                  />
                </FlexContainer>
              </Spacing>

              <Spacing mt={PADDING_UNITS}>
                <FlexContainer alignItems="center" justifyContent="space-between">
                  <Flex flexDirection="column">
                    <Text bold large>
                      Disable column type check
                    </Text>

                    <Spacing mt={1}>
                      <Text default>
                        By default, the value for each column is validated according to the
                        schema property for that column.
                        If a value in a column doesn’t match its type,
                        an error will be raised and the process will be stopped.
                        Turn this toggle on if you want to disable this strict type checking.
                      </Text>
                    </Spacing>
                  </Flex>

                  <Spacing mr={PADDING_UNITS} />

                  <ToggleSwitch
                    checked={!!disableColumnTypeCheck}
                    onCheck={(valFunc: (val: boolean) => boolean) => updateValue(
                      'disable_column_type_check',
                      valFunc(disableColumnTypeCheck),
                    )}
                  />
                </FlexContainer>
              </Spacing>
            </>
          )}
        </SectionStyle>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <SectionStyle noPadding>
          <Spacing pt={PADDING_UNITS} px={PADDING_UNITS}>
            <Text default uppercase>
              Summary
            </Text>
          </Spacing>

          <Spacing mt={PADDING_UNITS} pb={PADDING_UNITS}>
            {summaryTable}
          </Spacing>
        </SectionStyle>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <SectionStyle>
          <Text default uppercase>
            Other
          </Text>

          <Spacing mt={PADDING_UNITS}>
            <FlexContainer alignItems="center">
              <Text large>
                Select stream
              </Text>

              <Spacing mr={1} />

              <ToggleSwitch
                checked={!!isSelected}
                onCheck={(valFunc: (val: boolean) => boolean) => updateStreamsInCatalog([
                  updateStreamMetadata(stream, {
                    selected: valFunc(isSelected),
                  }),
                ])}
              />
            </FlexContainer>
          </Spacing>

          <Spacing mt={UNITS_BETWEEN_SECTIONS}>
            <FlexContainer alignItems="center">
              <Button
                danger
                onClick={() => {
                  if (typeof window !== 'undefined'
                    && window.confirm(
                      `Are you sure you want to remove stream ${streamID} from block ${block?.uuid}?`
                    )
                  ) {
                    setBlockAttributes((prev) => {
                      const updated = {
                        ...prev,
                        catalog: {
                          ...prev?.catalog,
                          streams: remove(
                            prev?.catalog?.streams,
                            (s: StreamType) => getStreamIDWithParentStream(s) === streamUUID,
                          ),
                        },
                      };

                      onChangeBlock?.(updated);

                      return updated;
                    });
                  }
                }}
              >
                Delete stream from block
              </Button>
            </FlexContainer>
          </Spacing>
        </SectionStyle>
      </Spacing>
    </Spacing>
  );
}

export default StreamDetailOverview;
