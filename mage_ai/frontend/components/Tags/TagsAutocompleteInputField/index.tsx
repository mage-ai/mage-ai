import { useEffect, useMemo, useRef, useState } from 'react';

import AutocompleteDropdown from '@components/AutocompleteDropdown';
import Chip from '@oracle/components/Chip';
import Spacing from '@oracle/elements/Spacing';
import TagType from '@interfaces/TagType';
import TagsContainer from '../TagsContainer';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { DropdownStyle, RowStyle } from './index.style';
import {
  ItemType,
  RenderItemProps,
} from '@components/AutocompleteDropdown/constants';
import { KEY_CODE_ESCAPE } from '@utils/hooks/keyboardShortcuts/constants';
import { pauseEvent } from '@utils/events';
import { sortByKey } from '@utils/array';
import { useKeyboardContext } from '@context/Keyboard';

type TagsAutocompleteInputFieldProps = {
  removeTag?: (tag: TagType) => void;
  selectTag: (tag: TagType) => void;
  selectedTags: TagType[];
  tags: TagType[];
  uuid: string;
};

function TagsAutocompleteInputField({
  removeTag,
  selectTag,
  selectedTags = [],
  tags = [],
  uuid,
}: TagsAutocompleteInputFieldProps) {
  const refTextInput = useRef(null);

  const [focused, setFocused] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(null);

  const tagsSorted = useMemo(() => sortByKey(tags || [], 'uuid'), [tags]);
  const autocompleteItems = useMemo(() => tagsSorted?.map((tag: TagType) => ({
    itemObject: tag,
    searchQueries: [tag.uuid],
    value: tag.uuid,
  })), [tagsSorted]);
  const autocompleteItemsWithExtra = useMemo(() => {
    if (inputValue?.length >= 1) {
      return autocompleteItems.concat({
        itemObject: {
          uuid: inputValue,
        },
        searchQueries: [inputValue],
        value: `Add tag: ${inputValue}`,
      });
    }

    return autocompleteItems;
  }, [
    autocompleteItems,
    inputValue,
  ]);

  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => unregisterOnKeyDown(uuid), [
    unregisterOnKeyDown,
    uuid,
  ]);

  registerOnKeyDown?.(
    uuid,
    (event, keyMapping) => {
      if (focused && keyMapping[KEY_CODE_ESCAPE]) {
        setFocused(false);
        refTextInput?.current?.blur();
      }
    },
    [
      focused,
      refTextInput,
    ],
  );

  return (
    <>
      <TagsContainer
        onClickTag={removeTag}
        tags={selectedTags}
      />

      <Spacing
        mt={1}
        style={{
          position: 'relative',
        }}
      >
        <TextInput
          // Need setTimeout because when clicking a row, the onBlur will be triggered.
          // If the onBlur triggers too soon, clicking a row does nothing.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onChange={e => setInputValue(e.target.value)}
          onFocus={() => setFocused(true)}
          ref={refTextInput}
          value={inputValue || ''}
        />

        <DropdownStyle
          topOffset={refTextInput?.current?.getBoundingClientRect().height}
        >
          <AutocompleteDropdown
            eventProperties={{
              eventParameters: { item_type: 'tag' },
            }}
            itemGroups={[
              {
                items: focused ? autocompleteItemsWithExtra : [],
                renderItem: (
                  {
                    value,
                  }: ItemType,
                  opts: RenderItemProps,
                ) => (
                  <RowStyle
                    {...opts}
                    onClick={(e) => {
                      pauseEvent(e);
                      opts?.onClick?.(e);
                    }}
                  >
                    <Chip small>
                      <Text>
                        {value}
                      </Text>
                    </Chip>
                  </RowStyle>
                ),
              },
            ]}
            onSelectItem={({ itemObject: tag }: ItemType) => {
              selectTag?.(tag);
              setInputValue(null);
            }}
            searchQuery={inputValue}
            uuid={uuid}
          />
        </DropdownStyle>
      </Spacing>
    </>
  );
}

export default TagsAutocompleteInputField;
