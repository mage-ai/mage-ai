import { parse, stringify } from 'yaml';
import { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import AddNewBlocks from '@components/PipelineDetail/AddNewBlocks';
import Button from '@oracle/elements/Button';
import BlockType, {
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import CopyToClipboard from '@oracle/components/CopyToClipboard';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import IntegrationSourceType, {
  CatalogType,
  InclusionEnum,
  IntegrationSourceStreamType,
  PropertyMetadataType,
  ReplicationMethodEnum,
  SchemaPropertyType,
  StreamType,
  UniqueConflictMethodEnum,
} from '@interfaces/IntegrationSourceType';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import SchemaSettings from './SchemaSettings';
import Select from '@oracle/elements/Inputs/Select';
import SelectStreams from './SelectStreams';
import SourceConfig from './SourceConfig';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import api from '@api';
import { ChevronDown, ChevronUp } from '@oracle/icons';
import { SectionStyle, TableContainerStyle } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import { cleanName } from '@utils/string';
import { find, indexBy } from '@utils/array';
import { getStreamAndStreamsFromCatalog } from './utils';
import { getUpstreamBlockUuids } from '@components/CodeBlock/utils';
import { onSuccess } from '@api/utils/response';
import { useModal } from '@context/Modal';

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
  globalVariables: PipelineVariableType[];
  onChangeCodeBlock: (uuid: string, value: string) => void;
  openSidekickView: (newView: ViewKeyEnum, pushHistory?: boolean) => void;
  pipeline: PipelineType;
  savePipelineContent: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
  setErrors: (opts: {
    errors: any;
    response: any;
  }) => void;
  setOutputBlocks: (func: (prevOutputBlocks: BlockType[]) => BlockType[]) => void;
  setSampleDataVariable: (variable: string) => void;
  setSelectedBlock: (block: BlockType) => void;
  setSelectedOutputBlock: (block: BlockType) => void;
};

function IntegrationPipeline({
  addNewBlockAtIndex,
  blocks,
  codeBlocks,
  fetchPipeline,
  globalVariables,
  onChangeCodeBlock,
  openSidekickView,
  pipeline,
  savePipelineContent,
  setErrors,
  setOutputBlocks,
  setSampleDataVariable,
  setSelectedBlock,
  setSelectedOutputBlock,
}: IntegrationPipelineProps) {
  const [destinationVisible, setDestinationVisible] = useState(true);
  const [sourceVisible, setSourceVisible] = useState(true);
  const [transformerVisible, setTransformerVisible] = useState(true);

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
      return {};
    }

    return parse(dataLoaderBlock.content);
  }, [dataLoaderBlock]);
  const dataLoaderEditor = useMemo(() => (
    <SourceConfig
      api="integration_sources"
      block={dataLoaderBlock}
      blockContent={dataLoaderBlockContent}
      onChangeCodeBlock={onChangeCodeBlock}
      pipeline={pipeline}
    />
  ), [
    dataLoaderBlock,
    dataLoaderBlockContent,
  ]);

  const dataExporterBlock: BlockType =
    useMemo(() => find(blocks, ({ type }) => BlockTypeEnum.DATA_EXPORTER === type), [blocks]);
  const dataExporterBlockContent = useMemo(() => {
    if (!dataExporterBlock) {
      return {};
    }

    return parse(dataExporterBlock.content);
  }, [dataExporterBlock]);
  const dataExporterEditor = useMemo(() => (
    <SourceConfig
      api="integration_destinations"
      block={dataExporterBlock}
      blockContent={dataExporterBlockContent}
      onChangeCodeBlock={onChangeCodeBlock}
      pipeline={pipeline}
    />
  ), [
    dataExporterBlock,
    dataExporterBlockContent,
  ]);

  const catalog: CatalogType = useMemo(() => dataLoaderBlockContent?.catalog, [
    dataLoaderBlockContent,
  ]);
  const autoAddNewFields = (catalog?.streams || []).every(({ auto_add_new_fields }) => auto_add_new_fields);

  const [selectedStreamID, setSelectedStreamID] =
    useState<string>(catalog?.streams?.[0]?.tap_stream_id);

  const updateSampleDataVariable = useCallback(
    () => setSampleDataVariable(selectedStreamID),
    [selectedStreamID],
  );

  const [sourceSampleDataError, setSourceSampleDataError] = useState<string>();
  const [loadSampleData] = useMutation(
    api.integration_sources.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response,
        {
          callback: (res) => {
            if (res['success']) {
              setSelectedOutputBlock(dataLoaderBlock);
              updateSampleDataVariable();
              openSidekickView(ViewKeyEnum.DATA);
              setOutputBlocks(() => {
                setSelectedOutputBlock(dataLoaderBlock);
                return [dataLoaderBlock];
              });
            } else {
              setSourceSampleDataError(res['error']);
            }
          },
          onErrorCallBack: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          }
        }
      )
    }
  );

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
                  if (!stream.destination_table) {
                    stream.destination_table = cleanName(stream.tap_stream_id);
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

            savePipelineContent().then(() => {
              fetchPipeline();
              // @ts-ignore
              loadSampleData({
                action: 'sample_data',
                pipeline_uuid: pipeline?.uuid,
              });
            });
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
  const updateAllStreams = useCallback((
    streamDataTransformer: (stream: StreamType) => StreamType,
  ) => {
    onChangeCodeBlock(dataLoaderBlock.uuid, stringify({
      ...dataLoaderBlockContent,
      catalog: {
        ...catalog,
        streams: catalog.streams.map(stream => streamDataTransformer(stream)),
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

  const [updateDestinationBlock] = useMutation(
    api.blocks.pipelines.useUpdate(pipeline?.uuid, dataExporterBlock?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipeline?.();
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      ),
    },
  );

  console.log('destination name:', dataExporterBlockContent?.destination);

  const variablesTableMemo = useMemo(() => {
    const variableRows = [];
    globalVariables?.forEach(({
      variables,
    }) => variables?.forEach(({
      uuid,
      value,
    }) => {
      const variableCode = `"{{ variables('${uuid}') }}"`;
      if (!uuid.startsWith('output')) {
        return variableRows.push([
          <Text key={`variable-uuid-${uuid}`} monospace>
            {uuid}
          </Text>,
          <Text key={`variable-uuid-${uuid}-{value}`} monospace>
            {value}
          </Text>,
          <Text key={`variable-uuid-${uuid}-{value}-code`} monospace>
            {variableCode}
          </Text>,
          <CopyToClipboard
            copiedText={variableCode}
            key={`variable-uuid-${uuid}-{value}-code-copy`}
            monospace
            withCopyIcon
          />,
        ]);
      }
    }));

    return (
      <Table
        alignTop
        columnFlex={[null, null, 1]}
        columns={[
          {
            uuid: 'Key',
          },
          {
            uuid: 'Value',
          },
          {
            uuid: 'Code',
          },
        ]}
        rows={variableRows}
      />
    );
  }, [globalVariables]);

  const buildVariablesTable = useCallback((href: string) => (
    <Spacing mt={2}>
      <Text default>
        Use the following variables to interpolate sensitive or dynamic information
        into the configuration.
        <br />
        You can also access values from your environment variables by using the following syntax: <Text inline monospace>
          {`"{{ env_var('MY_ENV_VARIABLE_NAME') }}"`}
        </Text>
        <br />
        For more information, check out the <Link
          href={href}
          openNewWindow
        >
          documentation
        </Link>.
      </Text>

      <Spacing mt={1}>
        {variablesTableMemo}
      </Spacing>
    </Spacing>
  ), [variablesTableMemo]);

  const streams = useMemo(() => integrationSourceStream?.streams || [], [
    integrationSourceStream,
  ]);
  const [showModal, hideModal] = useModal(() => (
    <SelectStreams
      catalog={catalog}
      isLoading={isLoadingFetchIntegrationSource}
      onActionCallback={(selectedStreams: {
        [key: string]: boolean;
      }) => {
        const ids =
          Object.entries(selectedStreams).reduce((acc, [k, v]) => v ? acc.concat(k) : acc, []);

        if (ids.length > 0) {
          // @ts-ignore
          fetchIntegrationSource({
            integration_source: {
              streams: ids,
            },
          });
          hideModal();
        } else {
          onChangeCodeBlock(dataLoaderBlock.uuid, stringify({
            ...dataLoaderBlockContent,
            catalog: {},
          }));
          savePipelineContent().then(() => fetchPipeline());
          hideModal();
        }
      }}
      streams={streams}
    />
  ), {
  }, [
    catalog,
    dataLoaderBlock,
    dataLoaderBlockContent,
    fetchPipeline,
    isLoadingFetchIntegrationSource,
    onChangeCodeBlock,
    savePipelineContent,
    streams,
  ], {
    background: true,
    uuid: 'select_streams',
  });

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
        <Spacing mb={5}>
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

                  {dataLoaderBlockContent?.source && (
                    <Spacing mb={2}>
                      <Text default>
                        For more information on how to configure this source,
                        read the <Link
                          href={`https://github.com/mage-ai/mage-ai/blob/master/mage_integrations/mage_integrations/sources/${dataLoaderBlockContent.source}/README.md`}
                          openNewWindow
                        >
                          {dataLoaderBlockContent.source} documentation
                        </Link>
                      </Text>

                      {buildVariablesTable('https://github.com/mage-ai/mage-ai/blob/master/docs/guides/pipelines/DataIntegrationPipeline.md#configure-source')}
                    </Spacing>
                  )}

                  {dataLoaderEditor}
                </Spacing>

                <div>
                  <Headline condensed level={4} spacingBelow>
                    Select stream
                  </Headline>

                  <Button
                    loading={isLoadingFetchIntegrationSourceStream}
                    onClick={() => {
                      savePipelineContent().then(() => {
                        fetchIntegrationSourceStream().then(() => showModal());
                        fetchPipeline();
                      });
                    }}
                    primary
                    small
                  >
                    View and select streams
                  </Button>
                </div>
              </>
            )}
          </SectionStyle>

          {isLoadingFetchIntegrationSource && (
            <Spacing p={2}>
              <Spinner />
            </Spacing>
          )}

          {!isLoadingFetchIntegrationSource && (
            <Spacing mt={3}>
              <SchemaSettings
                catalog={catalog}
                destination={dataExporterBlockContent?.destination}
                updateMetadataForColumn={updateMetadataForColumn}
                updateSchemaProperty={updateSchemaProperty}
                updateStream={updateStream}
              />
            </Spacing>
          )}
        </Spacing>
      )}

      <Spacing mb={1}>
        <FlexContainer alignItems="center">
          <Button
            disabled={!dataLoaderBlock}
            iconOnly
            onClick={() => setTransformerVisible(prev => !prev)}
          >
            <>
              {transformerVisible && dataLoaderBlock && (
                <ChevronUp
                  size={1.5 * UNIT}
                />
              )}
              {(!transformerVisible || !dataLoaderBlock) && (
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
              Transformers
            </Headline>
          </FlexContainer>
        </FlexContainer>
      </Spacing>

      {transformerVisible && dataLoaderBlock && (
        <Spacing mb={5}>
          <SectionStyle>
            {codeBlocks.length > 0 && (
              <Spacing mb={1}>
                {codeBlocks.map((codeBlock, idx) => (
                  <Spacing key={idx} mb={1}>
                    {codeBlock}
                  </Spacing>
                ))}
              </Spacing>
            )}
            <Spacing mt={1}>
              <AddNewBlocks
                addNewBlock={(newBlock: BlockRequestPayloadType) => {
                  const content = newBlock.content;
                  const configuration = newBlock.configuration;

                  const currentBlock = blocks[blocks.length - 2];

                  let upstreamBlocks = [dataLoaderBlock.uuid];
                  if (currentBlock) {
                    upstreamBlocks = getUpstreamBlockUuids(currentBlock, newBlock);
                  }

                  const ret = addNewBlockAtIndex({
                    ...newBlock,
                    configuration,
                    content,
                    upstream_blocks: upstreamBlocks,
                  },
                  blocks.length - 1,
                  block => {
                    if (dataExporterBlock) {
                      // @ts-ignore
                      updateDestinationBlock({
                        block: {
                          ...dataExporterBlock,
                          upstream_blocks: [block.uuid],
                        },
                      });
                      setSelectedBlock(block);
                    }
                  });

                  return ret;
                }}
                // blockIdx={blockIdx}
                compact
                hideDataExporter
                hideDataLoader
                hideDbt
                hideRecommendations
                hideScratchpad
                hideSensor
                hideTransformerDataSources
                pipeline={pipeline}
              />
            </Spacing>
          </SectionStyle>
        </Spacing>
      )}

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
                      blocks[blocks.length - 1].uuid,
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

              {dataExporterBlockContent?.destination && (
                <>
                  <Spacing mb={2}>
                    <Text default>
                      For more information on how to configure this destination,
                      read the <Link
                        href={`https://github.com/mage-ai/mage-ai/blob/master/mage_integrations/mage_integrations/destinations/${dataExporterBlockContent.destination}/README.md`}
                        openNewWindow
                      >
                        {dataExporterBlockContent.destination} documentation
                      </Link>.

                      <br />
                      <br />

                      If your configuration contains a key named <Text inline monospace>
                        table
                      </Text>, it’s optional.
                      <br />
                      The table that’s created in this destination will have
                      a name corresponding to the stream’s unique name (by default) or the value you
                      entered under the input field labeled <Text bold inline>
                        Table name
                      </Text> in a previous section.
                    </Text>

                    {buildVariablesTable('https://github.com/mage-ai/mage-ai/blob/master/docs/guides/pipelines/DataIntegrationPipeline.md#configure-destination')}
                  </Spacing>

                  <Spacing mb={3}>
                    <FlexContainer alignItems="center" justifyContent="space-between">
                      <Spacing mb={1}>
                        <Text bold large>
                          Automatically add new fields
                        </Text>
                        <Text default>
                          Turn the toggle on if you want new table columns in each data source stream
                          to be automatically added and synced with the data destination.
                        </Text>
                      </Spacing>

                      <ToggleSwitch
                        checked={!!autoAddNewFields}
                        onCheck={() => updateAllStreams((stream: StreamType) => ({
                          ...stream,
                          auto_add_new_fields: !autoAddNewFields,
                        }))}
                      />
                    </FlexContainer>
                  </Spacing>
                </>
              )}

              {dataExporterEditor}
            </Spacing>
          )}
        </SectionStyle>
      )}
    </>
  );
}

export default IntegrationPipeline;
