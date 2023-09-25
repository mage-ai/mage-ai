import { useMemo, useRef, useState } from 'react';

import BlockType from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Circle from '@oracle/elements/Circle';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TripleLayout from '@components/TripleLayout';
import { Close, DocumentIcon, Lightning, SettingsWithKnobs } from '@oracle/icons';
import { ContainerStyle, HeaderStyle, MODAL_PADDING, NavigationStyle } from './index.style';
import { MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING, MainNavigationTabEnum } from './constants';
import { getSelectedStreams, isStreamSelected } from '@utils/models/block';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { get, set } from '@storage/localStorage';
import { useWindowSize } from '@utils/sizes';

type DataIntegrationModal = {
  block: BlockType;
  onClose?: () => void;
  pipeline: PipelineType;
};

function DataIntegrationModal({
  block,
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
    metadata,
    uuid: blockUUID,
  } = block || {};

  const streams = useMemo(() => getSelectedStreams(block, { getAll: true }), [
    block,
  ]);

  const {
    name: nameDisplay,
  } = useMemo(() => metadata?.data_integration || {}, [metadata]);

  const componentUUID = useMemo(() => `DataIntegrationModal/${blockUUID}`, blockUUID);
  const localStorageKeyAfter =
    useMemo(() => `block_layout_after_width_${componentUUID}`, [componentUUID]);
  const localStorageKeyBefore =
    useMemo(() => `block_layout_before_width_${componentUUID}`, [componentUUID]);

  const [afterWidth, setAfterWidth] = useState(get(localStorageKeyAfter, UNIT * 40));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeWidth, setBeforeWidth] = useState(Math.max(
    get(localStorageKeyBefore),
    UNIT * 50,
  ));
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);

  const [selectedMainNavigationTab, setSelectedMainNavigationTab] =
    useState<MainNavigationTabEnum>(MainNavigationTabEnum.CONFIGURATION);

  const before = useMemo(() => {
    const arr = [
      {
        Icon: SettingsWithKnobs,
        uuid: MainNavigationTabEnum.CONFIGURATION,
      },
      {
        Icon: Lightning,
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

  const after = useMemo(() => {
    return (
      <>
        <Headline>
          After
        </Headline>
        <Headline>
          After
        </Headline>
        <Headline>
          After
        </Headline>
        <Headline>
          After
        </Headline>
        <Headline>
          After
        </Headline>
        <Headline>
          After
        </Headline>
        <Headline>
          After
        </Headline>
        <Headline>
          After
        </Headline>
      </>
    );
  }, [
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
        afterMousedownActive={afterMousedownActive}
        afterWidth={afterWidth}
        before={before}
        beforeHeightOffset={0}
        beforeMousedownActive={beforeMousedownActive}
        beforeWidth={beforeWidth}
        contained
        height={heightWindow - (MODAL_PADDING * 2)}
        inline
        mainContainerRef={mainContainerRef}
        setAfterMousedownActive={setAfterMousedownActive}
        setAfterWidth={setAfterWidth}
        setBeforeMousedownActive={setBeforeMousedownActive}
        setBeforeWidth={setBeforeWidth}
      >
        <div ref={refSubheader}>

        </div>
        <Headline>
          Main
        </Headline>
      </TripleLayout>
    </ContainerStyle>
  );
}

export default DataIntegrationModal;
