import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import AutocompleteDropdown from '@components/AutocompleteDropdown';
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
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
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
  Database,
  DocumentIcon,
  Search,
  SettingsWithKnobs,
  Sun,
  Table as TableIcon,
} from '@oracle/icons';
import { ContainerStyle, MODAL_PADDING } from '@components/DataIntegrationModal/index.style';
import { DropdownStyle, RowStyle, SearchStyle } from '@components/PipelineDetail/AddNewBlocks/v2/index.style';
import {
  FileContextTab,
  NAV_LINKS,
  NavLinkUUIDEnum,
  TABS_MAPPING,
} from './FileBrowserNavigation/constants';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { ItemType, RenderItemProps } from '@components/AutocompleteDropdown/constants';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_ESCAPE,
  KEY_CODE_FORWARD_SLASH,
  KEY_CODE_META,
  KEY_SYMBOL_FORWARD_SLASH,
  KEY_SYMBOL_META,
} from '@utils/hooks/keyboardShortcuts/constants';
import { MainStyle } from './index.style';
import { NavLinkType } from '@components/CustomTemplates/BrowseTemplates/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { buildModels } from'./utils';
import { buildNavLinkModels, buildNavLinks, handleNavigateBack } from './FileBrowserNavigation/utils';
import { get } from '@storage/localStorage';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { indexBy, intersection, remove, sortByKey } from '@utils/array';
import { ignoreKeys, isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';
import { useWindowSize } from '@utils/sizes';

type BrowserProps = {
  contained?: boolean;
  defaultBlockType?: BlockTypeEnum;
  focused?: boolean;
  onClickAction?: (opts?: {
    cacheItem: CacheItemType;
    row?: {
      directory?: string;
      filePath?: string;
      fullPath?: string;
      name?: string;
    };
  }) => void;
  setFocused?: (focused: boolean) => void;
};

function Browser({
  contained,
  defaultBlockType,
  focused: focusedProp,
  onClickAction,
  setFocused: setFocusedProp,
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

  const [sizes, setSizes] = useState<{
    height: number;
    width: number;
  }>({
    height: null,
    width: null,
  });

  useEffect(() => {
    setSizes({
      height: heightWindow - (MODAL_PADDING * 2),
      width: widthWindow - (MODAL_PADDING * 2),
    });
  }, [
    heightWindow,
    widthWindow,
  ]);

  const [showError] = useError(null, {}, [], {
    uuid: componentUUID,
  });

  const [focusedState, setFocusedState] = useState<boolean>(false);
  const setFocused = useCallback((value: boolean) => {
    if (setFocusedProp && typeof focusedProp !== "undefined") {
      setFocusedProp?.(value);
    } else {
      setFocusedState(value);
    }
  }, [
    focusedProp,
    setFocusedProp,
  ]);
  const focused = useMemo(() => typeof focusedProp === 'undefined'
    ? focusedState
    : focusedProp
  , [
    focusedProp,
    focusedState,
  ]);

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

  const [searchText, setSearchTextState] = useState(null);
  const setSearchText = useCallback((value: string) => {
    setSearchTextState(value);
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
    if (defaultBlockType) {
      setSelectedTabState(TABS_MAPPING[FileContextTab.BLOCKS]);
      setSelectedLinks([
        NAV_LINKS?.find(({
          uuid,
        }) => ((uuid as unknown) as BlockTypeEnum) === defaultBlockType),
      ]);
    }
  }, []);

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

  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => unregisterOnKeyDown(componentUUID), [
    unregisterOnKeyDown,
    componentUUID,
  ]);

  registerOnKeyDown?.(componentUUID, (event, keyMapping) => {
    if (focused) {
      if (keyMapping[KEY_CODE_ESCAPE]) {
        setFocused(false);
        refSearch?.current?.blur();
      }
    }

    if (
      onlyKeysPresent([KEY_CODE_META, KEY_CODE_FORWARD_SLASH], keyMapping)
        || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_FORWARD_SLASH], keyMapping)
    ) {
      event.preventDefault();
      refSearch?.current?.focus();
    }
  }, [
    focused,
    setFocused,
  ]);

  const autocompleteItems: ItemType[] = useMemo(() => {
    const arr = [];

    cacheItems?.forEach((cacheItem) => {
      buildModels({
        models: cacheItem?.item?.models || [],
        project: cacheItem?.item?.project,
      })?.forEach((model) => {
        const itemObject = {
          cacheItem,
          model,
        };

        arr.push({
          itemObject,
          searchQueries: [
            model?.fullPath,
            model?.fullPath?.toLowerCase()?.replaceAll('_', ' ')?.replaceAll('-', ' '),
            model?.name,
            model?.name?.toLowerCase()?.replaceAll('_', ' ')?.replaceAll('-', ' '),
          ],
          value: model?.fullPath,
        });
      });
    });

    return arr;
  }, [cacheItems]);

  return (
    <ContainerStyle maxWidth={contained ? sizes?.width : null}>
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
        beforeContentHeightOffset={beforeHeaderHeight}
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
        beforeMousedownActive={beforeMousedownActive}
        beforeWidth={beforeWidth}
        contained
        headerOffset={HEADER_HEIGHT}
        height={contained ? sizes?.height : heightWindow}
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
              <SearchStyle>
                <TextInput
                  afterIcon={(
                    <KeyboardTextGroup
                      addPlusSignBetweenKeys
                      disabled
                      keyTextGroups={[[KEY_SYMBOL_META, KEY_SYMBOL_FORWARD_SLASH]]}
                    />
                  )}
                  afterIconClick={() => {
                    refSearch?.current?.focus();
                  }}
                  beforeIcon={<Search />}
                  compact
                  fullWidth
                  onBlur={() => setTimeout(() => setFocused(false), 150)}
                  onChange={e => setSearchText(e.target.value)}
                  onFocus={() => setFocused(true)}
                  placeholder="Search a file..."
                  primary
                  ref={refSearch}
                  small
                />

                <DropdownStyle
                  maxHeight={UNIT * 100}
                  topOffset={refSearch?.current?.getBoundingClientRect().height}
                >
                  <AutocompleteDropdown
                    itemGroups={[
                      {
                        items: focused ? autocompleteItems : [],
                        renderItem: (
                          {
                            itemObject: {
                              cacheItem,
                              model,
                            },
                          }: ItemType,
                          opts: RenderItemProps,
                        ) => {
                          const {
                            filePath,
                            project,
                          } = model;
                          const Icon = Database;

                          return (
                            <RowStyle
                              {...opts}
                              onClick={(e) => {
                                pauseEvent(e);
                                opts?.onClick?.(e);
                              }}
                            >
                              <Flex
                                alignItems="center"
                                flex={1}
                                justifyContent="space-between"
                              >
                                <FlexContainer alignItems="center">
                                  <Icon default />

                                  <Spacing mr={1} />

                                  <Text default monospace overflowWrap small textOverflow>
                                    {filePath}
                                  </Text>
                                </FlexContainer>

                                <FlexContainer alignItems="center">
                                  <Spacing mr={1} />

                                  <Text monospace muted overflowWrap small textOverflow>
                                    {project?.name}
                                  </Text>
                                </FlexContainer>
                              </Flex>
                            </RowStyle>
                          );
                        },
                      },
                    ]}
                    maxResults={12}
                    onSelectItem={({
                      itemObject,
                    }: ItemType) => {
                      const arr = [];
                      const cacheItem =  itemObject?.cacheItem;

                      if (CacheItemTypeEnum.DBT === cacheItem?.item_type) {
                        arr.push(buildNavLinkModels([itemObject?.model])?.[0]);
                        arr.push(buildNavLinks(cacheItems)?.find(({
                          uuid,
                        }) => uuid === cacheItem?.item?.project?.uuid));
                        arr.push(NAV_LINKS?.find(({
                          uuid,
                        }) => ((uuid as unknown) as BlockTypeEnum) === BlockTypeEnum.DBT));
                      }

                      setSelectedLinks(arr);
                      setSearchText(null);
                      setFocused(false);
                      refSearch?.current?.blur();
                    }}
                    searchQuery={searchText}
                    uuid={`${componentUUID}/AutocompleteDropdown`}
                  />
                </DropdownStyle>
              </SearchStyle>
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
    </ContainerStyle>
  );
}

export default Browser;
