import { parse, stringify } from 'yaml';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockType, { BlockTypeEnum, BlockLanguageEnum } from '@interfaces/BlockType';
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
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import { Close, DocumentIcon, Lightning, SettingsWithKnobs, Sun } from '@oracle/icons';
import { CodeEditorStyle } from '@components/IntegrationPipeline/index.style';
import {
  ConfigurationDataIntegrationInputsType,
  ConfigurationDataIntegrationType,
} from '@interfaces/ChartBlockType';
import { ContainerStyle, HeaderStyle, MODAL_PADDING, NavigationStyle } from './index.style';
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
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { get, set } from '@storage/localStorage';
import { getSelectedStreams, isStreamSelected } from '@utils/models/block';
import { indexBy, remove } from '@utils/array';
import { ignoreKeys } from '@utils/hash';
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
      include_documentation: boolean;
    } = {
      include_block_catalog: true,
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

  const [afterWidth, setAfterWidth] = useState(get(localStorageKeyAfter, UNIT * 40));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeWidth, setBeforeWidth] = useState(Math.max(
    get(localStorageKeyBefore),
    UNIT * 40,
  ));
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);

  const [selectedMainNavigationTab, setSelectedMainNavigationTabState] =
    useState<MainNavigationTabEnum>();
  const [selectedSubTab, setSelectedSubTab] = useState<SubTabEnum>(null);

  const setSelectedMainNavigationTab = useCallback((prev1) => {
    setSelectedMainNavigationTabState((prev2) => {
      const val1 = typeof prev1 === 'function' ? prev1(prev2) : prev1

      const tabs = val1 in SUB_TABS_BY_MAIN_NAVIGATION_TAB
        ? SUB_TABS_BY_MAIN_NAVIGATION_TAB[val1]
        : SUB_TABS_FOR_STREAM_DETAIL;

      setSelectedSubTab(tabs?.[1]?.uuid);

      return val1;
    });
  }, [
    setSelectedMainNavigationTabState,
    setSelectedSubTab,
  ]);

  useEffect(() => {
    if (!selectedMainNavigationTab) {
      setSelectedMainNavigationTab(MainNavigationTabEnum.CONFIGURATION);
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

    streams?.forEach((stream, idx: number) => {
      const {
        stream: streamID,
        tap_stream_id: tapStreamID,
      } = stream;
      const uuid = tapStreamID || streamID;
      const isSelected = isStreamSelected(stream);

      arr.push(
        <Divider key={`${uuid}-divider-top`} light />
      );

      arr.push(
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
                <Circle
                  size={UNIT * 1}
                  success={isSelected}
                />

                <Spacing mr={2} />

                <Flex flex={1}>
                  <Text large monospace>
                    {uuid}
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

    return (
      <>
        {arr}
      </>
    );
  }, [
    selectedMainNavigationTab,
    setSelectedMainNavigationTab,
    streams,
  ]);

  const subheaderEl = useMemo(() => {
    return (
      <div ref={refSubheader}>
        <Spacing p={PADDING_UNITS} >
          {subtabs?.length >= 1 && (
            <ButtonTabs
              noPadding
              onClickTab={({ uuid }) => setSelectedSubTab(uuid)}
              regularSizeText
              selectedTabUUID={selectedSubTab}
              tabs={subtabs}
            />
          )}

          {!subtabs?.length && MainNavigationTabEnum.STREAMS === selectedMainNavigationTab && (
            <Text>
              Search bar
            </Text>
          )}
        </Spacing>

        <Divider light />
      </div>
    );
  }, [
    refSubheader,
    selectedMainNavigationTab,
    selectedSubTab,
    setSelectedSubTab,
    subtabs,
  ]);

  const [headerOffset, setHeaderOffset] = useState<number>(null);
  useEffect(() => {
    if (selectedMainNavigationTab && refSubheader?.current) {
      setHeaderOffset(refSubheader?.current?.getBoundingClientRect()?.height);
    }
  }, [
    selectedMainNavigationTab,
    refSubheader,
  ]);

  const afterHidden: boolean = useMemo(() => {
    if (MainNavigationTabEnum.CONFIGURATION === selectedMainNavigationTab
      && SubTabEnum.CREDENTIALS === selectedSubTab
    ) {
      return false;
    }

    return true;
  }, [
    selectedMainNavigationTab,
    selectedSubTab,
  ]);

  const blockContentParsed = useMemo(() => {
    if (BlockLanguageEnum.YAML === blockLanguage) {
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

  const mainContentEl = useMemo(() => {
    if (MainNavigationTabEnum.CONFIGURATION === selectedMainNavigationTab) {
      if (SubTabEnum.CREDENTIALS === selectedSubTab) {
        if (BlockLanguageEnum.YAML === blockLanguage) {
          return (
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
          return (
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
                                    <Text monospace small>
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
                              <br />
                              The block’s output data won’t be ingested when running a sync,
                              regardless if it’s enabled in the settings.
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
    }
  }, [
    blockConfig,
    blockContent,
    blockLanguage,
    blockType,
    blockUUID,
    blockUpstreamBlocks,
    blocksMapping,
    dataIntegrationConfiguration,
    dataIntegrationType,
    selectedMainNavigationTab,
    selectedSubTab,
    setBlockConfig,
    setDataIntegrationConfigurationForInputs,
  ]);

  const after = useMemo(() => !afterHidden && (
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
  ), [
    afterHidden,
    dataBlock,
    documentation,
  ]);

  return (
    <ContainerStyle
      maxWidth={widthWindow - (MODAL_PADDING * 2)}
    >
      <HeaderStyle>
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
        >
          <Flex>
            <Text bold>
              {nameDisplay}
            </Text>
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
        afterHeightOffset={0}
        afterHidden={afterHidden}
        afterMousedownActive={afterMousedownActive}
        afterWidth={afterWidth}
        before={before}
        beforeHeightOffset={0}
        beforeMousedownActive={beforeMousedownActive}
        beforeWidth={beforeWidth}
        contained
        headerOffset={headerOffset}
        height={heightWindow - (MODAL_PADDING * 2)}
        hideAfterCompletely
        inline
        mainContainerHeader={subheaderEl}
        mainContainerRef={mainContainerRef}
        setAfterMousedownActive={setAfterMousedownActive}
        setAfterWidth={setAfterWidth}
        setBeforeMousedownActive={setBeforeMousedownActive}
        setBeforeWidth={setBeforeWidth}
      >
        <div style={{ height: 3000 }}>
          {mainContentEl}
        </div>
      </TripleLayout>
    </ContainerStyle>
  );
}

export default DataIntegrationModal;
