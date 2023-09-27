import { parse, stringify } from 'yaml';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockType, { BlockTypeEnum, BlockLanguageEnum } from '@interfaces/BlockType';
import Breadcrumbs from '@components/Breadcrumbs';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Checkbox from '@oracle/elements/Checkbox';
import Circle from '@oracle/elements/Circle';
import CodeEditor from '@components/CodeEditor';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer, { JUSTIFY_SPACE_BETWEEN_PROPS } from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Markdown from '@oracle/components/Markdown';
import PipelineType from '@interfaces/PipelineType';
import RowDataTable, { RowStyle } from '@oracle/components/RowDataTable';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import StreamDetail from './StreamDetail';
import StreamGrid from './StreamGrid';
import StreamSchemaPropertiesEditor from './StreamSchemaPropertiesEditor';
import StreamsOverview from './StreamsOverview';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import { CatalogType, StreamType } from '@interfaces/IntegrationSourceType';
import {
  Check,
  Close,
  DocumentIcon,
  Lightning,
  PlugAPI,
  Search,
  Settings,
  SettingsWithKnobs,
  Sun,
  Table as TableIcon,
} from '@oracle/icons';
import { CodeEditorStyle} from '@components/IntegrationPipeline/index.style';
import {
  ConfigurationDataIntegrationInputsType,
  ConfigurationDataIntegrationType,
} from '@interfaces/ChartBlockType';
import {
  ContainerStyle,
  HeaderStyle,
  MODAL_PADDING,
  NavigationStyle,
} from './index.style';
import { DataIntegrationTypeEnum } from '@interfaces/BlockTemplateType';
import {
  MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING,
  MainNavigationTabEnum,
  SUB_TABS_BY_MAIN_NAVIGATION_TAB,
  SUB_TABS_FOR_STREAM_DETAIL,
  SubTabEnum,
} from './constants';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import {
  AttributesMappingType,
  ColumnsMappingType,
  StreamDifferencesType,
  StreamMapping,
  buildStreamMapping,
  getAllStreamsFromStreamMapping,
  getParentStreamID,
  getSelectedStreams,
  getStreamFromStreamMapping,
  getStreamID,
  getStreamIDWithParentStream,
  isStreamInMappings,
  isStreamSelected,
  mergeSchemaProperties,
  noStreamsAnywhere as noStreamsAnywhereFunc,
  updateStreamInBlock,
  updateStreamMappingWithPropertyAttributeValues,
  updateStreamMetadata,
} from '@utils/models/block';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { get, set } from '@storage/localStorage';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { equals, groupBy, indexBy, remove, sortByKey } from '@utils/array';
import { ignoreKeys, isEmptyObject } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';
import { useWindowSize } from '@utils/sizes';

type DataIntegrationModal = {
  block: BlockType;
  onChangeCodeBlock?: (type: string, uuid: string, value: string) => void;
  onClose?: () => void;
  onSaveBlock?: () => void;
  pipeline: PipelineType;
};

function DataIntegrationModal({
  block: blockProp,
  onChangeCodeBlock,
  onClose,
  pipeline,
  onSaveBlock,
}) {
  const mainContainerRef = useRef(null);
  const refAfterHeader = useRef(null);
  const refAfterFooter = useRef(null);
  const refSubheader = useRef(null);

  const {
    height: heightWindow,
    width: widthWindow,
  } = useWindowSize();

  const {
    blocks,
    uuid: pipelineUUID,
  } = pipeline || {};

  const {
    language: blockLanguage,
    type: blockType,
    uuid: blockUUID,
  } = blockProp || {};

  const dataIntegrationType = useMemo(() => BlockTypeEnum.DATA_LOADER === blockType
    ? DataIntegrationTypeEnum.SOURCES
    : DataIntegrationTypeEnum.DESTINATIONS,
  [
    blockType,
  ]);

  const blockDetailQuery: {
    data_integration_uuid?: string;
    include_block_catalog: boolean;
    include_documentation: boolean;
  } = useMemo(() => {
    const query: {
      data_integration_uuid?: string;
      include_block_catalog: boolean;
      include_block_metadata: boolean;
      include_documentation: boolean;
    } = {
      include_block_catalog: true,
      include_block_metadata: true,
      include_documentation: true,
    };

    if (dataIntegrationUUID) {
      query.data_integration_uuid = dataIntegrationUUID;
    }

    return query;
  }, [
    dataIntegrationType,
    dataIntegrationUUID,
  ]);

  const { data: dataBlock } = api.blocks.pipelines.detail(
    pipelineUUID,
    blockUUID,
    blockDetailQuery,
    {},
    {
      key: `pipelines/${pipelineUUID}/blocks/${blockUUID}/documentation`,
    }
  );

  const [blockAttributes, setBlockAttributes] = useState<BlockType>(null);
  const dataIntegrationConfiguration: ConfigurationDataIntegrationType =
    useMemo(() => blockAttributes?.configuration?.data_integration || {}, [
      blockAttributes,
    ]);

  const setDataIntegrationConfiguration = useCallback(prev1 => setBlockAttributes(prev2 => ({
    ...prev2,
    configuration: {
      ...prev2?.configuration,
      data_integration: prev1(prev2?.configuration?.data_integration || {}),
    },
  })), [
    setBlockAttributes,
  ]);

  const setDataIntegrationConfigurationForInputs = useCallback(prev => setDataIntegrationConfiguration((
    dataIntegrationConfigurationPrev: ConfigurationDataIntegrationType,
  ) => ({
    ...dataIntegrationConfigurationPrev,
    inputs: prev(dataIntegrationConfigurationPrev?.inputs || {}),
  })), [
    setDataIntegrationConfiguration,
  ]);

  const updateStreamsInCatalog =
    useCallback((streams: StreamType[]) => setBlockAttributes(prev => {
      const catalog = prev?.catalog || {};
      const streamsTemp = [...(catalog?.streams || [])];

      streams?.forEach((stream: StreamType) => {
        const id1 = getStreamID(stream);
        const parentStream1 = stream?.parent_stream;

        const indexOfStream = streamsTemp?.findIndex((stream2: StreamType) => {
          const id2 = getStreamID(stream2);
          const parentStream2 = stream2?.parent_stream;

          return id1 === id2 && parentStream1 === parentStream2;
        });

        let streamPrev = {};
        if (indexOfStream >= 0) {
          streamPrev = streamsTemp?.[indexOfStream];
        }

        const streamUpdated = {
          ...streamPrev,
          ...stream,
        };

        if (indexOfStream >= 0) {
          streamsTemp[indexOfStream] = streamUpdated;
        } else {
          streamsTemp.push(streamUpdated);
        }
      });

      return {
        ...prev,
        catalog: {
          ...catalog,
          streams: streamsTemp,
        },
      };
    }), [
      setBlockAttributes,
    ]);

  useEffect(() => {
    const block = dataBlock?.block;

    if (block && (!blockAttributes || block?.uuid !== blockAttributes?.uuid)) {
      setBlockAttributes(block)
    }
  }, [
    blockAttributes,
    dataBlock,
  ]);

  const {
    configuration,
    content: blockContent,
    metadata,
  } = blockAttributes || {};

  const blocksMapping = useMemo(() => indexBy(blocks || [], ({ uuid }) => uuid), [blocks]);
  const blockUpstreamBlocks =
    useMemo(() => blockAttributes?.upstream_blocks?.map(uuid => blocksMapping?.[uuid]), [
      blockAttributes,
      blocksMapping,
    ]);
  const documentation = useMemo(() => blockAttributes?.documentation, [blockAttributes]);

  const streams = useMemo(() => getSelectedStreams(blockAttributes, { getAll: true }), [
    blockAttributes,
  ]);

  const {
    destination,
    name: nameDisplay,
    source,
  } = useMemo(() => metadata?.data_integration || {}, [metadata]);
  const dataIntegrationUUID = useMemo(() => destination || source || null, [destination, source]);

  const componentUUID = useMemo(() => `DataIntegrationModal/${blockUUID}`, blockUUID);
  const localStorageKeyAfter =
    useMemo(() => `block_layout_after_width_${componentUUID}`, [componentUUID]);
  const localStorageKeyBefore =
    useMemo(() => `block_layout_before_width_${componentUUID}`, [componentUUID]);

  const [showError] = useError(null, {}, [], {
    uuid: componentUUID,
  });

  const [afterWidth, setAfterWidth] = useState(get(localStorageKeyAfter, UNIT * 60));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeWidth, setBeforeWidth] = useState(Math.max(
    get(localStorageKeyBefore),
    UNIT * 40,
  ));
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);

  const [selectedMainNavigationTab, setSelectedMainNavigationTabState] =
    useState<MainNavigationTabEnum>();
  const [selectedMainNavigationTabSub, setSelectedMainNavigationTabSub] = useState<string>(null);
  const [selectedSubTab, setSelectedSubTab] = useState<SubTabEnum>(null);

  const [highlightedColumnsMapping, setHighlightedColumnsMapping] =
    useState<ColumnsMappingType>({});

  const setSelectedMainNavigationTab = useCallback((prev1) => {
    setSelectedMainNavigationTabState((prev2) => {
      const val1 = typeof prev1 === 'function' ? prev1(prev2) : prev1

      const tabs = val1 in SUB_TABS_BY_MAIN_NAVIGATION_TAB
        ? SUB_TABS_BY_MAIN_NAVIGATION_TAB[val1]
        : SUB_TABS_FOR_STREAM_DETAIL;

      setSelectedSubTab(tabs?.[0]?.uuid);

      const valOld = typeof prev2 === 'function' ? prev2() : prev2;

      if (val1 !== valOld) {
        setHighlightedColumnsMapping({});
      }

      return val1;
    });
  }, [
    setHighlightedColumnsMapping,
    setSelectedMainNavigationTabState,
    setSelectedSubTab,
  ]);

  useEffect(() => {
    if (!selectedMainNavigationTab) {
      // TODO: remove this after done testing.
      setSelectedMainNavigationTab(
        'account_v2',
        MainNavigationTabEnum.STREAMS,
      );
      setSelectedMainNavigationTabSub('source_pg_yaml');
    }
  }, [
    selectedMainNavigationTab,
    setSelectedMainNavigationTab,
  ]);

  const subtabs: TabType[] = useMemo(() => {
    if (selectedMainNavigationTab in SUB_TABS_BY_MAIN_NAVIGATION_TAB) {
      return SUB_TABS_BY_MAIN_NAVIGATION_TAB[selectedMainNavigationTab];
    }

    return SUB_TABS_FOR_STREAM_DETAIL
  }, [
    selectedMainNavigationTab,
  ]);

  const before = useMemo(() => {
    const arr = [
      {
        Icon: SettingsWithKnobs,
        uuid: MainNavigationTabEnum.CONFIGURATION,
      },
      {
        Icon: Lightning,
        uuid: MainNavigationTabEnum.SYNC,
      },
      {
        Icon: Sun,
        uuid: MainNavigationTabEnum.STREAMS,
      },
      {
        Icon: TableIcon,
        uuid: MainNavigationTabEnum.OVERVIEW,
      },
    ].map(({
      Icon,
      uuid,
    }: {
      Icon: any;
      uuid: MainNavigationTabEnum;
    }) => (
      <NavigationStyle
        key={uuid}
        selected={selectedMainNavigationTab === uuid}
      >
        <Link
          block
          noHoverUnderline
          noOutline
          onClick={() => setSelectedMainNavigationTab(uuid)}
          preventDefault
        >
          <Spacing p={PADDING_UNITS}>
            <FlexContainer alignItems="center">
              <Circle primaryLight size={UNIT * 4} square>
                <Icon size={UNIT * 2} />
              </Circle>

              <Spacing mr={2} />

              <Text bold large>
                {MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING[uuid]}
              </Text>
            </FlexContainer>
          </Spacing>
        </Link>
      </NavigationStyle>
    ));

    const streamsCount = streams?.length || 0;

    const streamsWithNoParents = [];
    const groups = {};
    streams?.forEach((stream) => {
      const {
        parent_stream: parentStream,
      } = stream;

      if (parentStream) {
        if (!groups?.[parentStream]) {
          groups[parentStream] = [];
        }
        groups[parentStream].push(stream);
      } else {
        streamsWithNoParents.push(stream);
      }
    });

    [
      {
        streams: streamsWithNoParents,
      },
      ...sortByKey(
        Object.entries(groups),
        ([k, v]) => k,
      ).map(([k, v]) => ({
        block: blocksMapping?.[k],
        streams: v,
      })),
    ].forEach(({
      block: blockInGroup,
      streams: streamsInGroup,
    }) => {
      if (blockInGroup) {
        const buuid = blockInGroup?.uuid;

        arr.push(
          <Divider key={`block-${buuid}-divider-top`} light />
        );

        arr.push(
          <Spacing
            key={`block-${buuid}`}
            px={PADDING_UNITS}
            py={1}
          >
            <Text
              bold
              color={getColorsForBlockType(blockInGroup?.type, {
                blockColor: blockInGroup?.color,
              }).accent}
              monospace
              small
            >
              {buuid}
            </Text>
          </Spacing>
        );
      }

      streamsInGroup?.forEach((stream, idx: number) => {
        const streamID = getStreamID(stream);
        const parentStreamID = getParentStreamID(stream);
        const uuid = getStreamIDWithParentStream(stream);
        const isSelected = isStreamSelected(stream);
        const isNavigationSelected = selectedMainNavigationTab === streamID
          && (!parentStreamID || selectedMainNavigationTabSub === parentStreamID);

        arr.push(
          <Divider key={`${uuid}-divider-top`} light />
        );

        arr.push(
          <NavigationStyle
            key={uuid}
            selected={isNavigationSelected}
          >
            <Link
              block
              noHoverUnderline
              noOutline
              onClick={() => {
                setSelectedMainNavigationTab(streamID);
                setSelectedMainNavigationTabSub(parentStreamID);
              }}
              preventDefault
            >
              <Spacing p={PADDING_UNITS}>
                <FlexContainer alignItems="center">
                  <Circle
                    size={UNIT * 1}
                    success={isSelected}
                  />

                  <Spacing mr={2} />

                  <Flex flex={1}>
                    <Text default={!isSelected} monospace>
                      {streamID}
                    </Text>
                  </Flex>
                </FlexContainer>
              </Spacing>
            </Link>
          </NavigationStyle>
        );

        if (idx === streamsCount - 1) {
          arr.push(
            <Divider key={`${uuid}-divider-last`} light />
          );
        }
      });
    });

    return arr;
  }, [
    blocksMapping,
    selectedMainNavigationTab,
    selectedMainNavigationTabSub,
    setSelectedMainNavigationTab,
    setSelectedMainNavigationTabSub,
    streams,
  ]);

  const [streamsFetched, setStreamsFetched] = useState<StreamType[]>(null);
  const streamsFromCatalogMapping: StreamMapping =
    useMemo(() => buildStreamMapping(streams), [
      streams,
    ]);

  const noStreamsAnywhere = useMemo(() => noStreamsAnywhereFunc(
    streamsFromCatalogMapping,
    buildStreamMapping(streamsFetched || []),
  ), [
    streamsFromCatalogMapping,
    streamsFetched,
  ]);

  const [
    fetchIntegrationSourceInit,
    {
      isLoading: isLoadingFetchIntegrationSource,
    },
  ] = useMutation(
    api.integration_sources.useUpdate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            integration_source: integrationSource,
          }) => {
            const {
              streams: streamsInit,
            } = integrationSource;

            setStreamsFetched(streamsInit)
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const fetchIntegrationSource = useCallback(() => fetchIntegrationSourceInit({
    integration_source: {
      block_uuid: blockUUID,
    },
  }), [
    blockUUID,
    fetchIntegrationSourceInit,
  ]);

  const [searchText, setSearchText] = useState<string>(null);

  const subheaderEl = useMemo(() => {
    return (
      <div ref={refSubheader}>
        {subtabs?.length >= 1 && (
          <Spacing p={PADDING_UNITS} >
            <ButtonTabs
              noPadding
              onClickTab={({ uuid }) => setSelectedSubTab(uuid)}
              regularSizeText
              selectedTabUUID={selectedSubTab}
              tabs={subtabs}
            />
          </Spacing>
        )}

        {!subtabs?.length && MainNavigationTabEnum.STREAMS === selectedMainNavigationTab && (
          <FlexContainer
            alignItems="center"
            justifyContent="space-between"
          >
            <Flex flex={1}>
              <TextInput
                beforeIcon={<Search muted={!searchText?.length} size={2 * UNIT} />}
                fullWidth
                noBackground
                noBorder
                noBorderRadiusBottom
                noBorderRadiusTop
                onChange={e => setSearchText(e?.target?.value)}
                paddingHorizontal={UNIT * PADDING_UNITS}
                paddingVertical={UNIT * PADDING_UNITS}
                placeholder="Type the name of the stream to filter..."
                value={searchText || ''}
              />
            </Flex>

            {searchText?.length >= 1 && (
              <Button
                iconOnly
                noPadding
                noBackground
                noBorder
                onClick={() => setSearchText(null)}
              >
                <Close default size={2 * UNIT} />
              </Button>
            )}

            {!noStreamsAnywhere && (
              <Spacing px={PADDING_UNITS}>
                <Button
                  compact
                  loading={isLoadingFetchIntegrationSource}
                  onClick={() => fetchIntegrationSource()}
                  primary
                >
                  Fetch streams
                </Button>
              </Spacing>
            )}
          </FlexContainer>
        )}

        <Divider light />
      </div>
    );
  }, [
    blockUUID,
    fetchIntegrationSource,
    isLoadingFetchIntegrationSource,
    noStreamsAnywhere,
    refSubheader,
    searchText,
    selectedMainNavigationTab,
    selectedSubTab,
    setSearchText,
    setSelectedSubTab,
    subtabs,
  ]);

  const heightModal = useMemo(() => heightWindow - (MODAL_PADDING * 2), [heightWindow]);
  const widthModal = useMemo(() => widthWindow - (MODAL_PADDING * 2), [widthWindow]);

  const [headerOffset, setHeaderOffset] = useState<number>(null);
  const [afterFooterBottomOffset, setAfterFooterBottomOffset] = useState<number>(null);
  const [afterInnerTopOffset, setAfterInnerTopOffset] = useState<number>(null);

  useEffect(() => {
    if (selectedMainNavigationTab) {
      if (refSubheader?.current) {
        setHeaderOffset(refSubheader?.current?.getBoundingClientRect()?.height);
      }
      if (refAfterHeader?.current) {
        setAfterInnerTopOffset(refAfterHeader?.current?.getBoundingClientRect()?.height);
      }
      if (refAfterFooter?.current) {
        setAfterFooterBottomOffset(refAfterFooter?.current?.getBoundingClientRect()?.height);
      }
    }
  }, [
    selectedMainNavigationTab,
    refAfterHeader,
    refAfterFooter,
    refSubheader,
  ]);

  const [afterHiddenState, setAfterHidden] = useState<boolean>(false);

  const blockContentParsed = useMemo(() => {
    if (BlockLanguageEnum.YAML === blockLanguage && blockContent) {
      return parse(blockContent);
    }

    return {};
  }, [
    blockContent,
    blockLanguage,
  ]);

  const [blockConfig, setBlockConfig] = useState<string>(null);

  useEffect(() => {
    if (blockContentParsed && !blockConfig) {
      setBlockConfig(stringify(blockContentParsed?.config));
    }
  }, [
    blockConfig,
    blockContentParsed,
  ]);

  const [updateBlock, { isLoading: isLoadingUpdateBlock }] = useMutation(
    api.blocks.pipelines.useUpdate(pipelineUUID, encodeURIComponent(blockUUID)),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (resp) => {
            onSaveBlock?.(resp?.block);
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [connectionSuccessful, setConnectionSuccessful] = useState<boolean>(false);
  const [testConnection, { isLoading: isLoadingTestConnection }] = useMutation(
    api.integration_sources.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response,
        {
          callback: (resp) => {
            const {
              integration_source: integrationSource,
            } = resp;

            if (integrationSource?.error_message) {
              showError({
                response: {
                  error: {
                    exception: integrationSource?.error_message,
                  },
                },
              });
            } else if (integrationSource?.success) {
              setConnectionSuccessful(true);
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const isOnStreamDetail = useMemo(() => selectedMainNavigationTab
    && ![
      MainNavigationTabEnum.CONFIGURATION,
      MainNavigationTabEnum.OVERVIEW,
      MainNavigationTabEnum.STREAMS,
      MainNavigationTabEnum.SYNC,
    ].includes(selectedMainNavigationTab),
  [
    selectedMainNavigationTab,
  ]);

  const isOnStreamDetailSchemaProperties = useMemo(() => isOnStreamDetail
    && SubTabEnum.SETTINGS === selectedSubTab,
  [
    isOnStreamDetail,
    selectedSubTab,
  ]);

  const isOnConfigurationCredentials =
    useMemo(() => MainNavigationTabEnum.CONFIGURATION === selectedMainNavigationTab
      && SubTabEnum.CREDENTIALS === selectedSubTab
    ,
    [
      selectedMainNavigationTab,
      selectedSubTab,
    ]);

  const afterHidden: boolean = useMemo(() => {
    if (isOnConfigurationCredentials || isOnStreamDetailSchemaProperties) {
      return afterHiddenState;
    }

    return true;
  }, [
    afterHiddenState,
    isOnConfigurationCredentials,
    isOnStreamDetailSchemaProperties,
    selectedMainNavigationTab,
    selectedSubTab,
  ]);

  const streamDetailMemo = useMemo(() => {
    const stream = getStreamFromStreamMapping({
      parent_stream: selectedMainNavigationTabSub,
      stream: selectedMainNavigationTab,
      tap_stream_id: selectedMainNavigationTab,
    }, streamsFromCatalogMapping);

    if (stream) {
      return (
        <StreamDetail
          block={blockAttributes}
          blocksMapping={blocksMapping}
          highlightedColumnsMapping={highlightedColumnsMapping}
          selectedSubTab={selectedSubTab}
          setBlockAttributes={setBlockAttributes}
          setHighlightedColumnsMapping={setHighlightedColumnsMapping}
          stream={stream}
          streamMapping={streamsFromCatalogMapping}
          updateStreamsInCatalog={updateStreamsInCatalog}
        />
      );
    }
  }, [
    blockAttributes,
    blocksMapping,
    highlightedColumnsMapping,
    selectedMainNavigationTab,
    selectedMainNavigationTabSub,
    selectedSubTab,
    setBlockAttributes,
    setHighlightedColumnsMapping,
    streamsFromCatalogMapping,
    updateStreamsInCatalog,
  ]);

  const mainContentEl = useMemo(() => {
    if (MainNavigationTabEnum.CONFIGURATION === selectedMainNavigationTab) {
      if (SubTabEnum.CREDENTIALS === selectedSubTab) {
        let codeEl;
        if (BlockLanguageEnum.YAML === blockLanguage) {
          codeEl = (
            <CodeEditorStyle>
              <CodeEditor
                autoHeight
                language={blockLanguage}
                onChange={(val: string) => {
                  onChangeCodeBlock?.(blockType, blockUUID, stringify({
                    ...blockContent,
                    config: parse(val),
                  }));
                  setBlockConfig(val);
                }}
                tabSize={2}
                value={blockConfig || undefined}
                width="100%"
              />
            </CodeEditorStyle>
          );
        } else if (BlockLanguageEnum.PYTHON === blockLanguage) {
          codeEl = (
            <CodeEditorStyle>
              <CodeEditor
                autoHeight
                language={blockLanguage}
                onChange={(val: string) => {
                  onChangeCodeBlock?.(blockType, blockUUID, val);
                }}
                tabSize={4}
                value={blockContent}
                width="100%"
              />
            </CodeEditorStyle>
          );
        }

        const inputs = dataIntegrationConfiguration?.inputs || {};
        const inputsBlocks = blockUpstreamBlocks?.reduce((acc, b) => {
          const {
            uuid,
          } = b;
          const input = inputs?.[uuid];
          if (!input) {
            return acc;
          }

          return acc.concat({
            block: b,
            input,
          })
        }, []);

        return (
          <>
            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <Button
                  beforeIcon={<PlugAPI success />}
                  loading={isLoadingTestConnection}
                  onClick={() => {
                    setConnectionSuccessful(false);
                    testConnection({
                      integration_source: {
                        action_type: 'test_connection',
                        block_uuid: blockUUID,
                        pipeline_uuid: pipelineUUID,
                      },
                    });
                  }}
                  secondary
                  compact
                >
                  Test connection
                </Button>

                {connectionSuccessful && (
                  <>
                    <Spacing mr={PADDING_UNITS} />

                    <FlexContainer alignItems="center">
                      <Circle
                        size={UNIT * 1}
                        success
                      />

                      <Spacing mr={1} />

                      <Text success>
                        Connection successful
                      </Text>
                    </FlexContainer>
                  </>
                )}
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <Text bold default large>
                Inputs from upstream blocks
              </Text>

              {inputsBlocks?.length === 0 && (
                <Spacing mt={1}>
                  <Text muted>
                    No inputs are selected.
                    Toggle the upstream blocks in the <Link
                      bold
                      onClick={() => setSelectedSubTab(SubTabEnum.UPSTREAM_BLOCK_SETTINGS)}
                      preventDefault
                    >
                      Upstream block settings
                    </Link> to enable its output data as an input.
                  </Text>
                </Spacing>
              )}
            </Spacing>

            {inputsBlocks?.length >= 1 && (
              <Table
                columnFlex={[1, null, 1, null, null]}
                columns={[
                  {
                    uuid: 'Block',
                  },
                  {
                    center: true,
                    uuid: 'Catalog',
                  },
                  {
                    center: true,
                    uuid: 'Streams',
                  },
                  {
                    center: true,
                    uuid: 'Argument shape',
                  },
                  {
                    center: true,
                    uuid: 'Order',
                  },
                ]}
                rows={inputsBlocks?.map(({
                  block: {
                    color,
                    type: bType,
                    uuid,
                  },
                  input: {
                    catalog,
                    streams,
                  },
                }, idx: number) => {
                  const hasStreams = streams?.length >= 1;
                  const {
                    accent,
                  } = getColorsForBlockType(bType, {
                    blockColor: color,
                  });

                  return [
                    <Text color={accent} key={`block-${uuid}`} monospace>
                      {uuid}
                    </Text>,
                    <FlexContainer justifyContent="center" key={`catalog-${uuid}`}>
                      {catalog
                        ? <Check success />
                        : <Close muted />
                      }
                    </FlexContainer>,
                    <FlexContainer justifyContent="center" key={`selected-streams-${uuid}`}>
                      {!hasStreams && <Close key={`catalog-${uuid}`} muted />}
                      {hasStreams && streams?.includes(uuid)
                        ? <Check success />
                        : (
                          <Text center default monospace small>
                            {streams?.join(', ')}
                          </Text>
                        )
                      }
                    </FlexContainer>,
                    <Text center default key={`shape-${uuid}`} monospace>
                      {catalog && !hasStreams && 'Dict'}
                      {!catalog && hasStreams && 'Union[Dict, pd.DataFrame]'}
                      {catalog && hasStreams && 'Tuple[Union[Dict, pd.DataFrame], Dict]'}
                    </Text>,
                    <Text center default key={`position-${uuid}`} monospace>
                      {idx}
                    </Text>,
                  ];
                })}
              />
            )}

            {codeEl}
          </>
        );
      } else if (SubTabEnum.UPSTREAM_BLOCK_SETTINGS === selectedSubTab) {
        const rows = blockUpstreamBlocks?.map(({
          uuid,
        }): BlockType => {
          const inputSettings = dataIntegrationConfiguration?.inputs?.[uuid];
          const selectedInputStreams = inputSettings?.streams || [];
          const inputEnabled: boolean = !!inputSettings;
          const blockUpstream = blocksMapping?.[uuid];
          const blockUpstreamCatalog = blockUpstream?.catalog;

          const streams = blockUpstreamCatalog
            ? getSelectedStreams(blockUpstream)?.map(({
              stream: streamID,
              tap_stream_id: tapStreamID,
            }) => streamID || tapStreamID)
            : [uuid];

          const streamsOnlyContainsUpstreamBlock = streams?.length === 1 &&
            streams?.includes(uuid);

          return (
            <div key={uuid}>
              <Spacing p={PADDING_UNITS}>
                <FlexContainer alignItems="center" justifyContent="space-between">
                  <Flex>
                    <Text bold large monospace muted={!inputEnabled}>
                      {uuid}
                    </Text>
                  </Flex>

                  <Spacing mr={1} />

                  <ToggleSwitch
                    checked={inputEnabled}
                    compact
                    onCheck={(valFunc: (val: boolean) => boolean) => {
                      setDataIntegrationConfigurationForInputs((
                        inputsPrev: ConfigurationDataIntegrationInputsType,
                      ) => {
                        if (valFunc(inputEnabled)) {
                          return {
                            ...inputsPrev,
                            [uuid]: {},
                          };
                        } else {
                          return ignoreKeys(inputsPrev, [uuid]);
                        }
                      });
                    }}
                  />
                </FlexContainer>

                {inputEnabled && (
                  <Spacing mt={PADDING_UNITS}>
                    <RowDataTable
                      noBackground
                      noBoxShadow
                      sameColorBorders
                    >
                      <RowStyle noBorder>
                        <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
                          <Flex flexDirection="column">
                            <Text bold default>
                              Use catalog as an input
                            </Text>

                            <Text muted small>
                              If checked, then this block’s catalog will be included as part of the
                              input argument(s) for the current block.
                            </Text>
                          </Flex>

                          <Spacing mr={1} />

                          <Checkbox
                            checked={inputSettings?.catalog}
                            onClick={() => setDataIntegrationConfigurationForInputs((
                              inputsPrev: ConfigurationDataIntegrationInputsType,
                            ) => ({
                              ...inputsPrev,
                              [uuid]: {
                                ...inputsPrev?.[uuid],
                                catalog: !inputsPrev?.[uuid]?.catalog,
                              },
                            }))}
                          />
                        </FlexContainer>
                      </RowStyle>

                      {streamsOnlyContainsUpstreamBlock && (
                        <RowStyle noBorder>
                          <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
                            <Flex flexDirection="column">
                              <Text bold default>
                                Use the block’s output data as an input
                              </Text>

                              <Text muted small>
                                Include this block’s output data as an input.
                              </Text>
                            </Flex>

                            <Spacing mr={1} />

                            <Checkbox
                              checked={selectedInputStreams?.includes(uuid)}
                              monospace
                              onClick={() => setDataIntegrationConfigurationForInputs((
                                inputsPrev: ConfigurationDataIntegrationInputsType,
                              ) => ({
                                ...inputsPrev,
                                [uuid]: {
                                  ...inputsPrev?.[uuid],
                                  streams: selectedInputStreams?.includes(uuid)
                                    ? remove(selectedInputStreams, i => i === uuid)
                                    : selectedInputStreams.concat(uuid),
                                },
                              }))}
                              small
                            />
                          </FlexContainer>
                        </RowStyle>
                      )}

                      {!streamsOnlyContainsUpstreamBlock && (
                        <RowStyle noBorder>
                          <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
                            <Flex flexDirection="column">
                              <Text bold default>
                                Select which stream’s data to use as an input
                              </Text>

                              <Text muted small>
                                Only the output data from the selected streams will be used as an
                                input.
                                <br />
                                If none are selected, then no output data from any stream from this
                                block will be used as in input.
                                <br />
                                If you don’t see a stream here, then the upstream block may have
                                unselected the stream in its stream settings.
                              </Text>
                            </Flex>

                            <Spacing mr={3} />
                          </FlexContainer>

                          {streams?.map((stream: string) => {
                            const selected = selectedInputStreams?.includes(stream)

                            return (
                              <Spacing key={stream} mt={1}>
                                <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
                                  <Flex>
                                    <Text default monospace small>
                                      {stream}
                                    </Text>
                                  </Flex>

                                  <Spacing mr={1} />

                                  <Checkbox
                                    checked={selected}
                                    onClick={() => setDataIntegrationConfigurationForInputs((
                                      inputsPrev: ConfigurationDataIntegrationInputsType,
                                    ) => ({
                                      ...inputsPrev,
                                      [uuid]: {
                                        ...inputsPrev?.[uuid],
                                        streams: selected
                                          ? remove(selectedInputStreams, i => i === stream)
                                          : selectedInputStreams.concat(stream),
                                      },
                                    }))}
                                    small
                                  />
                                </FlexContainer>
                              </Spacing>
                            );
                          })}
                        </RowStyle>
                      )}

                      <RowStyle noBorder>
                        <FlexContainer {...JUSTIFY_SPACE_BETWEEN_PROPS}>
                          <Flex flexDirection="column">
                            <Text bold default>
                              Only use this block’s output data as an input
                            </Text>

                            <Text muted small>
                              If checked, then this block’s output data is only used as
                              inputs.
                              {BlockTypeEnum.DATA_EXPORTER === blockType && (
                                <>
                                  <br />
                                  The block’s output data won’t be ingested when running a sync,
                                  regardless if it’s enabled in the settings.
                                </>
                              )}
                            </Text>
                          </Flex>

                          <Spacing mr={1} />

                          <Checkbox
                            checked={inputSettings?.input_only}
                            onClick={() => setDataIntegrationConfigurationForInputs((
                              inputsPrev: ConfigurationDataIntegrationInputsType,
                            ) => ({
                              ...inputsPrev,
                              [uuid]: {
                                ...inputsPrev?.[uuid],
                                input_only: !inputsPrev?.[uuid]?.input_only,
                              },
                            }))}
                          />
                        </FlexContainer>
                      </RowStyle>
                    </RowDataTable>
                  </Spacing>
                )}
              </Spacing>

              <Divider light />
            </div>
          );
        });

        return (
          <div>
            <Spacing p={PADDING_UNITS}>
              <Headline>
                Inputs
              </Headline>

              <Spacing mt={1}>
                <Text default>
                  Choose which upstream block to use as inputs when interpolating data
                  into <Text inline monospace>
                    {blockUUID}
                  </Text>’s (current block) credentials (aka config) and decorated functions.
                </Text>
              </Spacing>

              <Spacing mt={1}>
                <Text default>
                  If <Text inline monospace>
                    {blockUUID}
                  </Text> (current block) doesn’t require the data from an upstream block to
                  interpolate or as arguments for decorated functions, don’t toggle them on
                  because it’ll save time and data by not loading unnecessary data as inputs.
                </Text>
              </Spacing>

              {DataIntegrationTypeEnum.DESTINATIONS === dataIntegrationType && (
                <Spacing mt={1}>
                  <Text default>
                    Upstream blocks can still be selected to have its data ingested.
                    This is toggled and configured in the <Link
                      bold
                      primary
                      preventDefault
                      onClick={() => setSelectedMainNavigationTab(MainNavigationTabEnum.STREAMS)}
                    >
                      Streams
                    </Link> section.
                  </Text>
                </Spacing>
              )}
            </Spacing>

            <Divider light />

            {rows}
          </div>
        );
      }
    } else if (MainNavigationTabEnum.STREAMS === selectedMainNavigationTab) {
      if (noStreamsAnywhere) {
        return (
          <Spacing p={PADDING_UNITS}>
            <Button
              large
              loading={isLoadingFetchIntegrationSource}
              onClick={() => fetchIntegrationSource()}
              primary
            >
              Fetch streams
            </Button>
          </Spacing>
        );
      }

      return (
        <StreamGrid
          block={blockAttributes}
          blocksMapping={blocksMapping}
          height={heightModal - headerOffset}
          searchText={searchText}
          setSelectedMainNavigationTab={setSelectedMainNavigationTab}
          setSelectedMainNavigationTabSub={setSelectedMainNavigationTabSub}
          streamsFetched={streamsFetched}
          updateStreamsInCatalog={updateStreamsInCatalog}
          width={widthModal - (beforeWidth + (afterHidden ? 0 : afterWidth))}
        />
      )
    } else if (MainNavigationTabEnum.SYNC === selectedMainNavigationTab) {
      return (
        <Spacing p={PADDING_UNITS}>
          <Text>
            Coming soon
          </Text>
        </Spacing>
      );
    } else if (MainNavigationTabEnum.OVERVIEW === selectedMainNavigationTab) {
      return (
        <StreamsOverview
          block={blockAttributes}
          blocksMapping={blocksMapping}
          setSelectedMainNavigationTab={setSelectedMainNavigationTab}
          setSelectedMainNavigationTabSub={setSelectedMainNavigationTabSub}
          streamMapping={streamsFromCatalogMapping}
          updateStreamsInCatalog={updateStreamsInCatalog}
        />
      );
    }
  }, [
    afterHidden,
    afterWidth,
    beforeWidth,
    blockAttributes,
    blockConfig,
    blockContent,
    blockLanguage,
    blockType,
    blockUUID,
    blockUpstreamBlocks,
    blocksMapping,
    connectionSuccessful,
    dataIntegrationConfiguration,
    dataIntegrationType,
    fetchIntegrationSource,
    headerOffset,
    heightModal,
    isLoadingFetchIntegrationSource,
    isLoadingTestConnection,
    noStreamsAnywhere,
    pipelineUUID,
    searchText,
    selectedMainNavigationTab,
    selectedMainNavigationTabSub,
    selectedSubTab,
    setBlockAttributes,
    setBlockConfig,
    setConnectionSuccessful,
    setDataIntegrationConfigurationForInputs,
    setSelectedMainNavigationTab,
    setSelectedMainNavigationTabSub,
    streamsFetched,
    streamsFromCatalogMapping,
    testConnection,
    updateStreamsInCatalog,
    widthModal,
  ]);

  const afterHeader = useMemo(() => {
    if (isOnConfigurationCredentials) {
      return (
        <Text bold>
          Documentation
        </Text>
      );
    } else if (isOnStreamDetailSchemaProperties) {
      return (
        <Text bold>
          Mass editing
        </Text>
      );
    }
  }, [
    isOnConfigurationCredentials,
    isOnStreamDetailSchemaProperties,
  ]);

  const [attributesMapping, setAttributesMapping] = useState<AttributesMappingType>({});
  const [selectedStreamMapping, setSelectedStreamMapping] = useState<StreamMapping>(null);

  const afterFooter = useMemo(() => {
    if (isOnStreamDetailSchemaProperties) {
      return (
        <Spacing p={PADDING_UNITS} ref={refAfterFooter}>
          <FlexContainer>
            <Button
              fullWidth
              onClick={() => {
                const streamMappingUpdated = updateStreamMappingWithPropertyAttributeValues(
                  selectedStreamMapping,
                  highlightedColumnsMapping,
                  attributesMapping,
                );

                updateStreamsInCatalog(getAllStreamsFromStreamMapping(streamMappingUpdated));
              }}
              primary
            >
              Apply changes
            </Button>

            <Spacing mr={1} />

            <Button
              fullWidth
              onClick={() => {
                setAttributesMapping({});
                setHighlightedColumnsMapping({});
                setSelectedStreamMapping(null);
              }}
              secondary
            >
              Clear
            </Button>
          </FlexContainer>
        </Spacing>
      );
    }
  }, [
    attributesMapping,
    highlightedColumnsMapping,
    isOnStreamDetailSchemaProperties,
    refAfterFooter,
    selectedStreamMapping,
    setAttributesMapping,
    setHighlightedColumnsMapping,
    setSelectedStreamMapping,
  ]);

  const after = useMemo(() => {
    if (isOnConfigurationCredentials) {
      return (
        <Spacing p={PADDING_UNITS}>
          {!dataBlock && (
            <Spinner />
          )}

          {documentation && (
            <Markdown>
              {documentation.replace(/\<br \/\>/g, '\n\n')}
            </Markdown>
          )}
        </Spacing>
      );
    } else if (isOnStreamDetailSchemaProperties) {
      const stream = getStreamFromStreamMapping({
        parent_stream: selectedMainNavigationTabSub,
        stream: selectedMainNavigationTab,
        tap_stream_id: selectedMainNavigationTab,
      }, streamsFromCatalogMapping);

      return (
        <StreamSchemaPropertiesEditor
          attributesMapping={attributesMapping}
          block={blockAttributes}
          blocksMapping={blocksMapping}
          highlightedColumnsMapping={highlightedColumnsMapping}
          selectedStreamMapping={selectedStreamMapping}
          setAttributesMapping={setAttributesMapping}
          setBlockAttributes={setBlockAttributes}
          setHighlightedColumnsMapping={setHighlightedColumnsMapping}
          setSelectedStreamMapping={setSelectedStreamMapping}
          stream={stream}
          streamMapping={streamsFromCatalogMapping}
          updateStreamsInCatalog={updateStreamsInCatalog}
        />
      );
    }
  }, [
    attributesMapping,
    blockAttributes,
    blocksMapping,
    dataBlock,
    documentation,
    highlightedColumnsMapping,
    isOnConfigurationCredentials,
    isOnStreamDetailSchemaProperties,
    selectedStreamMapping,
    setAttributesMapping,
    setHighlightedColumnsMapping,
    setSelectedStreamMapping,
    streamsFromCatalogMapping,
    updateStreamsInCatalog,
  ]);

  const breadcrumbsEl = useMemo(() => {
    const arr = [
      {
        label: () => blockUUID,
      },
    ];

    if (nameDisplay) {
      arr.push({
        bold: !selectedMainNavigationTab,
        label: () => nameDisplay,
      });
    }

    if (selectedMainNavigationTab) {
      arr.push({
        bold: true,
        label: () => MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING[selectedMainNavigationTab]
          || selectedMainNavigationTab,
      });
    }

    return (
      <Breadcrumbs
        breadcrumbs={arr}
        noMarginLeft
      />
    );
  }, [
    blockUUID,
    nameDisplay,
    selectedMainNavigationTab,
  ]);

  return (
    <ContainerStyle
      maxWidth={widthModal}
    >
      <HeaderStyle>
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
        >
          <Flex>
            {breadcrumbsEl}
          </Flex>

          <Spacing mr={1} />

          <FlexContainer alignItems="center">
            <Link
              href="https://docs.mage.ai"
              inline
              noBackground
              noBorder
              noOutline
              noPadding
              openNewWindow
            >
              <DocumentIcon default size={UNIT * 2} />
            </Link>

            <Spacing mr={2} />

            {onClose && (
              <Button
                iconOnly
                noBackground
                noBorder
                noPadding
                onClick={onClose}
              >
                <Close default size={UNIT * 2} />
              </Button>
            )}
          </FlexContainer>
        </FlexContainer>
      </HeaderStyle>

      <TripleLayout
        after={after}
        afterFooter={afterFooter}
        afterFooterBottomOffset={afterFooterBottomOffset - (MODAL_PADDING / 2)}
        afterHeader={(
          <Spacing ref={refAfterHeader} px={1}>
            {afterHeader}
          </Spacing>
        )}
        afterHeightOffset={0}
        afterHeaderOffset={0}
        afterHidden={afterHidden}
        afterInnerHeightMinus={
          (headerOffset - afterInnerTopOffset) + (afterFooterBottomOffset || 0)
        }
        afterMousedownActive={afterMousedownActive}
        afterWidth={afterWidth}
        before={before}
        beforeHeightOffset={0}
        beforeMousedownActive={beforeMousedownActive}
        beforeWidth={beforeWidth}
        contained
        headerOffset={headerOffset}
        height={heightModal}
        hideAfterCompletely={!after}
        inline
        aside
        mainContainerHeader={subheaderEl}
        mainContainerRef={mainContainerRef}
        setAfterHidden={setAfterHidden}
        setAfterMousedownActive={setAfterMousedownActive}
        setAfterWidth={setAfterWidth}
        setBeforeMousedownActive={setBeforeMousedownActive}
        setBeforeWidth={setBeforeWidth}
        uuid={componentUUID}
      >
        {isOnStreamDetail && streamDetailMemo}
        {!isOnStreamDetail && mainContentEl}
      </TripleLayout>
    </ContainerStyle>
  );
}

export default DataIntegrationModal;
