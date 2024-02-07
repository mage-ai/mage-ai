import { useCallback, useMemo, useRef, useState } from 'react';

import AddButton from '@components/shared/AddButton';
import Badge from '@oracle/components/Badge';
import ClickOutside from '@oracle/components/ClickOutside';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PopupMenu from '@oracle/components/PopupMenu';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleMenu from '@oracle/components/ToggleMenu';
import Tooltip from '@oracle/components/Tooltip';
import {
  BUTTON_PADDING,
  ConfirmDialogueOpenEnum,
  POPUP_MENU_WIDTH,
  POPUP_TOP_OFFSET,
  SEARCH_INPUT_PROPS,
  SHARED_TOOLTIP_PROPS,
} from './constants';
import { Close, Ellipsis, Filter, Group, Trash } from '@oracle/icons';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { SHARED_BUTTON_PROPS } from '@components/shared/AddButton';
import { UNIT } from '@oracle/styles/units/spacing';
import { VerticalDividerStyle } from '@oracle/elements/Divider/index.style';
import { getNestedTruthyValuesCount } from '@utils/hash';
import { isViewer } from '@utils/session';

type ToolbarProps = {
  addButtonProps?: {
    isLoading?: boolean;
    label?: string;
    onClick?: () => void;
    menuItems?: FlyoutMenuItemType[];
  };
  children?: any;
  deleteRowProps?: {
    confirmationMessage: string;
    isLoading: boolean;
    item: string;
    onDelete: (id: string | number) => void;
  }
  extraActionButtonProps?: {
    Icon: any;
    confirmationDescription?: string;
    confirmationMessage?: string;
    disabled?: boolean;
    isLoading?: boolean;
    label?: string;
    onClick: () => void;
    openConfirmationDialogue?: boolean;
    tooltip?: string;
  };
  filterOptions?: {
    [keyof: string]: string[];
  };
  filterValueLabelMapping?: {
    [keyof: string]: {
      [keyof: string]: string | (() => string);
    };
  };
  moreActionsMenuItems?: FlyoutMenuItemType[];
  groupButtonProps?: {
    menuItems: FlyoutMenuItemType[];
    groupByLabel?: string;
  };
  onClickFilterDefaults?: () => void;
  onFilterApply?: (query?: {
    [key: string]: string | string[] | number | number[];
  }, updatedQuery?: {
    [key: string]: string | string[] | number | number[];
  }) => void;
  query?: {
    [keyof: string]: string[];
  };
  resetLimitOnFilterApply?: boolean;
  resetPageOnFilterApply?: boolean;
  secondaryButtonProps?: {
    beforeIcon?: JSX.Element;
    disabled?: boolean;
    isLoading?: boolean;
    label?: string;
    onClick?: () => void;
    tooltip?: string;
  };
  searchProps?: {
    placeholder?: string;
    onChange: (text: string) => void;
    value: string;
  }
  selectedRowId?: string | number;
  setSelectedRow?: (row: any) => void;
  showDivider?: boolean;
};

function Toolbar({
  addButtonProps,
  children,
  deleteRowProps,
  extraActionButtonProps,
  filterOptions = {},
  filterValueLabelMapping,
  groupButtonProps,
  moreActionsMenuItems,
  onClickFilterDefaults,
  onFilterApply,
  query = {},
  resetLimitOnFilterApply,
  resetPageOnFilterApply,
  secondaryButtonProps,
  searchProps,
  selectedRowId,
  setSelectedRow,
  showDivider,
}: ToolbarProps) {
  const isViewerRole = isViewer();
  const addButtonMenuRef = useRef(null);
  const filterButtonMenuRef = useRef(null);
  const groupButtonMenuRef = useRef(null);
  const moreActionsButtonMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  const [addButtonMenuOpen, setAddButtonMenuOpen] = useState<boolean>(false);
  const [filterButtonMenuOpen, setFilterButtonMenuOpen] = useState<boolean>(false);
  const [groupButtonMenuOpen, setGroupButtonMenuOpen] = useState<boolean>(false);
  const [moreActionsMenuOpen, setMoreActionsMenuOpen] = useState<boolean>(false);
  const [confirmationDialogueOpenIdx, setConfirmationDialogueOpenIdx] = useState<number>(null);
  const disabledActions = !selectedRowId;

  const closeAddButtonMenu = useCallback(() => setAddButtonMenuOpen(false), []);
  const closeFilterButtonMenu = useCallback(() => setFilterButtonMenuOpen(false), []);
  const closeGroupButtonMenu = useCallback(() => setGroupButtonMenuOpen(false), []);
  const closeMoreActionsMenu = useCallback(() => setMoreActionsMenuOpen(null), []);
  const closeConfirmationDialogue = useCallback(() => setConfirmationDialogueOpenIdx(null), []);

  const {
    Icon: extraActionIcon,
    confirmationDescription: extraActionConfirmDescription,
    confirmationMessage: extraActionConfirmMessage,
    disabled: disabledExtraAction = disabledActions,
    isLoading: isLoadingExtraAction,
    label: extraActionLabel,
    onClick: onExtraActionClick,
    openConfirmationDialogue: openExtraActionConfirmDialogue,
    tooltip: extraActionTooltip,
  } = extraActionButtonProps || {};
  const {
    confirmationMessage: deleteConfirmMessage,
    isLoading: isLoadingDelete,
    item,
    onDelete,
  } = deleteRowProps || {};
  const {
    placeholder: searchPlaceholder,
    onChange: onSearchChange,
    value: searchValue,
  } = searchProps || {};

  const filterOptionsEnabledMapping = useMemo(() => (
    Object.entries(filterOptions).reduce((mapping, [filterKey, values]) => {
      mapping[filterKey] = {};
      values.forEach(value => {
        const filterValueEnabled = query[`${filterKey}[]`]?.includes(value) || false;
        mapping[filterKey][value] = filterValueEnabled;
      });

      return mapping;
    }, {})
  ), [filterOptions, query]);

  const {
    label: addButtonLabel,
    menuItems: addButtonMenuItems,
    onClick: onClickAddButton,
    isLoading: isLoadingAddButton,
  } = addButtonProps || {};
  const addButtonEl = useMemo(() => (
    <AddButton
      addButtonMenuOpen={addButtonMenuOpen}
      addButtonMenuRef={addButtonMenuRef}
      isLoading={isLoadingAddButton}
      label={addButtonLabel}
      menuItems={addButtonMenuItems}
      onClick={onClickAddButton
        ? onClickAddButton
        : () => setAddButtonMenuOpen(prevOpenState => !prevOpenState)
      }
      onClickCallback={closeAddButtonMenu}
    />
  ), [
    addButtonLabel,
    addButtonMenuItems,
    addButtonMenuOpen,
    closeAddButtonMenu,
    isLoadingAddButton,
    onClickAddButton,
  ]);

  const {
    beforeIcon: secondaryButtonBeforeIcon,
    disabled: secondaryButtonDisabled,
    label: secondaryButtonLabel,
    onClick: onClickSecondaryButton,
    isLoading: isLoadingSecondaryButton,
    tooltip: secondaryButtonTooltip,
  } = secondaryButtonProps || {};
  const secondaryButtonEl = useMemo(() => (
    <KeyboardShortcutButton
      beforeElement={secondaryButtonBeforeIcon}
      bold
      disabled={secondaryButtonDisabled}
      greyBorder
      loading={isLoadingSecondaryButton}
      onClick={onClickSecondaryButton}
      outline
      paddingBottom={9}
      paddingTop={9}
      title={secondaryButtonTooltip}
      uuid="Table/Toolbar/SecondaryButton"
    >
      {secondaryButtonLabel}
    </KeyboardShortcutButton>
  ), [
    isLoadingSecondaryButton,
    onClickSecondaryButton,
    secondaryButtonBeforeIcon,
    secondaryButtonDisabled,
    secondaryButtonLabel,
    secondaryButtonTooltip,
  ]);

  const filtersAppliedCount = useMemo(
    () => getNestedTruthyValuesCount(filterOptionsEnabledMapping),
    [filterOptionsEnabledMapping],
  );
  const filterButtonEl = useMemo(() => (
    <ToggleMenu
      compact
      onClickCallback={(query, updatedQuery) => {
        if (onFilterApply) {
          onFilterApply?.(query, updatedQuery);
        }
        if (closeFilterButtonMenu) {
          closeFilterButtonMenu?.();
        }
      }}
      onClickOutside={closeFilterButtonMenu}
      onSecondaryClick={onClickFilterDefaults}
      open={filterButtonMenuOpen}
      options={filterOptionsEnabledMapping}
      parentRef={filterButtonMenuRef}
      query={query}
      resetLimitOnApply={resetLimitOnFilterApply}
      resetPageOnApply={resetPageOnFilterApply}
      setOpen={setFilterButtonMenuOpen}
      toggleValueMapping={filterValueLabelMapping}
    >
      <KeyboardShortcutButton
        {...SHARED_BUTTON_PROPS}
        afterElement={filtersAppliedCount > 0
          ?
            <Badge cyan noVerticalPadding>
              <Text bold inverted>
                {filtersAppliedCount}
              </Text>
            </Badge>
          : null
        }
        beforeElement={<Filter size={2 * UNIT} />}
        onClick={() => setFilterButtonMenuOpen(prevOpenState => !prevOpenState)}
        uuid="Table/Toolbar/FilterButton"
      >
        Filter
      </KeyboardShortcutButton>
    </ToggleMenu>
  ), [
    closeFilterButtonMenu,
    filterButtonMenuOpen,
    filterOptionsEnabledMapping,
    filterValueLabelMapping,
    filtersAppliedCount,
    onClickFilterDefaults,
    onFilterApply,
    query,
    resetLimitOnFilterApply,
    resetPageOnFilterApply,
  ]);

  const {
    groupByLabel,
    menuItems: groupMenuItems,
  } = groupButtonProps || {};
  const groupButtonEl = useMemo(() => (
    <FlyoutMenuWrapper
      disableKeyboardShortcuts
      items={groupMenuItems}
      onClickCallback={closeGroupButtonMenu}
      onClickOutside={closeGroupButtonMenu}
      open={groupButtonMenuOpen}
      parentRef={groupButtonMenuRef}
      roundedStyle
      topOffset={1}
      uuid="Table/Toolbar/GroupMenu"
    >
      <KeyboardShortcutButton
        {...SHARED_BUTTON_PROPS}
        beforeElement={<Group size={2.5 * UNIT} />}
        onClick={() => {
          setGroupButtonMenuOpen(prevOpenState => !prevOpenState);
        }}
        uuid="Table/Toolbar/GroupButton"
      >
        {groupByLabel ? `Grouped by ${groupByLabel}` : 'Group'}
      </KeyboardShortcutButton>
    </FlyoutMenuWrapper>
  ), [
    closeGroupButtonMenu,
    groupButtonMenuOpen,
    groupByLabel,
    groupMenuItems,
  ]);

  const moreActionsButtonEl = useMemo(() => (
    <FlyoutMenuWrapper
      disableKeyboardShortcuts
      items={moreActionsMenuItems}
      onClickCallback={closeMoreActionsMenu}
      onClickOutside={closeMoreActionsMenu}
      open={moreActionsMenuOpen}
      parentRef={moreActionsButtonMenuRef}
      roundedStyle
      topOffset={1}
      uuid="Table/Toolbar/MoreActionsMenu"
    >
      <Tooltip
        {...SHARED_TOOLTIP_PROPS}
        label="More actions"
      >
        <KeyboardShortcutButton
          Icon={Ellipsis}
          bold
          disabled={disabledActions}
          greyBorder
          onClick={() => setMoreActionsMenuOpen(prevState => !prevState)}
          smallIcon
          uuid="Table/Toolbar/MoreActionsButton"
        />
      </Tooltip>
    </FlyoutMenuWrapper>
  ), [
    closeMoreActionsMenu,
    disabledActions,
    moreActionsMenuOpen,
    moreActionsMenuItems,
  ]);

  return (
    <FlexContainer alignItems="center">
      {addButtonProps && addButtonEl}
      {secondaryButtonProps && (
        <Spacing ml={1}>
          {secondaryButtonEl}
        </Spacing>
      )}

      {children}

      {showDivider && (
        <>
          <Spacing ml="12px" />
          <VerticalDividerStyle />
        </>
      )}

      {(addButtonProps || secondaryButtonProps || children) && <Spacing mr={BUTTON_PADDING} />}
      {filterButtonEl}

      {groupMenuItems?.length > 0 &&
        <Spacing ml={BUTTON_PADDING}>
          {groupButtonEl}
        </Spacing>
      }

      {(!isViewerRole && onExtraActionClick) &&
        <Spacing ml={BUTTON_PADDING}>
          <Tooltip
            {...SHARED_TOOLTIP_PROPS}
            label={extraActionTooltip}
          >
            <KeyboardShortcutButton
              Icon={!isLoadingExtraAction && extraActionIcon}
              bold
              disabled={disabledExtraAction}
              greyBorder
              loading={isLoadingExtraAction}
              onClick={openExtraActionConfirmDialogue
                ? () => setConfirmationDialogueOpenIdx(ConfirmDialogueOpenEnum.FIRST)
                : onExtraActionClick
              }
              smallIcon
              uuid="Table/Toolbar/ExtraActionButton"
            >
              {extraActionLabel}
            </KeyboardShortcutButton>
          </Tooltip>
          <ClickOutside
            onClickOutside={closeConfirmationDialogue}
            open={confirmationDialogueOpenIdx === ConfirmDialogueOpenEnum.FIRST}
          >
            <PopupMenu
              onCancel={closeConfirmationDialogue}
              onClick={() => {
                onExtraActionClick?.();
                closeConfirmationDialogue();
                setSelectedRow?.(null);
              }}
              subtitle={extraActionConfirmDescription}
              title={extraActionConfirmMessage}
              top={POPUP_TOP_OFFSET}
              width={POPUP_MENU_WIDTH}
            />
          </ClickOutside>
        </Spacing>
      }

      {(!isViewerRole && onDelete) &&
        <Spacing ml={BUTTON_PADDING}>
          <Tooltip
            {...SHARED_TOOLTIP_PROPS}
            label={`Delete ${item}`}
          >
            <KeyboardShortcutButton
              Icon={!isLoadingDelete && Trash}
              bold
              disabled={disabledActions}
              greyBorder
              loading={isLoadingDelete}
              onClick={() => setConfirmationDialogueOpenIdx(ConfirmDialogueOpenEnum.SECOND)}
              smallIcon
              uuid="Table/Toolbar/DeleteButton"
            />
          </Tooltip>
          <ClickOutside
            onClickOutside={closeConfirmationDialogue}
            open={confirmationDialogueOpenIdx === ConfirmDialogueOpenEnum.SECOND}
          >
            <PopupMenu
              danger
              onCancel={closeConfirmationDialogue}
              onClick={() => {
                onDelete?.(selectedRowId);
                closeConfirmationDialogue();
                setSelectedRow?.(null);
              }}
              subtitle={deleteConfirmMessage}
              title={`Are you sure you want to delete the ${item} ${selectedRowId}?`}
              top={POPUP_TOP_OFFSET}
              width={POPUP_MENU_WIDTH}
            />
          </ClickOutside>
        </Spacing>
      }

      {(!isViewerRole && moreActionsMenuItems?.length > 0) &&
        <Spacing ml={BUTTON_PADDING}>
          {moreActionsButtonEl}
        </Spacing>
      }

      {onSearchChange &&
        <>
          <Spacing ml={BUTTON_PADDING} />
          <Flex flex={1}>
            <TextInput
              {...SEARCH_INPUT_PROPS}
              afterIcon={searchValue ? <Close /> : null}
              afterIconClick={() => {
                onSearchChange('');
                searchInputRef?.current?.focus();
              }}
              onChange={e => onSearchChange(e.target.value)}
              paddingVertical={9}
              placeholder={searchPlaceholder ? searchPlaceholder : null}
              ref={searchInputRef}
              value={searchValue}
            />
          </Flex>
        </>
      }
    </FlexContainer>
  );
}

export default Toolbar;
