import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parse, stringify } from 'yaml';

import BlockType, { BlockTypeEnum, BlockLanguageEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Circle from '@oracle/elements/Circle';
import CodeEditor from '@components/CodeEditor';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Markdown from '@oracle/components/Markdown';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import { Close, DocumentIcon, Lightning, SettingsWithKnobs, Sun } from '@oracle/icons';
import { CodeEditorStyle } from '@components/IntegrationPipeline/index.style';
import { ContainerStyle, HeaderStyle, MODAL_PADDING, NavigationStyle } from './index.style';
import { DataIntegrationTypeEnum } from '@interfaces/BlockTemplateType';
import {
  MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING,
  MainNavigationTabEnum,
  SUB_TABS_BY_MAIN_NAVIGATION_TAB,
  SUB_TABS_FOR_STREAM_DETAIL,
  SubTabEnum,
} from './constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { get, set } from '@storage/localStorage';
import { getSelectedStreams, isStreamSelected } from '@utils/models/block';
import { useWindowSize } from '@utils/sizes';

type DataIntegrationModal = {
  block: BlockType;
  onChangeCodeBlock?: (type: string, uuid: string, value: string) => void;
  onClose?: () => void;
  pipeline: PipelineType;
};

function DataIntegrationModal({
  block,
  onChangeCodeBlock,
  onClose,
  pipeline,
}) {
  const mainContainerRef = useRef(null);
  const refSubheader = useRef(null);

  const {
    height: heightWindow,
    width: widthWindow,
  } = useWindowSize();

  const {
    uuid: pipelineUUID,
  } = pipeline || {};

  const {
    content: blockContent,
    language: blockLanguage,
    metadata,
    type: blockType,
    uuid: blockUUID,
  } = block || {};

  const streams = useMemo(() => getSelectedStreams(block, { getAll: true }), [
    block,
  ]);

  const {
    destination,
    name: nameDisplay,
    source,
  } = useMemo(() => metadata?.data_integration || {}, [metadata]);
  const dataIntegrationUUID = useMemo(() => destination || source || null, [destination, source]);
  const dataIntegrationType = useMemo(() => BlockTypeEnum.DATA_LOADER === blockType
    ? DataIntegrationTypeEnum.SOURCES
    : DataIntegrationTypeEnum.DESTINATIONS,
  [
    blockType,
  ]);

  const componentUUID = useMemo(() => `DataIntegrationModal/${blockUUID}`, blockUUID);
  const localStorageKeyAfter =
    useMemo(() => `block_layout_after_width_${componentUUID}`, [componentUUID]);
  const localStorageKeyBefore =
    useMemo(() => `block_layout_before_width_${componentUUID}`, [componentUUID]);

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

      setSelectedSubTab(tabs?.[0]?.uuid);

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
      }
    }
  }, [
    blockConfig,
    blockContent,
    blockLanguage,
    blockType,
    blockUUID,
    selectedMainNavigationTab,
    selectedSubTab,
    setBlockConfig,
  ]);

  const blockDetailQuery: {
    data_integration_type: string;
    data_integration_uuid?: string;
  } = useMemo(() => {
    const query: {
      data_integration_type: string;
      data_integration_uuid?: string;
    } = {
      data_integration_type: dataIntegrationType,
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
    !afterHidden && dataIntegrationType && blockUUID,
    {
      ...blockDetailQuery,
      include_documentation: true,
    },
    {},
    {
      key: `pipelines/${pipelineUUID}/blocks/${block}/documentation`,
    }
  );
  const blockServer = useMemo(() => dataBlock?.block || {}, [dataBlock]);
  const documentation = useMemo(() => blockServer?.documentation, [blockServer]);

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
