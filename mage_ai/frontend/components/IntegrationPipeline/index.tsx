import { parse, stringify } from 'yaml';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import BlockType, {
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import Checkbox from '@oracle/elements/Checkbox';
import Chip from '@oracle/components/Chip';
import CodeEditor from '@components/CodeEditor';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import IntegrationSourceType, {
  COLUMN_TYPES,
  COLUMN_TYPE_CUSTOM_DATE_TIME,
  CatalogType,
  ColumnFormatEnum,
  ColumnTypeEnum,
  InclusionEnum,
  IntegrationSourceStreamType,
  PropertyMetadataType,
  ReplicationMethodEnum,
  SchemaPropertyType,
  StreamType,
  UniqueConflictMethodEnum,
} from '@interfaces/IntegrationSourceType';
import PipelineType from '@interfaces/PipelineType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { ChevronDown, ChevronUp } from '@oracle/icons';
import {
  CodeEditorStyle,
  SectionStyle,
} from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { find, indexBy, remove } from '@utils/array';
import { getStreamAndStreamsFromCatalog } from './utils';
import { parseErrorFromResponse, onSuccess } from '@api/utils/response';
import { pluralize } from '@utils/string';

type IntegrationPipelineProps = {
  addNewBlockAtIndex: (
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name?: string,
  ) => Promise<any>;
  blocks: BlockType[];
  codeBlocks?: any;
  fetchPipeline: () => void;
  onChangeCodeBlock: (uuid: string, value: string) => void;
  pipeline: PipelineType;
  savePipelineContent: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
  setErrors: (opts: {
    errors: any;
    response: any;
  }) => void;
  setSelectedBlock: (block: BlockType) => void;
};

function IntegrationPipeline({
  addNewBlockAtIndex,
  blocks,
  codeBlocks,
  fetchPipeline,
  onChangeCodeBlock,
  pipeline,
  savePipelineContent,
  setErrors,
  setSelectedBlock,
}: IntegrationPipelineProps) {
  const [destinationVisible, setDestinationVisible] = useState(true);
  const [sourceVisible, setSourceVisible] = useState(true);

  const { data: dataIntegrationSources } = api.integration_sources.list();
  const integrationSources: IntegrationSourceType[] =
    useMemo(() => dataIntegrationSources?.integration_sources || [], [
      dataIntegrationSources,
    ]);
  const integrationSourcesByUUID =
    useMemo(() => indexBy(integrationSources, ({ uuid }) => uuid), [integrationSources]);

  const { data: dataIntegrationDestinations } = api.integration_destinations.list();
  const integrationDestinations: IntegrationSourceType[] =
    useMemo(() => dataIntegrationDestinations?.integration_destinations || [], [
      dataIntegrationDestinations,
    ]);
  const integrationDestinationsByUUID =
    useMemo(() => indexBy(integrationDestinations, ({ uuid }) => uuid), [integrationDestinations]);

  const dataLoaderBlock: BlockType =
    useMemo(() => find(blocks, ({ type }) => BlockTypeEnum.DATA_LOADER === type), [blocks]);
  const dataLoaderBlockContent = useMemo(() => {
    if (!dataLoaderBlock) {
      return {}
    }

    return parse(dataLoaderBlock.content);
  }, [dataLoaderBlock]);

  const dataExporterBlock: BlockType =
    useMemo(() => find(blocks, ({ type }) => BlockTypeEnum.DATA_EXPORTER === type), [blocks]);
  const dataExporterBlockContent = useMemo(() => {
    if (!dataExporterBlock) {
      return {}
    }

    return parse(dataExporterBlock.content);
  }, [dataExporterBlock]);

  const dataLoaderEditor = useMemo(() => {
    if (!dataLoaderBlock) {
      return;
    }

    return (
      <CodeEditorStyle>
        <CodeEditor
          autoHeight
          language={BlockLanguageEnum.YAML}
          onChange={(val: string) => {
            onChangeCodeBlock(dataLoaderBlock.uuid, stringify({
              ...dataLoaderBlockContent,
              config: parse(val),
            }));
          }}
          tabSize={2}
          value={stringify(dataLoaderBlockContent?.config || undefined)}
          width="100%"
        />
      </CodeEditorStyle>
    );
  }, [
    dataLoaderBlock,
    dataLoaderBlockContent,
  ]);

  const dataExporterEditor = useMemo(() => {
    if (!dataExporterBlock) {
      return;
    }

    return (
      <CodeEditorStyle>
        <CodeEditor
          autoHeight
          language={BlockLanguageEnum.YAML}
          onChange={(val: string) => {
            onChangeCodeBlock(dataExporterBlock.uuid, stringify({
              ...dataExporterBlockContent,
              config: parse(val),
            }));
          }}
          tabSize={2}
          value={stringify(dataExporterBlockContent?.config || undefined)}
          width="100%"
        />
      </CodeEditorStyle>
    );
  }, [
    dataExporterBlock,
    dataExporterBlockContent,
  ]);

  const catalog: CatalogType = useMemo(() => dataLoaderBlockContent?.catalog, [
    dataLoaderBlockContent,
  ]);

  const [selectedStreamID, setSelectedStreamID] =
    useState<string>(catalog?.streams?.[0]?.tap_stream_id);

  const [
    fetchIntegrationSource,
    {
      isLoading: isLoadingFetchIntegrationSource,
    },
  ] = useMutation(
    api.integration_sources.useUpdate(pipeline?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            integration_source: integrationSource,
          }) => {
            const {
              selected_streams: selectedStreamIDs,
              streams: streamsInit,
            } = integrationSource;
            const streams = streamsInit.filter(({
              tap_stream_id: streamID,
            }) => selectedStreamIDs.includes(streamID));
            const catalogData = {
              streams,
            };

            streams.forEach((stream: StreamType) => {
              stream.metadata.forEach((md, idx: number) => {
                const {
                  metadata,
                } = md;
                if (InclusionEnum.UNSUPPORTED !== metadata.inclusion) {
                  if (!stream.replication_method) {
                    stream.replication_method = ReplicationMethodEnum.FULL_TABLE;
                  }
                  if (!stream.unique_conflict_method) {
                    stream.unique_conflict_method = UniqueConflictMethodEnum.UPDATE;
                  }

                  stream.metadata[idx] = {
                    ...md,
                    metadata: {
                      ...metadata,
                      selected: true,
                    },
                  };
                }
              });
            });

            onChangeCodeBlock(dataLoaderBlock.uuid, stringify({
              ...dataLoaderBlockContent,
              catalog: catalogData,
            }));

            savePipelineContent().then(() => fetchPipeline());
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [integrationSourceStream, setIntegrationSourceStream] =
    useState<IntegrationSourceStreamType>(null);
  const [
    fetchIntegrationSourceStream,
    {
      isLoading: isLoadingFetchIntegrationSourceStream,
    },
  ] = useMutation(
    api.integration_source_streams.useUpdate(pipeline?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (response) => {
            setIntegrationSourceStream(response.integration_source_stream);
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const updateStream = useCallback((
    streamUUID: string,
    streamDataTransformer: (stream: StreamType) => StreamType,
  ) => {
    const {
      stream,
      streams,
    } = getStreamAndStreamsFromCatalog(catalog, streamUUID);

    onChangeCodeBlock(dataLoaderBlock.uuid, stringify({
      ...dataLoaderBlockContent,
      catalog: {
        ...catalog,
        streams: streams.concat(streamDataTransformer(stream)),
      },
    }));

    savePipelineContent().then(() => fetchPipeline());
  }, [
    catalog,
    dataLoaderBlock,
    dataLoaderBlockContent,
    fetchPipeline,
    onChangeCodeBlock,
    savePipelineContent,
  ]);

  const updateSchemaProperty = useCallback((
    streamUUID: string,
    columnName: string,
    data: SchemaPropertyType,
  ) => {
    updateStream(streamUUID, (stream: StreamType) => {
      stream.schema.properties[columnName] = data;

      return stream;
    });
  }, [
    updateStream,
  ]);

  const updateMetadataForColumn = useCallback((
    streamUUID: string,
    columnName: string,
    data: PropertyMetadataType,
  ) => {
    updateStream(streamUUID, (stream: StreamType) => {
      const {
        metadata: streamMetadata,
      } = stream;
      const index = streamMetadata.findIndex(({
        breadcrumb = [],
      }) => breadcrumb.length === 2 && breadcrumb[0] === 'properties' && breadcrumb[1] === columnName);

      if (index >= 0) {
        const metadataForColumn = streamMetadata[index].metadata;
        stream.metadata[index].metadata = {
          ...metadataForColumn,
          ...data,
        };
      }

      return stream;
    });
  }, [
    updateStream,
  ]);

  return (
    <>
      <Spacing mb={1}>
        <FlexContainer alignItems="center">
          <Button
            iconOnly
            onClick={() => setSourceVisible(prev => !prev)}
          >
            <>
              {sourceVisible && <ChevronUp size={1.5 * UNIT} />}
              {!sourceVisible && <ChevronDown size={1.5 * UNIT} />}
            </>
          </Button>

          <Spacing mr={1} />

          <FlexContainer alignItems="center">
            <Headline>
              Source
            </Headline>
            {!sourceVisible && (
              <Headline default inline>
                &nbsp;{integrationSourcesByUUID[dataLoaderBlockContent?.source]?.name}
              </Headline>
            )}
          </FlexContainer>
        </FlexContainer>
      </Spacing>

      {sourceVisible && (
        <SectionStyle>
          <Spacing mb={5}>
            <Headline condensed level={4} spacingBelow>
              Select source
            </Headline>

            <Select
              onChange={(e) => {
                const sourceUUID = e.target.value;
                if (!sourceUUID) {
                  return;
                }

                const config = integrationSourcesByUUID[sourceUUID]?.templates?.config;
                if (config) {
                  Object.keys(config).forEach((key: string) => {
                    config[key] = config[key] || null;
                  });
                }

                if (dataLoaderBlock) {
                  onChangeCodeBlock(dataLoaderBlock.uuid, stringify({
                    ...dataLoaderBlockContent,
                    catalog: {},
                    config,
                    source: sourceUUID,
                  }));
                } else {
                  addNewBlockAtIndex({
                    content: stringify({
                      source: sourceUUID,
                      config,
                    }),
                    language: BlockLanguageEnum.YAML,
                    type: BlockTypeEnum.DATA_LOADER,
                  }, 0, setSelectedBlock);
                }

                setIntegrationSourceStream(null);
                setSelectedStreamID(null);

                savePipelineContent().then(() => {
                  fetchPipeline();
                });
              }}
              primary
              value={dataLoaderBlockContent?.source}
            >
              <option value="" />
              {integrationSources.map(({ name, uuid }) => (
                <option
                  key={uuid}
                  value={uuid}
                >
                  {name}
                </option>
              ))}
            </Select>
          </Spacing>

          {dataLoaderBlock && (
            <>
              <Spacing mb={5}>
                <Headline condensed level={4} spacingBelow>
                  Configuration
                </Headline>

                {dataLoaderEditor}
              </Spacing>

              <Spacing mb={5}>
                <Headline condensed level={4} spacingBelow>
                  Select stream
                </Headline>

                {integrationSourceStream?.streams?.length && (
                  <Spacing mb={2}>
                    <Select
                      onChange={(e) => {
                        const uuid = e.target.value;
                        setSelectedStreamID(uuid);
                        if (uuid) {
                          // @ts-ignore
                          fetchIntegrationSource({
                            integration_source: {
                              streams: [
                                uuid,
                              ],
                            },
                          });
                        } else {
                          onChangeCodeBlock(dataLoaderBlock.uuid, stringify({
                            ...dataLoaderBlockContent,
                            catalog: {},
                          }));
                          savePipelineContent().then(() => fetchPipeline());
                        }
                      }}
                      primary
                      value={selectedStreamID || ''}
                    >
                      <option value="" />
                      {integrationSourceStream?.streams?.map(({
                        tap_stream_id: uuid,
                      }) => (
                        <option
                          key={uuid}
                          value={uuid}
                        >
                          {uuid}
                        </option>
                      ))}
                    </Select>
                  </Spacing>
                )}

                <Button
                  loading={isLoadingFetchIntegrationSourceStream}
                  onClick={() => {
                    savePipelineContent().then(() => {
                      fetchIntegrationSourceStream();
                      fetchPipeline();
                    });
                  }}
                  primary
                  small
                >
                  Fetch list of streams
                </Button>
              </Spacing>
            </>
          )}

          {isLoadingFetchIntegrationSource && <Spinner />}

          {!isLoadingFetchIntegrationSource && catalog?.streams?.map(({
            bookmark_properties: bookmarkProperties,
            metadata,
            replication_method: replicationMethod,
            schema: {
              properties,
            },
            tap_stream_id: streamUUID,
            unique_constraints: uniqueConstraints,
            unique_conflict_method: uniqueConflictMethod,
          }: StreamType) => {
            const metadataByColumn = indexBy(metadata, ({ breadcrumb }) => breadcrumb.join('/'));

            const metadataForStream =
              find(metadata, ({ breadcrumb }) => breadcrumb.length === 0)?.metadata
            const validKeyProperties = metadataForStream['table-key-properties'] || [];
            const validReplicationKeys = metadataForStream['valid-replication-keys'] || [];

            return (
              <div key={streamUUID}>
                <Headline condensed level={4} spacingBelow>
                  Schema for {streamUUID}
                </Headline>

                <Table
                  alignTop
                  columnFlex={[null, 2, 1, null, null]}
                  columns={[
                    {
                      uuid: 'Selected',
                    },
                    {
                      uuid: 'Name',
                    },
                    {
                      uuid: 'Type',
                    },
                    {
                      uuid: 'Unique',
                    },
                    {
                      uuid: 'Bookmark',
                    },
                  ]}
                  rows={Object.entries(properties).map(([
                    columnName, {
                      anyOf: columnTypesAnyOf = [],
                      format: columnFormat,
                      type: columnTypesInit = [],
                    },
                  ]) => {
                    const columnTypesSet = new Set(Array.isArray(columnTypesInit)
                      ? columnTypesInit
                      : [columnTypesInit]
                    );
                    columnTypesAnyOf.forEach(({
                      items,
                      type,
                    }) => {
                      if (Array.isArray(type)) {
                        type.forEach(t => columnTypesSet.add(t));
                      } else {
                        columnTypesSet.add(type);
                      }
                    });
                    const columnTypes = Array.from(columnTypesSet);

                    const {
                      metadata: {
                        inclusion,
                        selected,
                      },
                    } = metadataByColumn[`properties/${columnName}`] || {};

                    const columnTypeOptions = COLUMN_TYPES.reduce((acc, colType: ColumnTypeEnum) => {
                      if (columnTypes.indexOf(colType) >= 0 || (
                        COLUMN_TYPE_CUSTOM_DATE_TIME === String(colType)
                          && ColumnFormatEnum.DATE_TIME === columnFormat
                      )) {
                        return acc;
                      }

                      return acc.concat(
                        <option key={colType} value={colType}>
                          {colType}
                        </option>
                      );
                    }, []);
                    const indexOfFirstStringType =
                      columnTypes.findIndex((colType: ColumnTypeEnum) => colType === ColumnTypeEnum.STRING);

                    return [
                      <Checkbox
                        checked={selected}
                        disabled={InclusionEnum.AUTOMATIC === inclusion}
                        key={`${streamUUID}/${columnName}/selected`}
                        onClick={InclusionEnum.AUTOMATIC === inclusion
                          ? null
                          : () => {
                            updateMetadataForColumn(streamUUID, columnName, {
                              selected: !selected,
                            });
                          }
                        }
                      />,
                      <Text
                        key={`${streamUUID}/${columnName}/name`}
                      >
                        {columnName}
                      </Text>,
                      <FlexContainer
                        key={`${streamUUID}/${columnName}/type`}
                      >
                        <Flex flex={1}>
                          <FlexContainer
                            alignItems="center"
                            flexWrap="wrap"
                            fullWidth
                          >
                            {columnTypes.map((columnType: ColumnTypeEnum, idx: number) => (
                              <Spacing
                                key={`${streamUUID}/${columnName}/${columnType}/${idx}/chip`}
                                mb={1}
                                mr={1}
                              >
                                <Chip
                                  border
                                  label={ColumnFormatEnum.DATE_TIME === columnFormat &&
                                      ColumnTypeEnum.STRING === columnType &&
                                      indexOfFirstStringType === idx
                                    ? COLUMN_TYPE_CUSTOM_DATE_TIME
                                    : columnType
                                  }
                                  onClick={() => {
                                    const data: SchemaPropertyType = {
                                      format: columnFormat,
                                      type: columnTypes.filter((colType: ColumnTypeEnum) =>
                                        colType !== columnType),
                                    };

                                    if (ColumnFormatEnum.DATE_TIME === columnFormat &&
                                      ColumnTypeEnum.STRING === columnType
                                    ) {
                                      data.format = null;
                                    }

                                    updateSchemaProperty(streamUUID, columnName, data);
                                  }}
                                  small
                                />
                              </Spacing>
                            ))}
                          </FlexContainer>
                        </Flex>

                        {columnTypeOptions.length >= 1 && (
                          <Select
                            compact
                            onChange={(e) => {
                              const columnType = e.target.value;
                              const data: SchemaPropertyType = {
                                format: columnFormat,
                                type: columnTypes,
                              };

                              if (COLUMN_TYPE_CUSTOM_DATE_TIME === String(columnType)) {
                                data.format = ColumnFormatEnum.DATE_TIME;
                                data.type.push(ColumnTypeEnum.STRING);
                              } else {
                                data.type.push(columnType);
                              }

                              updateSchemaProperty(streamUUID, columnName, data);
                            }}
                            primary
                            small
                            value=""
                            width={10 * UNIT}
                          >
                            <option value="" />
                            {columnTypeOptions}
                          </Select>
                        )}
                      </FlexContainer>,
                      <Checkbox
                        checked={!!uniqueConstraints?.includes(columnName)}
                        disabled={validKeyProperties.length >= 1 && !validKeyProperties.includes(columnName)}
                        key={`${streamUUID}/${columnName}/unique`}
                        onClick={() => updateStream(streamUUID, (stream: StreamType) => {
                          if (stream.unique_constraints?.includes(columnName)) {
                            stream.unique_constraints =
                              remove(stream.unique_constraints, col => columnName === col);
                          } else {
                            stream.unique_constraints =
                              [columnName].concat(stream.unique_constraints || []);
                          }

                          return stream;
                        })}
                      />,
                      <Checkbox
                        checked={!!bookmarkProperties?.includes(columnName)}
                        disabled={validReplicationKeys.length >= 1 && !validReplicationKeys.includes(columnName)}
                        key={`${streamUUID}/${columnName}/bookmark`}
                        onClick={() => updateStream(streamUUID, (stream: StreamType) => {
                          if (stream.bookmark_properties?.includes(columnName)) {
                            stream.bookmark_properties =
                              remove(stream.bookmark_properties, col => columnName === col);
                          } else {
                            stream.bookmark_properties =
                              [columnName].concat(stream.bookmark_properties || []);
                          }

                          return stream;
                        })}
                      />,
                    ];
                  })}
                />

                <Spacing mt={5}>
                  <Headline condensed level={4} spacingBelow>
                    Settings
                  </Headline>

                  <Spacing mb={3}>
                    <Spacing mb={1}>
                      <Text bold large>
                        Replication method
                      </Text>
                      <Text default>
                        Do you want to synchronize the entire stream (<Text bold inline monospace>
                          {ReplicationMethodEnum.FULL_TABLE}
                        </Text>)
                        on each integration pipeline run or
                        only new records (<Text bold inline monospace>
                          {ReplicationMethodEnum.INCREMENTAL}
                        </Text>)?
                      </Text>
                    </Spacing>

                    <Select
                      onChange={(e) => {
                        updateStream(streamUUID, (stream: StreamType) => ({
                          ...stream,
                          replication_method: e.target.value,
                        }))
                      }}
                      primary
                      value={replicationMethod}
                    >
                      <option value="" />
                      <option value={ReplicationMethodEnum.FULL_TABLE}>
                        {ReplicationMethodEnum.FULL_TABLE}
                      </option>
                      <option value={ReplicationMethodEnum.INCREMENTAL}>
                        {ReplicationMethodEnum.INCREMENTAL}
                      </option>
                    </Select>
                  </Spacing>

                  {ReplicationMethodEnum.INCREMENTAL === replicationMethod && (
                    <Spacing mb={3}>
                      <Spacing mb={1}>
                        <Text bold large>
                          Bookmark properties
                        </Text>
                        <Text default>
                          After each integration pipeline run,
                          the last record that was successfully synchronized
                          will be used as the bookmark.
                          The properties listed below will be extracted from the last record and used
                          as the bookmark.

                          <br />

                          On the next run, the synchronization will start after the bookmarked record.
                        </Text>
                      </Spacing>

                      <FlexContainer alignItems="center" flexWrap="wrap">
                        {!bookmarkProperties?.length && (
                          <Text italic>
                            Click the checkbox under the column <Text bold inline italic>
                              Bookmark
                            </Text> to
                            use a specific column as a bookmark property.
                          </Text>
                        )}
                        {bookmarkProperties?.map((columnName: string) => (
                          <Spacing
                            key={`bookmark_properties/${columnName}`}
                            mb={1}
                            mr={1}
                          >
                            <Chip
                              label={columnName}
                              onClick={() => {
                                updateStream(streamUUID, (stream: StreamType) => ({
                                  ...stream,
                                  bookmark_properties: remove(
                                    stream.bookmark_properties || [],
                                    (col: string) => col === columnName,
                                  ),
                                }));
                              }}
                              primary
                            />
                          </Spacing>
                        ))}
                      </FlexContainer>
                    </Spacing>
                  )}

                  <Spacing mb={3}>
                    <Spacing mb={1}>
                      <Text bold large>
                        Unique constraints
                      </Text>
                      <Text default>
                        Multiple records (e.g. 2 or more) with the same values
                        in the columns listed below will be considered duplicates.
                      </Text>
                    </Spacing>

                    <FlexContainer alignItems="center" flexWrap="wrap">
                      {!uniqueConstraints?.length && (
                          <Text italic>
                            Click the checkbox under the column <Text bold inline italic>
                              Unique
                            </Text> to
                            use a specific column as a unique constraint.
                          </Text>
                        )}
                      {uniqueConstraints?.map((columnName: string) => (
                        <Spacing
                          key={`unique_constraints/${columnName}`}
                          mb={1}
                          mr={1}
                        >
                          <Chip
                            label={columnName}
                            onClick={() => {
                              updateStream(streamUUID, (stream: StreamType) => ({
                                ...stream,
                                unique_constraints: remove(
                                  stream.unique_constraints || [],
                                  (col: string) => col === columnName,
                                ),
                              }));
                            }}
                            primary
                          />
                        </Spacing>
                      ))}
                    </FlexContainer>
                  </Spacing>

                  <Spacing mb={3}>
                    <Spacing mb={1}>
                      <Text bold large>
                        Unique conflict method
                      </Text>
                      <Text default>
                        If a new record has the same value as an existing record
                        in the {pluralize('column', uniqueConstraints?.length)} {uniqueConstraints?.map((col: string, idx: number) => (
                          <Text
                            bold
                            inline
                            key={col}
                            monospace
                          >
                            {idx >= 1 && <>,&nbsp;</>}
                            {col}
                          </Text>
                        ))}, how do you want to resolve the conflict?

                        <br />

                        The conflict method <Text bold inline monospace>
                          {UniqueConflictMethodEnum.IGNORE}
                        </Text> will save the new record regardless of duplication.
                        The conflict method <Text bold inline monospace>
                          {UniqueConflictMethodEnum.UPDATE}
                        </Text> will not save the new record and instead update the existing record
                        with the new record’s properties.
                      </Text>
                    </Spacing>

                    <Select
                      onChange={(e) => {
                        updateStream(streamUUID, (stream: StreamType) => ({
                          ...stream,
                          unique_conflict_method: e.target.value,
                        }))
                      }}
                      primary
                      value={uniqueConflictMethod}
                    >
                      <option value="" />
                      <option value={UniqueConflictMethodEnum.IGNORE}>
                        {UniqueConflictMethodEnum.IGNORE}
                      </option>
                      <option value={UniqueConflictMethodEnum.UPDATE}>
                        {UniqueConflictMethodEnum.UPDATE}
                      </option>
                    </Select>
                  </Spacing>
                </Spacing>
              </div>
            );
          })}

          {codeBlocks}
        </SectionStyle>
      )}

      <Spacing mb={5} />

      <Spacing mb={1}>
        <FlexContainer alignItems="center">
          <Button
            disabled={!dataLoaderBlock}
            iconOnly
            onClick={() => setDestinationVisible(prev => !prev)}
          >
            <>
              {destinationVisible && dataLoaderBlock && (
                <ChevronUp
                  size={1.5 * UNIT}
                />
              )}
              {(!destinationVisible || !dataLoaderBlock) && (
                <ChevronDown
                  disabled={!dataLoaderBlock}
                  size={1.5 * UNIT}
                />
              )}
            </>
          </Button>

          <Spacing mr={1} />

          <FlexContainer alignItems="center">
            <Headline>
              Destination
            </Headline>
            {!destinationVisible && (
              <Headline default inline>
                &nbsp;{integrationDestinationsByUUID[dataExporterBlockContent?.destination]?.name}
              </Headline>
            )}
          </FlexContainer>
        </FlexContainer>
      </Spacing>

      {destinationVisible && dataLoaderBlock && (
        <SectionStyle>
          <Spacing mb={5}>
            <Headline condensed level={4} spacingBelow>
              Select destination
            </Headline>

            <Select
              onChange={(e) => {
                const destinationUUID = e.target.value;
                if (!destinationUUID) {
                  return;
                }

                if (dataExporterBlock) {
                  onChangeCodeBlock(dataExporterBlock.uuid, stringify({
                    ...dataExporterBlockContent,
                    destination: destinationUUID,
                  }));
                } else {
                  const config = integrationDestinationsByUUID[destinationUUID]?.templates?.config;
                  if (config) {
                    Object.keys(config).forEach((key: string) => {
                      config[key] = config[key] || null;
                    });
                  }

                  addNewBlockAtIndex({
                    content: stringify({
                      destination: destinationUUID,
                      config,
                    }),
                    language: BlockLanguageEnum.YAML,
                    type: BlockTypeEnum.DATA_EXPORTER,
                    upstream_blocks: [
                      dataLoaderBlock.uuid,
                    ],
                  }, 1, setSelectedBlock);
                }

                savePipelineContent().then(() => {
                  fetchPipeline();
                });
              }}
              primary
              value={dataExporterBlockContent?.destination}
            >
              <option value="" />
              {integrationDestinations.map(({ name, uuid }) => (
                <option
                  key={uuid}
                  value={uuid}
                >
                  {name}
                </option>
              ))}
            </Select>
          </Spacing>

          {dataExporterBlock && (
            <Spacing mb={5}>
              <Headline condensed level={4} spacingBelow>
                Configuration
              </Headline>

              {dataExporterEditor}
            </Spacing>
          )}
        </SectionStyle>
      )}
    </>
  );
}

export default IntegrationPipeline
