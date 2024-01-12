import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Breadcrumbs from '@components/Breadcrumbs';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Checkbox from '@oracle/elements/Checkbox';
import Circle from '@oracle/elements/Circle';
import Credentials, { CredentialsProps } from './Credentials';
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
import StreamOverviewEditor from './StreamOverviewEditor';
import StreamSchemaPropertiesEditor from './StreamSchemaPropertiesEditor';
import StreamsOverview from './StreamsOverview';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import {
  Close,
  CubeWithArrowDown,
  DocumentIcon,
  Search,
  SettingsWithKnobs,
  Sun,
  Table as TableIcon,
} from '@oracle/icons';
import {
  ConfigurationDataIntegrationInputsType,
  ConfigurationDataIntegrationType,
} from '@interfaces/ChartBlockType';
import {
  AfterContentStyle,
  AfterFooterStyle,
  ContainerStyle,
  HeaderStyle,
  MODAL_PADDING,
  NavigationStyle,
} from './index.style';
import { DataIntegrationTypeEnum } from '@interfaces/BlockTemplateType';
import {
  MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING,
  MAIN_TABS_EXCEPT_STREAM_DETAIL,
  MainNavigationTabEnum,
  SUB_TABS_BY_MAIN_NAVIGATION_TAB,
  SUB_TABS_FOR_STREAM_DETAIL,
  SubTabEnum,
} from './constants';
import {
  PADDING_UNITS,
  UNIT,
} from '@oracle/styles/units/spacing';
import {
  AttributesMappingType,
  ColumnsMappingType,
  StreamMapping,
  buildStreamMapping,
  getAllStreamsFromStreamMapping,
  getParentStreamID,
  getSelectedStreams,
  getStreamFromStreamMapping,
  getStreamID,
  getStreamIDWithParentStream,
  isStreamSelected,
  noStreamsAnywhere as noStreamsAnywhereFunc,
  updateStreamMappingWithPropertyAttributeValues,
  updateStreamMappingWithStreamAttributes,
} from '@utils/models/block';
import { StreamType } from '@interfaces/IntegrationSourceType';
import { get } from '@storage/localStorage';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy, intersection, remove, sortByKey } from '@utils/array';
import { ignoreKeys, isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';
import { useWindowSize } from '@utils/sizes';

type DataIntegrationModalProps = {
  block: BlockType;
  defaultMainNavigationTab?: MainNavigationTabEnum | string;
  defaultMainNavigationTabSub?: string;
  defaultSubTab?: string;
  onChangeBlock?: (block: BlockType) => void;
  onChangeCodeBlock?: (type: string, uuid: string, value: string) => void;
  onClose?: () => void;
  onSaveBlock?: (block: BlockType) => void;
  pipeline: PipelineType;
  savePipelineContent?: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
  setContent?: (content: string) => void;
} & CredentialsProps;

const MODAL_VERTICAL_PADDING_TOTAL = 3 * UNIT * 2;

function DataIntegrationModal({
  block: blockProp = null,
  defaultMainNavigationTab = null,
  defaultMainNavigationTabSub = null,
  defaultSubTab = null,
  onChangeBlock,
  onChangeCodeBlock,
  onClose,
  onSaveBlock,
  pipeline,
  savePipelineContent,
  setContent,
}: DataIntegrationModalProps) {
  const mainContainerRef = useRef(null);
  const refAfterHeader = useRef(null);
  const refAfterFooter = useRef(null);
  const refSubheader = useRef(null);

  const [attributesMapping, setAttributesMapping] = useState<AttributesMappingType>({});
  const [selectedStreamMapping, setSelectedStreamMapping] = useState<StreamMapping>(null);
  const [clearSelectionAndValues, setClearSelectionAndValues] = useState<boolean>(false);

  const {
    height: heightWindow,
    width: widthWindow,
  } = useWindowSize();

  const {
    blocks,
    uuid: pipelineUUID,
  } = pipeline || {};

  const {
    catalog: catalogProp,
    content: blockContentFromBlockProp,
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

  const [blockAttributes, setBlockAttributes] = useState<BlockType>(blockProp || null);

  const {
    configuration,
    content: blockContentFromBlockAttributes,
    metadata,
  } = blockAttributes || {};

  const {
    destination,
    name: nameDisplay,
    source,
  } = useMemo(() => metadata?.data_integration || {}, [metadata]);
  const dataIntegrationUUID = useMemo(() => destination || source || null, [destination, source]);

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

  const dataIntegrationConfiguration: ConfigurationDataIntegrationType =
    useMemo(() => blockAttributes?.configuration?.data_integration || {}, [
      blockAttributes,
    ]);

  const setDataIntegrationConfiguration = useCallback(prev1 => setBlockAttributes(prev2 => {
    const updated = {
      ...prev2,
      configuration: {
        ...prev2?.configuration,
        data_integration: prev1(prev2?.configuration?.data_integration || {}),
      },
    };

    onChangeBlock?.(updated);

    return updated;
  }), [
    onChangeBlock,
    setBlockAttributes,
  ]);

  const setDataIntegrationConfigurationForInputs =
    useCallback(prev => setDataIntegrationConfiguration((
      dataIntegrationConfigurationPrev: ConfigurationDataIntegrationType,
    ) => ({
      ...dataIntegrationConfigurationPrev,
      inputs: prev(dataIntegrationConfigurationPrev?.inputs || {}),
    })), [
      setDataIntegrationConfiguration,
    ]);

  const updateStreamsInCatalog =
    useCallback((
      streams: StreamType[],
      callback?: (b: BlockType) => void,
    ) => setBlockAttributes(prev => {
      const catalog = prev?.catalog || {
        streams: [],
      };
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

      const updated = {
        ...prev,
        catalog: {
          ...catalog,
          streams: streamsTemp,
        },
      };

      callback?.(updated);

      return updated;
    }), [
      setBlockAttributes,
    ]);

  const blockFromServer = useMemo(() => dataBlock?.block, [dataBlock]);
  useEffect(() => {
    if (blockFromServer) {
      if (!blockAttributes || blockFromServer?.uuid !== blockAttributes?.uuid) {
        setBlockAttributes(blockFromServer);
      }
    }
  }, [
    blockAttributes,
    blockFromServer,
  ]);

  const blocksMapping = useMemo(() => indexBy(blocks || [], ({ uuid }) => uuid), [blocks]);
  const blockUpstreamBlocks =
    useMemo(() => blockAttributes?.upstream_blocks?.map(uuid => blocksMapping?.[uuid]), [
      blockAttributes,
      blocksMapping,
    ]);
  const documentation = useMemo(() => blockFromServer?.documentation, [blockFromServer]);

  const streams = useMemo(() => getSelectedStreams(blockAttributes, { getAll: true }), [
    blockAttributes,
  ]);
  const streamsFromCatalogMapping: StreamMapping =
    useMemo(() => buildStreamMapping(streams), [
      streams,
    ]);

  const componentUUID = useMemo(() => `DataIntegrationModal/${blockUUID}`, [blockUUID]);
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

  const [highlightedColumnsMapping, setHighlightedColumnsMapping] =
    useState<ColumnsMappingType>({});

  const [
    {
      selectedMainNavigationTab,
      selectedMainNavigationTabSub,
      selectedSubTab,
    },
    setAllTabs,
  ] = useState<{
    selectedMainNavigationTab: MainNavigationTabEnum;
    selectedMainNavigationTabSub: string;
    selectedSubTab: SubTabEnum | string;
  }>({
    selectedMainNavigationTab: null,
    selectedMainNavigationTabSub: defaultMainNavigationTabSub,
    selectedSubTab: null,
  });

  const [streamsMappingConflicts, setStreamsMappingConflicts] =
    useState<StreamMapping>(buildStreamMapping([]));

  const subTabsForStreamDetail: TabType[] = useMemo(() => {
    if (!isEmptyObject(streamsMappingConflicts?.noParents)
      || !isEmptyObject(streamsMappingConflicts?.parents)
    ) {
      let streamWithConflict;

      if (selectedMainNavigationTab) {
        if (selectedMainNavigationTabSub) {
          streamWithConflict =
            streamsMappingConflicts?.parents?.[selectedMainNavigationTab]?.[selectedMainNavigationTabSub];
        } else {
          streamWithConflict = streamsMappingConflicts?.noParents?.[selectedMainNavigationTab];
        }
      }

      return SUB_TABS_FOR_STREAM_DETAIL({
        addStreamConflicts: !!streamWithConflict,
      });
    }

    return SUB_TABS_FOR_STREAM_DETAIL();
  }, [
    selectedMainNavigationTab,
    selectedMainNavigationTabSub,
    streamsMappingConflicts,
  ]);

  const getSubTabForMainNavigationTab =
    useCallback((mainNavigationTab: MainNavigationTabEnum | string): TabType[] => {
      if (mainNavigationTab in SUB_TABS_BY_MAIN_NAVIGATION_TAB) {
        return SUB_TABS_BY_MAIN_NAVIGATION_TAB[mainNavigationTab];
      }

      return subTabsForStreamDetail;
    }, [
      subTabsForStreamDetail,
    ]);

  const setSelectedMainNavigationTab = useCallback((input) => {
    const setAllTabsFunc = (
      allTabsNew: {
        selectedMainNavigationTab?: MainNavigationTabEnum;
        selectedMainNavigationTabSub?: string;
        selectedSubTab?: SubTabEnum | string;
      },
      allTabsPrev: {
        selectedMainNavigationTab?: MainNavigationTabEnum;
        selectedMainNavigationTabSub?: string;
        selectedSubTab?: SubTabEnum | string;
      },
    ) => {
      const {
        selectedMainNavigationTab: val1,
        selectedMainNavigationTabSub: mainNavigationTabSub,
        selectedSubTab: subTab,
      } = allTabsNew || {};
      const {
        selectedMainNavigationTab: prev2,
        selectedMainNavigationTabSub: subtabPrev,
      } = allTabsPrev || {};

      const tabs = val1 in SUB_TABS_BY_MAIN_NAVIGATION_TAB
        ? SUB_TABS_BY_MAIN_NAVIGATION_TAB[val1]
        : subTabsForStreamDetail;

      let subTabUse = subTab;
      // If changing main tabs between stream detail tabs, persist the subtab.
      if (MAIN_TABS_EXCEPT_STREAM_DETAIL[val1] || MAIN_TABS_EXCEPT_STREAM_DETAIL[prev2]) {
        if (!subTabUse) {
          subTabUse = tabs?.[0]?.uuid;
        } else if (MAIN_TABS_EXCEPT_STREAM_DETAIL[prev2] && !MAIN_TABS_EXCEPT_STREAM_DETAIL[val1]) {
          // If changing from a main tab to a stream detail tab and the subTabUse isn’t
          // a subtab that exists in the stream detail tab, set a default subtab.
          // @ts-ignore
          if (subTabUse
            // @ts-ignore
            && !subTabsForStreamDetail?.includes(subTabUse)
            && SubTabEnum.STREAM_CONFLICTS !== subTabUse
          ) {
            subTabUse = subTabsForStreamDetail?.[0]?.uuid;
          }
        }

        if (val1 !== prev2) {
          setHighlightedColumnsMapping({});
        }

        // Only unhighlight the columns that don’t exist in the newly selected stream.
        const streamOld = getStreamFromStreamMapping({
          parent_stream: subtabPrev,
          stream: prev2,
          tap_stream_id: prev2,
        }, streamsFromCatalogMapping);

        const streamNew = getStreamFromStreamMapping({
          parent_stream: mainNavigationTabSub,
          stream: val1,
          tap_stream_id: val1,
        }, streamsFromCatalogMapping);

        const columnsSame = intersection(
          Object.keys(streamOld?.schema?.properties || {}),
          Object.keys(streamNew?.schema?.properties || {}),
        );

        setHighlightedColumnsMapping(mappingPrev => ({
          ...selectKeys(mappingPrev, columnsSame || []),
        }));
      }

      return {
        selectedMainNavigationTab: val1,
        selectedMainNavigationTabSub: mainNavigationTabSub,
        selectedSubTab: subTabUse,
      };
    };

    setAllTabs((allTabsPrev) => setAllTabsFunc(
      input(allTabsPrev),
      allTabsPrev,
    ));
  }, [
    setHighlightedColumnsMapping,
    streamsFromCatalogMapping,
    subTabsForStreamDetail,
  ]);

  useEffect(() => {
    if (!selectedMainNavigationTab) {
      setSelectedMainNavigationTab(({
        selectedSubTab,
      }) => ({
        selectedMainNavigationTab: defaultMainNavigationTab || MainNavigationTabEnum.CONFIGURATION,
        selectedMainNavigationTabSub: defaultMainNavigationTabSub,
        selectedSubTab: defaultMainNavigationTab
          ? defaultSubTab || getSubTabForMainNavigationTab(defaultMainNavigationTab)?.[0]?.uuid
          : selectedSubTab,
      }));
    }
  }, [
    defaultMainNavigationTab,
    defaultMainNavigationTabSub,
    defaultSubTab,
    getSubTabForMainNavigationTab,
    selectedMainNavigationTab,
    setSelectedMainNavigationTab,
  ]);

  const subtabs: TabType[] =
    useMemo(() => getSubTabForMainNavigationTab(selectedMainNavigationTab), [
      getSubTabForMainNavigationTab,
      selectedMainNavigationTab,
    ]);

  const before = useMemo(() => {
    const arr = [
      {
        Icon: SettingsWithKnobs,
        uuid: MainNavigationTabEnum.CONFIGURATION,
      },
      // {
      //   Icon: Lightning,
      //   uuid: MainNavigationTabEnum.SYNC,
      // },
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
          onClick={() => setSelectedMainNavigationTab(() => ({
            selectedMainNavigationTab: uuid,
          }))}
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
        block: null,
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
          <Divider key={`block-${buuid}-divider-top`} light />,
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
          <Divider key={`${uuid}-divider-top`} light />,
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
                setSelectedMainNavigationTab(({
                  selectedSubTab,
                }) => ({
                  selectedMainNavigationTab: streamID,
                  selectedMainNavigationTabSub: parentStreamID,
                  selectedSubTab,
                }));
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
          </NavigationStyle>,
        );

        if (idx === streamsCount - 1) {
          arr.push(
            <Divider key={`${uuid}-divider-last`} light />,
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
    streams,
  ]);

  const [streamsFetched, setStreamsFetched] = useState<StreamType[]>(null);

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
  ]: [any, { isLoading: boolean }] = useMutation(
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

            setStreamsFetched(streamsInit);
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

  const subheaderEl = useMemo(() => (
    <div ref={refSubheader}>
      {subtabs?.length >= 1 && (
        <Spacing p={PADDING_UNITS} >
          <ButtonTabs
            noPadding
            onClickTab={({ uuid }) => setSelectedMainNavigationTab(prev => ({
              ...prev,
              selectedSubTab: uuid,
            }))}
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
                beforeIcon={<CubeWithArrowDown size={2 * UNIT} />}
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
  ), [
    fetchIntegrationSource,
    isLoadingFetchIntegrationSource,
    noStreamsAnywhere,
    refSubheader,
    searchText,
    selectedMainNavigationTab,
    selectedSubTab,
    setSearchText,
    setSelectedMainNavigationTab,
    subtabs,
  ]);

  const heightModal = useMemo(() => heightWindow - (MODAL_PADDING * 2), [heightWindow]);
  const widthModal = useMemo(() => widthWindow - (MODAL_PADDING * 2), [widthWindow]);

  const [headerOffset, setHeaderOffset] = useState<number>(null);
  const [afterFooterBottomOffset, setAfterFooterBottomOffset] = useState<number>(null);
  const [afterInnerTopOffset, setAfterInnerTopOffset] = useState<number>(null);

  const [afterHiddenState, setAfterHidden] = useState<boolean>(false);

  useEffect(() => {
    if (selectedMainNavigationTab || selectedSubTab) {
      setHeaderOffset(refSubheader?.current?.getBoundingClientRect()?.height);
      setAfterInnerTopOffset(refAfterHeader?.current?.getBoundingClientRect()?.height);
      setAfterFooterBottomOffset(refAfterFooter?.current?.getBoundingClientRect()?.height);
    }
  }, [
    refAfterFooter,
    refAfterHeader,
    refSubheader,
    selectedMainNavigationTab,
    selectedSubTab,
  ]);

  const [updateBlock, { isLoading: isLoadingUpdateBlock }] = useMutation(
    api.blocks.pipelines.useUpdate(encodeURIComponent(pipelineUUID), encodeURIComponent(blockUUID)),
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

  const isOnStreamsOverview = useMemo(() =>
    MainNavigationTabEnum.OVERVIEW === selectedMainNavigationTab, [
      selectedMainNavigationTab,
    ]);

  const afterHidden: boolean = useMemo(() => {
    if (isOnConfigurationCredentials
      || isOnStreamDetailSchemaProperties
      || (isOnStreamsOverview && streams?.length >= 1)
    ) {
      return afterHiddenState;
    }

    return true;
  }, [
    afterHiddenState,
    isOnConfigurationCredentials,
    isOnStreamDetailSchemaProperties,
    isOnStreamsOverview,
    streams,
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
          height={(heightModal - headerOffset) - (2 * UNIT)}
          highlightedColumnsMapping={highlightedColumnsMapping}
          onChangeBlock={onChangeBlock}
          pipeline={pipeline}
          selectedSubTab={selectedSubTab}
          setBlockAttributes={setBlockAttributes}
          setHighlightedColumnsMapping={setHighlightedColumnsMapping}
          setSelectedSubTab={(subTab: SubTabEnum | string) => setSelectedMainNavigationTab(prev => ({
            ...prev,
            selectedSubTab: subTab,
          }))}
          // @ts-ignore
          setStreamsMappingConflicts={setStreamsMappingConflicts}
          showError={showError}
          stream={stream}
          streamMapping={streamsFromCatalogMapping}
          streamsMappingConflicts={streamsMappingConflicts}
          updateStreamsInCatalog={updateStreamsInCatalog}
        />
      );
    }
  }, [
    blockAttributes,
    blocksMapping,
    headerOffset,
    heightModal,
    highlightedColumnsMapping,
    onChangeBlock,
    pipeline,
    selectedMainNavigationTab,
    selectedMainNavigationTabSub,
    selectedSubTab,
    setBlockAttributes,
    setHighlightedColumnsMapping,
    setSelectedMainNavigationTab,
    setStreamsMappingConflicts,
    showError,
    streamsFromCatalogMapping,
    streamsMappingConflicts,
    updateStreamsInCatalog,
  ]);

  const [blockContentState, setBlockContentState] = useState<string>(null);
  useEffect(() => {
    if (typeof blockContentState === 'undefined' || blockContentState === null) {
      setBlockContentState((typeof blockContentFromBlockProp !== 'undefined'
        && blockContentFromBlockProp !== null
        )
          ? blockContentFromBlockProp
          : blockContentFromBlockAttributes,
      );
    }
  }, [
    blockContentFromBlockAttributes,
    blockContentFromBlockProp,
    blockContentState,
    setBlockContentState,
  ]);

  const [blockConfigString, setBlockConfigString] = useState<string>(null);

  const credentialsMemo = useMemo(() => (
    <Credentials
      block={blockAttributes}
      blockConfigString={blockConfigString}
      blockContent={blockContentState}
      blockUpstreamBlocks={blockUpstreamBlocks}
      dataIntegrationConfiguration={dataIntegrationConfiguration}
      onChangeCodeBlock={onChangeCodeBlock}
      pipeline={pipeline}
      savePipelineContent={savePipelineContent}
      setBlockConfigString={setBlockConfigString}
      setBlockContent={setBlockContentState}
      setContent={setContent}
      setSelectedSubTab={(subTab: SubTabEnum | string) => setSelectedMainNavigationTab(prev => ({
        ...prev,
        selectedSubTab: subTab,
      }))}
      showError={showError}
    />
  ), [
    blockAttributes,
    blockConfigString,
    blockContentState,
    blockUpstreamBlocks,
    dataIntegrationConfiguration,
    onChangeCodeBlock,
    pipeline,
    savePipelineContent,
    setBlockConfigString,
    setBlockContentState,
    setContent,
    setSelectedMainNavigationTab,
    showError,
  ]);

  const mainContentEl = useMemo(() => {
    if (MainNavigationTabEnum.CONFIGURATION === selectedMainNavigationTab) {
      if (SubTabEnum.UPSTREAM_BLOCK_SETTINGS === selectedSubTab) {
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
                            const selected = selectedInputStreams?.includes(stream);

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
                            checked={!!inputSettings?.input_only}
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
          <>
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
                      onClick={() => setSelectedMainNavigationTab(() => ({
                        selectedMainNavigationTab: MainNavigationTabEnum.STREAMS,
                      }))}
                      preventDefault
                      primary
                    >
                      Streams
                    </Link> section.
                  </Text>
                </Spacing>
              )}
            </Spacing>

            <Divider light />

            {rows}
          </>
        );
      }
    } else if (MainNavigationTabEnum.STREAMS === selectedMainNavigationTab && noStreamsAnywhere) {
      return (
        <Spacing p={PADDING_UNITS}>
          <Spacing mb={PADDING_UNITS}>
            <Headline>
              Fetch streams to start set up
            </Headline>

            <Spacing mt={1}>
              <Text default>
                Add streams and configure them by first fetching the available streams
                from {dataIntegrationUUID}.
              </Text>
            </Spacing>
          </Spacing>

          <Button
            beforeIcon={<CubeWithArrowDown size={2 * UNIT} />}
            large
            loading={isLoadingFetchIntegrationSource}
            onClick={() => fetchIntegrationSource()}
            primary
          >
            Fetch streams
          </Button>
        </Spacing>
      );
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
          onChangeBlock={onChangeBlock}
          selectedStreamMapping={selectedStreamMapping}
          setSelectedMainNavigationTab={
            (selectedMainNavigationTab: MainNavigationTabEnum) => setSelectedMainNavigationTab(prev => ({
              selectedMainNavigationTab,
            }))
          }
          setSelectedStreamMapping={setSelectedStreamMapping}
          streamMapping={streamsFromCatalogMapping}
          updateStreamsInCatalog={updateStreamsInCatalog}
        />
      );
    }
  }, [
    blockAttributes,
    blockType,
    blockUUID,
    blockUpstreamBlocks,
    blocksMapping,
    dataIntegrationConfiguration,
    dataIntegrationType,
    dataIntegrationUUID,
    fetchIntegrationSource,
    isLoadingFetchIntegrationSource,
    noStreamsAnywhere,
    onChangeBlock,
    selectedMainNavigationTab,
    selectedStreamMapping,
    selectedSubTab,
    setDataIntegrationConfigurationForInputs,
    setSelectedMainNavigationTab,
    setSelectedStreamMapping,
    streamsFromCatalogMapping,
    updateStreamsInCatalog,
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
          Bulk edit stream properties
        </Text>
      );
    } else if (isOnStreamsOverview) {
      return (
        <Text bold>
          Bulk edit streams
        </Text>
      );
    }
  }, [
    isOnConfigurationCredentials,
    isOnStreamDetailSchemaProperties,
    isOnStreamsOverview,
  ]);

  const afterFooter = useMemo(() => {
    if (isOnStreamDetailSchemaProperties || isOnStreamsOverview) {
      return (
        <AfterFooterStyle ref={refAfterFooter}>
          <Spacing p={PADDING_UNITS}>
            <Spacing mb={PADDING_UNITS}>
              <Checkbox
                checked={clearSelectionAndValues}
                label="Clear selection and values after applying changes"
                onClick={() => setClearSelectionAndValues(prev => !prev)}
              />
            </Spacing>

            <FlexContainer alignItems="center">
              <Button
                fullWidth
                onClick={() => {
                  let streamMappingUpdated: StreamMapping = {
                    noParents: {},
                    parents: {},
                  };

                  if (isOnStreamDetailSchemaProperties) {
                    streamMappingUpdated = updateStreamMappingWithPropertyAttributeValues(
                      selectedStreamMapping,
                      highlightedColumnsMapping,
                      attributesMapping,
                    );
                  } else if (isOnStreamsOverview) {
                    streamMappingUpdated = updateStreamMappingWithStreamAttributes(
                      selectedStreamMapping,
                      attributesMapping,
                    );
                  }

                  updateStreamsInCatalog(
                    getAllStreamsFromStreamMapping(streamMappingUpdated),
                    b => onChangeBlock?.(b),
                  );

                  if (clearSelectionAndValues) {
                    setAttributesMapping({});
                    setHighlightedColumnsMapping({});
                    setSelectedStreamMapping(null);
                  }
                }}
                primary
              >
                Apply bulk changes
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
        </AfterFooterStyle>
      );
    }
  }, [
    attributesMapping,
    clearSelectionAndValues,
    highlightedColumnsMapping,
    isOnStreamDetailSchemaProperties,
    isOnStreamsOverview,
    onChangeBlock,
    refAfterFooter,
    selectedStreamMapping,
    setAttributesMapping,
    setHighlightedColumnsMapping,
    setSelectedStreamMapping,
    updateStreamsInCatalog,
  ]);

  const after = useMemo(() => {
    if (isOnConfigurationCredentials) {
      return (
        <AfterContentStyle>
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
        </AfterContentStyle>
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
          setHighlightedColumnsMapping={setHighlightedColumnsMapping}
          // @ts-ignore
          setSelectedStreamMapping={setSelectedStreamMapping}
          stream={stream}
          streamMapping={streamsFromCatalogMapping}
          updateStreamsInCatalog={updateStreamsInCatalog}
        />
      );
    } else if (isOnStreamsOverview) {
      return (
        <StreamOverviewEditor
          attributesMapping={attributesMapping}
          selectedStreamMapping={selectedStreamMapping}
          setAttributesMapping={setAttributesMapping}
          // @ts-ignore
          setSelectedStreamMapping={setSelectedStreamMapping}
          streamMapping={streamsFromCatalogMapping}
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
    isOnStreamsOverview,
    selectedMainNavigationTab,
    selectedMainNavigationTabSub,
    selectedStreamMapping,
    streamsFromCatalogMapping,
    updateStreamsInCatalog,
  ]);

  const breadcrumbsEl = useMemo(() => {
    const arr: {
      bold?: boolean;
      label: () => string;
    }[] = [
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

  const afterFooterBottom =
    useMemo(() => ((heightWindow - heightModal) - MODAL_VERTICAL_PADDING_TOTAL) / 2, [
      heightModal,
      heightWindow,
    ]);

  const streamGridMemo = useMemo(() => (
    <StreamGrid
      block={blockAttributes}
      blocksMapping={blocksMapping}
      height={heightModal - headerOffset}
      onChangeBlock={onChangeBlock}
      searchText={searchText}
      // @ts-ignore
      setSelectedMainNavigationTab={setSelectedMainNavigationTab}
      setSelectedSubTab={(subTab: SubTabEnum | string) => setSelectedMainNavigationTab(prev => ({
        ...prev,
        selectedSubTab: subTab,
      }))}
      // @ts-ignore
      setStreamsMappingConflicts={setStreamsMappingConflicts}
      streamsFetched={streamsFetched}
      updateStreamsInCatalog={updateStreamsInCatalog}
      width={widthModal - (beforeWidth + (afterHidden ? 0 : afterWidth))}
    />
  ), [
    afterHidden,
    afterWidth,
    beforeWidth,
    blockAttributes,
    blocksMapping,
    headerOffset,
    heightModal,
    onChangeBlock,
    searchText,
    setSelectedMainNavigationTab,
    setStreamsMappingConflicts,
    streamsFetched,
    updateStreamsInCatalog,
    widthModal,
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
              noOutline
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
                onClick={() => {
                  onClose?.();
                }}
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
        afterFooterBottomOffset={afterFooterBottom}
        afterHeader={(
          <Spacing px={1} ref={refAfterHeader}>
            {afterHeader}
          </Spacing>
        )}
        afterHeaderOffset={0}
        afterHeightOffset={0}
        afterHidden={afterHidden}
        afterInnerHeightMinus={
          // After header is always 48
          48 + (afterFooter ? (afterFooterBottomOffset || 0) : 0)
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
        hideAfterCompletely={!after || (isOnStreamsOverview && !streams?.length)}
        inline
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

        {MainNavigationTabEnum.CONFIGURATION === selectedMainNavigationTab
          && SubTabEnum.CREDENTIALS === selectedSubTab
          && credentialsMemo
        }
        {MainNavigationTabEnum.STREAMS === selectedMainNavigationTab
          && !noStreamsAnywhere
          && streamGridMemo
        }
      </TripleLayout>
    </ContainerStyle>
  );
}

export default DataIntegrationModal;
