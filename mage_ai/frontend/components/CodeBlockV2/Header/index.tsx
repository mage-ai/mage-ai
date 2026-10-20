import * as osPath from 'path';
import React, { useEffect, useMemo, useState } from 'react';
import { CSSTransition } from 'react-transition-group';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Circle from '@oracle/elements/Circle';
import Divider from '@oracle/elements/Divider';
import FileEditorHeader from '@components/FileEditor/Header';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import Loading, { LoadingStyleEnum } from '@oracle/components/Loading';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import { BLOCK_TYPE_ICON_MAPPING } from '@components/CustomTemplates/BrowseTemplates/constants';
import { BLOCK_TYPE_NAME_MAPPING, LANGUAGE_DISPLAY_MAPPING } from '@interfaces/BlockType';
import { ChevronDownV2, ChevronUpV2, Menu, PanelCollapseLeft } from '@oracle/icons';
import { CodeBlockHeaderProps } from '../constants';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import {
  HeaderStyle,
  HeaderWrapperStyle,
  ICON_SIZE,
  InfoStyle,
  SubheaderButtonStyle,
  SubheaderMenuStyle,
  SubheaderStyle,
  TagStyle,
} from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { buildTags } from '@components/CodeBlock/utils';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

function CodeBlockHeader({
  block,
  buttons,
  executionState,
  menuGroups,
  selected,
  selectedHeaderTab,
  setSelectedHeaderTab,
  setSideMenuVisible,
  setSubheaderVisible,
  sideMenuVisible,
  subheaderVisible,
  subheaderVisibleDefault,
  subtitle,
  tabs,
  theme,
  title,
}: CodeBlockHeaderProps & {
  selectedHeaderTab?: TabType;
  setSelectedHeaderTab: (tab: TabType) => void;
  setSideMenuVisible?: (value: boolean) => void;
  setSubheaderVisible: (value: boolean) => void;
  subheaderVisible: boolean;
  sideMenuVisible?: boolean;
}, ref) {
  const {
    color: blockColor,
    language,
    status,
    type,
    uuid,
  } = block;

  useEffect(() => {
    setSubheaderVisible(subheaderVisibleDefault
      ? subheaderVisibleDefault?.(block)
      : false
    );
  }, []);

  const {
    active = false,
    running = false,
    waiting = false,
  }: {
    active: boolean;
    running: boolean;
    waiting: boolean;
  } = useMemo(() => {
    return {
      active: ExecutionStateEnum.IDLE !== executionState,
      running: ExecutionStateEnum.BUSY === executionState,
      waiting: ExecutionStateEnum.QUEUED === executionState,
    };
  }, [
    executionState,
  ]);

  const color = getColorsForBlockType(type, {
    blockColor,
    theme,
  });
  const Icon = BLOCK_TYPE_ICON_MAPPING[type];

  const titleEls = useMemo(() => {
    const arr = [];

    const titleParts = (title || uuid)?.split(osPath.sep);
    const titlePartsCount = titleParts?.length || 0;

    titleParts?.forEach((part: string, idx: number) => {
      if (idx >= 1) {
        arr.push(
          <div
            key={`${part}-spacing-${idx}`}
            style={{ paddingLeft: UNIT / 4, paddingRight: UNIT / 4 }}
          >
            <Text noWrapping muted>
              /
            </Text>
          </div>
        );
      }

      arr.push(
        <Text
          key={`${part}-text-${idx}`}
          muted={idx < titlePartsCount - 1}
          noWrapping
          weightStyle={4}
        >
          {part}
        </Text>
      );
    });

    return arr;
  }, [
    title,
    uuid,
  ]);

  const {
    buttonsDropdown,
    buttonsVisible,
  } = useMemo(() => {
    const buttonsDropdownInner = [];
    const buttonsVisibleInner = [];

    buttons?.forEach(({
      Icon: IconButton,
      color,
      description,
      disabled: disabledFunc,
      icon,
      keyTextGroups,
      keyTextsPosition,
      keyboardShortcutValidation,
      label,
      loading,
      onClick,
      uuid: uuidButton,
      visible,
    }, idx: number) => {
      const disabled = disabledFunc && disabledFunc?.({
        active,
        running,
        waiting,
      });
      const iconOnly = (icon || IconButton) && !label;
      const iconEl = icon
        ? React.cloneElement(icon, {
          ...(icon?.props || {}),
          ...(disabled ? {
            color: null,
            disabled,
          } : {})
        })
        : IconButton && (
          <IconButton
            disabled={disabled}
            fill={disabled ? null : color}
            size={ICON_SIZE}
          />
        );

      const key = `KeyboardShortcutButton/${uuid}/${uuidButton}/${idx}`;
      let el = (
        <KeyboardShortcutButton
          addPlusSignBetweenKeys
          backgroundColor={disabled ? null : color}
          compact
          disabled={disabled}
          key={key}
          keyTextGroups={keyTextGroups}
          keyTextsPosition={keyTextsPosition}
          keyboardShortcutValidation={keyboardShortcutValidation
            ? (ks: KeyboardShortcutType, index?: number) => keyboardShortcutValidation?.(
              ks,
              index,
              {
                block,
                selected,
              },
            )
            : null
          }
          loading={loading}
          noBackground={iconOnly}
          borderless={iconOnly}
          noPadding={iconOnly}
          onClick={() => {
            if (onClick) {
              onClick?.({
                selectedHeaderTab,
                setSelectedHeaderTab,
              });
            }
          }}
          outline
          uuid={`CodeBlockV2/Header/KeyboardShortcutButton/${uuid}/${uuidButton}/${idx}`}
        >
          {iconEl}
          {iconEl && label && <Spacing mr={1} />}
          {label && label?.()}
        </KeyboardShortcutButton>
      );

      if (description) {
        el = (
          <div key={key} style={{ position: 'relative' }}>
            <Tooltip
              block
              label={description}
              size={null}
              visibleDelay={300}
              widthFitContent
            >
              {el}
            </Tooltip>
          </div>
        );
      }

      if (!visible || visible?.({
        active,
        running,
        waiting,
      })) {
        buttonsVisibleInner.push(el);
        buttonsVisibleInner.push(
          <div key={`spacing/${uuid}/${uuidButton}/${idx}`} style={{ marginRight: 12 }} />
        );
      } else {
        buttonsDropdownInner.push(el);
      }
    });

    return {
      buttonsDropdown: buttonsDropdownInner,
      buttonsVisible: buttonsVisibleInner,
    };
  }, [
    active,
    buttons,
    running,
    selected,
    uuid,
    waiting,
  ]);

  const menuGroupsMemo = useMemo(() => {
    const updateItems = (item) => {
      const onClick = item?.onClick;
      if (onClick) {
        item.onClick = () => onClick?.({
          selectedHeaderTab,
          setSelectedHeaderTab,
        });
      }

      if (item?.items?.length >= 1) {
        item.items = item?.items?.map(updateItems);
      }

      return item;
    };

    return menuGroups?.map(updateItems);
  }, [
    menuGroups,
    setSelectedHeaderTab,
  ]);

  const tags = useMemo(() => buildTags(block), [block]);

  const subhederMenuMemo = useMemo(() => {
    if (!menuGroupsMemo?.length && !tags?.length) {
      return null;
    }

    const childEl = (
      <FileEditorHeader
        defaultTextContent
        menuGroups={menuGroupsMemo}
        rightOffset={0}
      />
    );

    return (
      <>
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
        >
          {tabs?.length >= 1
            ? (
              <ButtonTabs
                allowScroll
                onClickTab={(tab: TabType) => {
                  setSelectedHeaderTab?.(tab);
                }}
                selectedTabUUID={selectedHeaderTab?.uuid}
                tabs={tabs}
                underlineColor={color?.accent}
                underlineStyle
              />
            )
            : <div />
          }

          {tabs?.length >= 1
            ? childEl
            : (
              <SubheaderMenuStyle>
                {childEl}
              </SubheaderMenuStyle>
            )
          }
        </FlexContainer>

        {tags?.length >= 1 && (
          <>
            <Divider light />

            <SubheaderMenuStyle>
              <FlexContainer
                alignItems="center"
                fullWidth
                justifyContent="space-between"
              >
                <div />

                <FlexContainer alignItems="center" justifyContent="flex-end">
                  {tags?.map(({
                    description,
                    title,
                  }) => (
                    <Tooltip
                      appearBefore
                      block
                      key={title}
                      label={description || title}
                      size={null}
                      visibleDelay={300}
                      widthFitContent
                    >
                      <TagStyle backgroundColor={color?.accentLight}>
                        <Text monospace small>
                          {title}
                        </Text>
                      </TagStyle>
                    </Tooltip>
                  ))}
                </FlexContainer>
              </FlexContainer>
            </SubheaderMenuStyle>
          </>
        )}
      </>
    );
  }, [
    color,
    menuGroupsMemo,
    selectedHeaderTab,
    setSelectedHeaderTab,
    tabs,
    tags,
  ]);

  useEffect(() => {
    if (tabs?.length && !selectedHeaderTab) {
      setSelectedHeaderTab?.(tabs[0]);
    }
  }, []);

  return (
    <HeaderWrapperStyle
      ref={ref}
      style={{ position: 'relative' }}
      subheaderVisible={subheaderVisible}
    >
      <HeaderStyle>
        <FlexContainer alignItems="center">
          {/*<KeyboardShortcutButton
            noBackground
            noPadding
            onClick={() => setSideMenuVisible(prev => !prev)}
            outline
            uuid={`KeyboardShortcutButton/${uuid}/header/menu/button`}
          >
            <Tooltip
              block
              label="Open menu"
              size={UNIT * 3}
              visibleDelay={300}
              widthFitContent
            >
              {sideMenuVisible
                ? <PanelCollapseLeft active size={UNIT * 3} />
                : <Menu fill={color?.accent} size={UNIT * 3} />
              }
            </Tooltip>
          </KeyboardShortcutButton>

          <Spacing mr={PADDING_UNITS} />*/}

          {buttonsVisible}

          {waiting && (
            <>
              <Spacing mr={PADDING_UNITS} />

              <Loading
                color={color?.accent}
                colorLight={color?.accentLight}
                loadingStyle={LoadingStyleEnum.BLOCKS}
              />

              <Spacing mr={PADDING_UNITS}/>
            </>
          )}
        </FlexContainer>

        <InfoStyle>
          <FlexContainer flexDirection="column">
            <FlexContainer alignItems="center" flexDirection="row" justifyContent="flex-end">
              {titleEls}
            </FlexContainer>

            {subtitle && (
              <Text monospace muted noWrapping rightAligned xsmall>
                {subtitle}
              </Text>
            )}
          </FlexContainer>

          <Spacing mr={PADDING_UNITS} />

          <Tooltip
            appearBefore
            block
            label={(
              <FlexContainer alignItems="center">
                <Text inline monospace>
                  {LANGUAGE_DISPLAY_MAPPING[language]}
                </Text>

                <Spacing mr={1} />

                <Text color={color?.accent} inline monospace>
                  {BLOCK_TYPE_NAME_MAPPING[type]}
                </Text>
              </FlexContainer>
            )}
            size={null}
            visibleDelay={300}
            widthFitContent
          >
            <Circle
              color={color?.accent}
              size={UNIT * 4}
              square
            >
              <Icon active size={ICON_SIZE} />
            </Circle>
          </Tooltip>
        </InfoStyle>
      </HeaderStyle>

      {menuGroups?.length >= 1 && (
        <SubheaderButtonStyle>
          <CSSTransition
            classNames="chevron-down"
            in
            timeout={400}
          >
            <KeyboardShortcutButton
              className="chevron-down-enter-done-visible"
              noBackground
              borderless
              noPadding
              onClick={() => {
                setSubheaderVisible(!subheaderVisible)
              }}
              uuid={`KeyboardShortcutButton/${uuid}/subheader/menu/button`}
            >
              <Spacing py={1}>
                {subheaderVisible && <ChevronUpV2 active size={UNIT * 2.5} />}
                {!subheaderVisible && <ChevronDownV2 fill={color?.accent} size={UNIT * 2.5} />}
              </Spacing>
            </KeyboardShortcutButton>
          </CSSTransition>
        </SubheaderButtonStyle>
      )}

      {running && (
        <div style={{ position: 'absolute', width: '100%' }}>
          <Loading
            // color={color?.accent}
            // colorLight={color?.accentLight}
            width="100%"
          />
        </div>
      )}

      {menuGroups?.length >= 1 && subheaderVisible && (
        <>
          <Divider light />

          <SubheaderStyle>
            {subhederMenuMemo}
          </SubheaderStyle>
        </>
      )}
    </HeaderWrapperStyle>
  );
}

export default React.forwardRef(CodeBlockHeader);
