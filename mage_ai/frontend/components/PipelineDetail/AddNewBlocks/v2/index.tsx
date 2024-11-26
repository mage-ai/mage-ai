import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import AutocompleteDropdown from '@components/AutocompleteDropdown';
import BlockActionObjectType, { ObjectType } from '@interfaces/BlockActionObjectType';
import ButtonItems, { ButtonItemsProps } from './ButtonItems';
import ClickOutside from '@oracle/components/ClickOutside';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import ProjectType from '@interfaces/ProjectType';
import SearchResultType, { SearchResultTypeEnum } from '@interfaces/SearchResultType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import {
  ABBREV_BLOCK_LANGUAGE_MAPPING,
} from '@interfaces/BlockType';
import {
  AISparkle,
  AlertTriangle,
  BlockCubePolygon,
  File as FileIcon,
  TemplateShapes,
} from '@oracle/icons';
import { BLOCK_TYPE_ICON_MAPPING } from '@components/CustomTemplates/BrowseTemplates/constants';
import {
  ContainerStyle,
  DividerStyle,
  DropdownStyle,
  ICON_SIZE,
  RowStyle,
  SearchStyle,
  TextInputFocusAreaStyle,
} from './index.style';
import { ItemType, RenderItemProps } from '@components/AutocompleteDropdown/constants';
import {
  KEY_SYMBOL_FORWARD_SLASH,
  KEY_SYMBOL_META,
  KEY_CODE_ESCAPE,
} from '@utils/hooks/keyboardShortcuts/constants';
import { LOCAL_STORAGE_KEY_SETUP_AI_LATER } from '@storage/constants';
import { UNITS_BETWEEN_SECTIONS, UNIT } from '@oracle/styles/units/spacing';
import { get, set } from '@storage/localStorage';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';

// WORKING ON storing a user clicking setup later on the project modal

type AddNewBlocksV2Props = {
  focused?: boolean;
  project?: ProjectType;
  searchTextInputRef?: any;
  setFocused?: (focused: boolean) => void;
  showConfigureProjectModal?: (opts: {
    cancelButtonText?: string;
    header?: any;
    onCancel?: () => void;
    onSaveSuccess?: (project: ProjectType) => void;
  }) => void;
} & ButtonItemsProps;

function AddNewBlocksV2({
  addNewBlock,
  blockIdx,
  blockTemplatesByBlockType,
  compact,
  focused: focusedProp,
  itemsDBT,
  pipelineType,
  project,
  searchTextInputRef,
  setAddNewBlockMenuOpenIdx,
  setFocused: setFocusedProp,
  showBrowseTemplates,
  showConfigureProjectModal,
  showGlobalDataProducts,
}: AddNewBlocksV2Props) {
  const timeoutRef = useRef(null);
  const refTextInputInit = useRef(null);
  const refTextInput =
    typeof searchTextInputRef !== 'undefined' ? searchTextInputRef : refTextInputInit;

  const componentUUID = useMemo(() => `AddNewBlocksV2/${blockIdx}`, [blockIdx]);
  const [showError] = useError(null, {}, [], {
    uuid: `AddNewBlocksV2/${blockIdx}`,
  });

  const [buttonMenuOpenIndex, setButtonMenuOpenIndex] = useState<number>(null);
  const closeButtonMenu = useCallback(() => setButtonMenuOpenIndex(null), []);

  const [focusedState, setFocusedState] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(null);
  const [searchResult, setSearchResult] = useState<SearchResultType>(null);
  const [setupAILater, setSetupAILaterState] = useState<boolean>(null);
  const setSetupAILater = useCallback((val: boolean) => {
    setSetupAILaterState(val);
    set(LOCAL_STORAGE_KEY_SETUP_AI_LATER, val);
  }, []);

  useEffect(() => {
    if (setupAILater === null) {
      const val = get(LOCAL_STORAGE_KEY_SETUP_AI_LATER, false);
      setSetupAILater(val);
    }
  }, [
    setSetupAILater,
    setupAILater,
  ]);

  const focused = useMemo(() => {
    if (typeof focusedProp !== 'undefined') {
      return focusedProp;
    }

    return focusedState;
  }, [
    focusedProp,
    focusedState,
  ]);

  const setFocused = useCallback((prev) => {
    if (typeof setFocusedProp !== 'undefined') {
      return setFocusedProp(prev);
    }

    return setFocusedState(prev);
  }, [
    setFocusedProp,
    setFocusedState,
  ]);

  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => unregisterOnKeyDown(componentUUID), [
    unregisterOnKeyDown,
    componentUUID,
  ]);

  registerOnKeyDown?.(
    componentUUID,
    (event, keyMapping) => {
      if (focused) {
        if (keyMapping[KEY_CODE_ESCAPE]) {
          setFocused(false);
          refTextInput?.current?.blur();
        }
      }
    },
    [
      focused,
    ],
  );

  const [createSearchResult] = useMutation(
    api.search_results.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            search_result: sr,
          }) => {
            setSearchResult(sr);
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const onUserTyping = useCallback((e) => {
    clearTimeout(timeoutRef.current);

    const val = e.target.value;
    setInputValue(val);

    if (!val) {
      setSearchResult(null);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      // @ts-ignore
      createSearchResult({
        search_result: {
          pipeline_type: pipelineType,
          query: val,
          type: SearchResultTypeEnum.BLOCK_ACTION_OBJECTS,
        },
      });
    }, 300);
  }, [
    createSearchResult,
    pipelineType,
    timeoutRef,
  ]);

  const results: BlockActionObjectType[] =
    useMemo(() => searchResult?.results || [], [searchResult]);
  const autocompleteItems = useMemo(() => {
    const q = searchResult?.uuid;

    const arr = results?.map((blockActionObject: BlockActionObjectType) => ({
      itemObject: blockActionObject,
      searchQueries: [q],
      value: blockActionObject?.uuid,
    }));

    if (q) {
      const generateBlock = {
        itemObject: {
          description: q,
          object_type: ObjectType.GENERATE_BLOCK,
          title: 'Generate block using AI (beta)',
        },
        searchQueries: [q],
        value: 'generate_block',
      };
      if (setupAILater) {
        // @ts-ignore
        arr.push(generateBlock);
      } else {
        // @ts-ignore
        arr.unshift(generateBlock);
      }
    }

    return arr;
  }, [
    results,
    searchResult,
    setupAILater,
  ]);

  const focusArea = useMemo(() => (
    <TextInputFocusAreaStyle
      compact={compact}
      onClick={() => refTextInput?.current?.focus()}
    />
  ), [
    compact,
    refTextInput,
  ]);

  const hasOpenAIAPIKey = useMemo(() => !!project?.openai_api_key, [project]);

  return (
    <ClickOutside
      onClickOutside={closeButtonMenu}
      open
    >
      <ContainerStyle compact={compact} focused={focused}>
        <FlexContainer
          alignItems="center"
        >
          <Flex>
            <ButtonItems
              addNewBlock={addNewBlock}
              blockIdx={blockIdx}
              blockTemplatesByBlockType={blockTemplatesByBlockType}
              buttonMenuOpenIndex={buttonMenuOpenIndex}
              closeButtonMenu={closeButtonMenu}
              compact={compact}
              itemsDBT={itemsDBT}
              pipelineType={pipelineType}
              setAddNewBlockMenuOpenIdx={setAddNewBlockMenuOpenIdx}
              setButtonMenuOpenIndex={setButtonMenuOpenIndex}
              showBrowseTemplates={showBrowseTemplates}
              showGlobalDataProducts={showGlobalDataProducts}
            />
          </Flex>

          <DividerStyle />

          <Spacing mr={3} />

          <Flex flex={1}>
            <SearchStyle>
              {focusArea}
              <FlexContainer alignItems="center" fullWidth>
                <TextInput
                  fullWidth
                  noBackground
                  noBorder
                  noBorderRadiusBottom
                  noBorderRadiusTop
                  // Need setTimeout because when clicking a row, the onBlur will be triggered.
                  // If the onBlur triggers too soon, clicking a row does nothing.
                  onBlur={() => setTimeout(() => setFocused(false), 150)}
                  onChange={onUserTyping}
                  onFocus={() => setFocused(true)}
                  paddingHorizontal={0}
                  paddingVertical={0}
                  placeholder="Search for a block..."
                  ref={refTextInput}
                  value={inputValue || ''}
                />
                <KeyboardTextGroup
                  addPlusSignBetweenKeys
                  disabled
                  keyTextGroups={[[KEY_SYMBOL_META, KEY_SYMBOL_FORWARD_SLASH]]}
                />
              </FlexContainer>
              {focusArea}

              <DropdownStyle
                topOffset={refTextInput?.current?.getBoundingClientRect().height + (
                  compact
                    ? 1.5 * UNIT
                    : 2.5 * UNIT
                )}
              >
                <AutocompleteDropdown
                  eventProperties={{
                    eventParameters: { item_type: 'block_search' },
                  }}
                  itemGroups={[
                    {
                      items: focused ? autocompleteItems : [],
                      renderItem: (
                        {
                          itemObject: blockActionObject,
                        }: ItemType,
                        opts: RenderItemProps,
                      ) => {
                        const {
                          block_type: blockType,
                          description,
                          language,
                          object_type: objectType,
                          title,
                        } = blockActionObject;

                        const iconProps: {
                          default?: boolean;
                          fill?: string;
                          size: number;
                          warning?: boolean;
                        } = {
                          fill: getColorsForBlockType(blockType).accent,
                          size: ICON_SIZE,
                        };
                        let Icon = BLOCK_TYPE_ICON_MAPPING[blockType];

                        const isGenerateBlock = ObjectType.GENERATE_BLOCK === objectType;
                        if (isGenerateBlock) {
                          Icon = AISparkle;
                          iconProps.default = false;
                          iconProps.fill = null;
                          iconProps.warning = true;
                        }

                        const displayText =
                          `${title}${description ? ': ' + description : ''}`.slice(0, 80);

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
                            >
                              {Icon && <Icon default={!iconProps?.fill} {...iconProps} />}

                              <Spacing mr={2} />

                              <Text default overflowWrap textOverflow>
                                {displayText}
                              </Text>
                            </Flex>

                            <Spacing mr={1} />

                            <Text monospace muted uppercase>
                              {isGenerateBlock ? 'AI' : ABBREV_BLOCK_LANGUAGE_MAPPING[language]}
                            </Text>

                            <Spacing mr={1} />

                            {ObjectType.BLOCK_FILE === objectType && (
                              <FileIcon muted size={ICON_SIZE} />
                            )}

                            {ObjectType.CUSTOM_BLOCK_TEMPLATE === objectType && (
                              <TemplateShapes muted size={ICON_SIZE} />
                            )}

                            {ObjectType.MAGE_TEMPLATE === objectType && (
                              <BlockCubePolygon muted size={ICON_SIZE} />
                            )}

                            {isGenerateBlock && hasOpenAIAPIKey && (
                              <AISparkle muted size={ICON_SIZE} />
                            )}
                            {isGenerateBlock && !hasOpenAIAPIKey && (
                              <AlertTriangle muted size={ICON_SIZE} />
                            )}
                          </RowStyle>
                        );
                      },
                    },
                  ]}
                  onSelectItem={({
                    itemObject: blockActionObject,
                  }: ItemType) => {
                    const {
                      object_type: objectType,
                    } = blockActionObject;

                    if (ObjectType.GENERATE_BLOCK === objectType && !hasOpenAIAPIKey) {
                      showConfigureProjectModal?.({
                        cancelButtonText: 'Set this up later',
                        header: (
                          <Spacing mb={UNITS_BETWEEN_SECTIONS}>
                            <Panel>
                              <Text warning>
                                You need to add an OpenAI API key to your project before you can
                                generate blocks using AI.
                              </Text>

                              <Spacing mt={1}>
                                <Text warning>
                                  Read <Link
                                    href="https://help.openai.com/en/articles/4936850-where-do-i-find-my-secret-api-key"
                                    openNewWindow
                                  >
                                    OpenAI’s documentation
                                  </Link> to get your API key.
                                </Text>
                              </Spacing>
                            </Panel>
                          </Spacing>
                        ),
                        onCancel: () => {
                          setSetupAILater(true);
                        },
                        onSaveSuccess: (project: ProjectType) => {
                          if (project?.openai_api_key) {
                            addNewBlock({
                              block_action_object: blockActionObject,
                            });
                            setInputValue(null);
                            setSearchResult(null);
                          }
                        },
                      });
                    } else {
                      addNewBlock({
                        block_action_object: blockActionObject,
                        require_unique_name: false,
                      });
                      setInputValue(null);
                      setSearchResult(null);
                    }
                  }}
                  uuid={componentUUID}
                />
              </DropdownStyle>
            </SearchStyle>
          </Flex>
        </FlexContainer>
      </ContainerStyle>
    </ClickOutside>
  );
}

export default AddNewBlocksV2;
