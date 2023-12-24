import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import BlocksDetails from './BlocksDetails';
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
import GroupsOfBlocks from './GroupsOfBlocks';
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
import {
  FileContextTab,
  NAV_LINKS,
  NavLinkUUIDEnum,
  TABS_MAPPING,
} from './FileBrowserNavigation/constants';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { MainStyle } from './index.style';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { get } from '@storage/localStorage';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { handleNavigateBack } from './FileBrowserNavigation/utils';
import { indexBy, intersection, remove, sortByKey } from '@utils/array';
import { ignoreKeys, isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';
import { useWindowSize } from '@utils/sizes';

type BrowserProps = {
  onClickAction?: (opts?: {
    cacheItem: CacheItemType;
    row?: {
      directory?: string;
      filePath?: string;
      name?: string;
    };
  }) => void;
};

function Browser({
  onClickAction,
}: BrowserProps) {
  const mainContainerRef = useRef(null);
  const refHeaderBefore = useRef(null);
  const refSearch = useRef(null);
  const refCacheItems = useRef({});
  const refCacheItemsFiltered = useRef({});
  const refSearchText = useRef(null);

  const componentUUID = useMemo(() => 'dbt/Browser', []);
  const localStorageKeyAfter =
    useMemo(() => `${componentUUID}width_after`, [componentUUID]);
  const localStorageKeyBefore =
    useMemo(() => `${componentUUID}width_before`, [componentUUID]);

  const {
    height: heightWindow,
    width: widthWindow,
  } = useWindowSize();

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
  const [mainContainerHeight, setMainContainerHeight] = useState(null);

  const { data } = api.cache_items.list({
    item_type: CacheItemTypeEnum.DBT,
  });
  const cacheItems = useMemo(() => data?.cache_items || [], [data]);

  const setSearchText = useCallback((value: string) => {
    refSearchText.current = value;
    refCacheItemsFiltered.current = {};

    cacheItems?.forEach((cacheItem) => {
      if (CacheItemTypeEnum.DBT === cacheItem?.item_type) {
        const node = refCacheItems?.current?.[cacheItem?.uuid];

        const models = cacheItem?.item?.models?.filter((
          modelName: string,
        ) => {
          const match = !refSearchText.current?.length
            || modelName?.toLowerCase()?.replaceAll('_', ' ')?.replaceAll('-', ' ')?.includes(
              refSearchText.current,
            );

          if (node) {
            const node2 = node?.[modelName];

            if (node2?.current) {
              if (match) {
                const classNames = (node2?.current?.className || '')?.split(' ') || [];
                node2.current.className =
                  // @ts-ignore
                  classNames?.filter(cn => !['hide', 'show'].includes(cn)).concat('show')?.join(' ');
              } else {
                const classNames = (node2?.current?.className || '')?.split(' ') || [];
                node2.current.className =
                  // @ts-ignore
                  classNames?.filter(cn => !['hide', 'show'].includes(cn)).concat('hide')?.join(' ');
              }
            }
          }

          return match;
        });

        if (models?.length >= 1) {
          refCacheItemsFiltered.current[cacheItem.uuid] = {
            ...(cacheItem || {}),
            item: {
              ...(cacheItem.item || {}),
              models,
            },
          };

          if (node?.cacheItem?.current) {
            const classNames = (node?.cacheItem?.current?.className || '')?.split(' ') || [];
            node.cacheItem.current.className =
              // @ts-ignore
              classNames?.filter(cn => !['hide', 'show'].includes(cn)).concat('show')?.join(' ');
          }
        } else {
          if (node?.cacheItem?.current) {
            const classNames = (node?.cacheItem?.current?.className || '')?.split(' ') || [];
            node.cacheItem.current.className =
              // @ts-ignore
              classNames?.filter(cn => !['hide', 'show'].includes(cn)).concat('hide')?.join(' ');
          }
        }
      }
    });
  }, [cacheItems]);

  const [selectedLinks, setSelectedLinksState] = useState<NavLinkType[]>(null);
  const [selectedTab, setSelectedTabState] = useState<TabType>(null);

  const setSelectedLinks = useCallback((prev) => {
    setSelectedLinksState(prev);
    setSearchText(null);
    if (refSearch?.current) {
      refSearch.current.value = '';
    }
  }, [setSearchText]);
  const setSelectedTab = useCallback((prev) => {
    setSelectedTabState(prev);
    setSearchText(null);
    if (refSearch?.current) {
      refSearch.current.value = '';
    }
  }, [setSearchText]);

  const selectedItem = useMemo(() => {
    const uuids = selectedLinks?.slice(0, 2)?.map(({ uuid }) => uuid);

    return cacheItems?.find(({
      item,
    }) => uuids?.includes(item?.project?.uuid));
  }, [
    cacheItems,
    selectedLinks,
  ]);

  useEffect(() => {
    if (selectedItem) {
      setAfterHidden(false);
    } else {
      setAfterHidden(true);
    }
  }, [selectedItem]);

  const after = useMemo(() => {
    return (
      <BlocksDetails
        cacheItems={cacheItems}
        selectedLinks={selectedLinks}
      />
    );
  }, [
    cacheItems,
    selectedLinks,
  ]);

  const navigateBack = useCallback((numberOfSteps: number = null) => {
    setSelectedLinks(prev => handleNavigateBack(numberOfSteps, prev));
  }, [
    selectedLinks,
    setSelectedLinks,
    setSelectedTab,
  ]);

  const mainContentMemo = useMemo(() => {
    return (
      <MainStyle>
        <GroupsOfBlocks
          cacheItems={cacheItems}
          mainContainerHeight={mainContainerHeight}
          onClickAction={onClickAction}
          refCacheItems={refCacheItems}
          selectedItem={selectedItem}
          selectedLinks={selectedLinks}
          setSelectedLinks={setSelectedLinks}
        />
      </MainStyle>
    );
  }, [
    cacheItems,
    mainContainerHeight,
    onClickAction,
    selectedItem,
    selectedLinks,
    setSelectedLinks,
  ]);

  useEffect(() => {
    setTimeout(() => {
      setBeforeHeaderHeight(refHeaderBefore?.current?.getBoundingClientRect()?.height);
      setMainContainerHeight(mainContainerRef?.current?.getBoundingClientRect()?.height);
    }, 1);
  }, []);

  return (
    <>
      <TripleLayout
        after={after}
        afterDividerContrast
        afterHeightOffset={0}
        afterHidden={afterHidden}
        afterInnerHeightMinus={beforeHeaderHeight}
        afterMousedownActive={afterMousedownActive}
        afterWidth={afterWidth}
        before={(
          <FileBrowserNavigation
            cacheItems={cacheItems}
            selectedLinks={selectedLinks}
            selectedTab={selectedTab}
            setSelectedLinks={setSelectedLinks}
          />
        )}
        beforeDividerContrast
        beforeHeader={(
          <div ref={refHeaderBefore}>
            {selectedLinks?.length >= 1
              ? (
                <BrowserHeader
                  navigateBack={navigateBack}
                  selectedLinks={selectedLinks}
                  selectedTab={selectedTab}
                />
              )
              : (
                <FileBrowserNavigationHeader
                  selectedTab={selectedTab}
                  setSelectedTab={setSelectedTab}
                />
              )
            }
          </div>
        )}
        beforeHeightOffset={0}
        beforeContentHeightOffset={beforeHeaderHeight}
        beforeMousedownActive={beforeMousedownActive}
        beforeWidth={beforeWidth}
        contained
        headerOffset={HEADER_HEIGHT}
        height={heightWindow}
        hideAfterCompletely={!selectedItem}
        inline
        mainContainerHeader={(
          <>
            <BrowserHeader
              navigateBack={navigateBack}
              selectedTab={selectedLinks?.length >= 2
                ? selectedLinks?.[1]
                : null
              }
            >
              <TextInput
                afterIcon={refSearchText.current ? <Close /> : null}
                afterIconClick={() => {
                  refSearch?.current?.focus();
                }}
                beforeIcon={<Search />}
                compact
                fullWidth
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search a file..."
                small
                ref={refSearch}
              />
            </BrowserHeader>

            <Divider light />
          </>
        )}
        mainContainerRef={mainContainerRef}
        setAfterHidden={setAfterHidden}
        setAfterMousedownActive={setAfterMousedownActive}
        setAfterWidth={setAfterWidth}
        setBeforeMousedownActive={setBeforeMousedownActive}
        setBeforeWidth={setBeforeWidth}
        uuid={componentUUID}
      >
        {mainContentMemo}
      </TripleLayout>
    </>
  );
}

export default Browser;
