import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import Breadcrumbs from '@components/Breadcrumbs';
import BrowserHeader from './BrowserHeader';
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import CacheItemType, { CacheItemTypeEnum } from '@interfaces/CacheItemType';
import Checkbox from '@oracle/elements/Checkbox';
import Divider from '@oracle/elements/Divider';
import FileBrowserNavigation from './FileBrowserNavigation';
import FileBrowserNavigationHeader from './FileBrowserNavigation/Header';
import Flex from '@oracle/components/Flex';
import FlexContainer, { JUSTIFY_SPACE_BETWEEN_PROPS } from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Markdown from '@oracle/components/Markdown';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
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
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { get } from '@storage/localStorage';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy, intersection, remove, sortByKey } from '@utils/array';
import { ignoreKeys, isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';
import { useWindowSize } from '@utils/sizes';

function Browser() {
  const mainContainerRef = useRef(null);
  const refHeaderBefore = useRef(null);

  const componentUUID = useMemo(() => 'dbt/Browser', []);
  const localStorageKeyAfter =
    useMemo(() => `${componentUUID}width_after`, [componentUUID]);
  const localStorageKeyBefore =
    useMemo(() => `${componentUUID}width_before`, [componentUUID]);

  const {
    height: heightWindow,
    width: widthWindow,
  } = useWindowSize();
  console.log(heightWindow)

  const [showError] = useError(null, {}, [], {
    uuid: componentUUID,
  });

  const [afterHidden, setAfterHidden] = useState<boolean>(true);
  const [afterWidth, setAfterWidth] = useState(get(localStorageKeyAfter, UNIT * 60));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeWidth, setBeforeWidth] = useState(Math.max(
    get(localStorageKeyBefore),
    UNIT * 40,
  ));
  const [beforeHeaderHeight, setBeforeHeaderHeight] = useState(null);
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);

  const { data } = api.cache_items.list({
    item_type: CacheItemTypeEnum.DBT,
  });
  const items: CacheItemType[] = useMemo(() => data?.cache_items, [data]);

  const [selectedLink, setSelectedLink] = useState<NavLinkType>(null);
  const [selectedTab, setSelectedTab] = useState<TabType>(null);

  const after = useMemo(() => {

  }, [
  ]);

  useEffect(() => {
    setTimeout(() => {
      setBeforeHeaderHeight(refHeaderBefore?.current?.getBoundingClientRect()?.height);
    }, 1);
  }, []);

  return (
    <>
      <TripleLayout
        after={after}
        // afterFooter={afterFooter}
        // afterFooterBottomOffset={afterFooterBottom}
        // afterHeader={(
        //   <Spacing px={1} ref={refAfterHeader}>
        //     {afterHeader}
        //   </Spacing>
        // )}
        afterHeaderOffset={0}
        afterHeightOffset={0}
        afterHidden={afterHidden}
        // afterInnerHeightMinus={
        //   // After header is always 48
        //   48 + (afterFooter ? (afterFooterBottomOffset || 0) : 0)
        // }
        afterMousedownActive={afterMousedownActive}
        afterWidth={afterWidth}
        before={(
          <FileBrowserNavigation
            selectedLink={selectedLink}
            selectedTab={selectedTab}
            setSelectedLink={setSelectedLink}
          />
        )}
        beforeHeader={(
          <div ref={refHeaderBefore}>
            <FileBrowserNavigationHeader
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
            />
          </div>
        )}
        beforeHeightOffset={0}
        beforeContentHeightOffset={beforeHeaderHeight}
        beforeMousedownActive={beforeMousedownActive}
        beforeWidth={beforeWidth}
        contained
        headerOffset={HEADER_HEIGHT}
        height={heightWindow}
        // hideAfterCompletely={!after || (isOnStreamsOverview && !streams?.length)}
        inline
        // mainContainerHeader={subheaderEl}
        mainContainerHeader={(
          <BrowserHeader
            blockType={selectedLink?.uuid as BlockTypeEnum}
            selectedTab={selectedTab}
          />
        )}
        mainContainerRef={mainContainerRef}
        setAfterHidden={setAfterHidden}
        setAfterMousedownActive={setAfterMousedownActive}
        setAfterWidth={setAfterWidth}
        setBeforeMousedownActive={setBeforeMousedownActive}
        setBeforeWidth={setBeforeWidth}
        uuid={componentUUID}
      >

      </TripleLayout>
    </>
  );
}

export default Browser;
