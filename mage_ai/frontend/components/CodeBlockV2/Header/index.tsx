import * as osPath from 'path';
import { CSSTransition } from 'react-transition-group';
import { useMemo } from 'react';

import Circle from '@oracle/elements/Circle';
import CodeBlockHeaderProps from '../constants';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Loading, { LoadingStyleEnum } from '@oracle/components/Loading';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import { BLOCK_TYPE_ICON_MAPPING } from '@components/CustomTemplates/BrowseTemplates/constants';
import { BLOCK_TYPE_NAME_MAPPING, LANGUAGE_DISPLAY_MAPPING } from '@interfaces/BlockType';
import { ChevronDownV2, Menu } from '@oracle/icons';
import { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import {
  HeaderStyle,
  HeaderWrapperStyle,
  ICON_SIZE,
  SubheaderButtonStyle,
} from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';

function CodeBlockHeader({
  block,
  buttons,
  executionState,
  selected,
  subtitle,
  theme,
  title,
}: CodeBlockHeaderProps) {
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


  const {
    color: blockColor,
    language,
    type,
    uuid,
  } = block;

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
          <div key={`${part}-spacing`} style={{ paddingLeft: UNIT / 4, paddingRight: UNIT / 4 }}>
            <Text muted>
              /
            </Text>
          </div>
        );
      }

      arr.push(
        <Text key={part} default={idx < titlePartsCount - 1} weightStyle={4}>
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
      disabled,
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
      const iconOnly = (icon || IconButton) && !label;
      const iconEl = icon
        ? icon
        : IconButton && <IconButton fill={color} size={ICON_SIZE}/>;

      let el = (
        <KeyboardShortcutButton
          addPlusSignBetweenKeys
          backgroundColor={color}
          bold
          compact
          disabled={disabled && disabled?.({
            active,
            running,
            waiting,
          })}
          key={`KeyboardShortcutButton/${uuid}/${uuidButton}/${idx}`}
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
          noBorder={iconOnly}
          noPadding={iconOnly}
          onClick={onClick}
          uuid={`KeyboardShortcutButton/${uuid}/${uuidButton}/${idx}`}
        >
          {iconEl}
          {iconEl && label && <Spacing mr={1} />}
          {label && label?.()}
        </KeyboardShortcutButton>
      );

      if (description) {
        el = (
          <Tooltip
            appearBefore
            block
            description={description}
            size={null}
            widthFitContent
          >
            {el}
          </Tooltip>
        );
      }

      if (!visible || visible?.({
        active,
        running,
        waiting,
      })) {
        buttonsVisibleInner.push(el);
        buttonsVisibleInner.push(
          <Spacing key={`spacing/${uuid}/${uuidButton}/${idx}`} mr={PADDING_UNITS} />
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

  return (
    <HeaderWrapperStyle style={{ position: 'relative' }}>
      <HeaderStyle>
        <FlexContainer alignItems="center">
          <KeyboardShortcutButton
            noBackground
            noBorder
            noPadding
            onClick={() => {
              alert('OPEN LEFT SIDE PANEL');
            }}
            uuid={`KeyboardShortcutButton/${uuid}/header/menu/button`}
          >
            <Menu size={ICON_SIZE} />
          </KeyboardShortcutButton>

          <Spacing mr={PADDING_UNITS} />

          {buttonsVisible}

          {waiting && (
            <>
              <Loading
                color={color?.accent}
                colorLight={color?.accentLight}
                loadingStyle={LoadingStyleEnum.BLOCKS}
              />

              <Spacing mr={PADDING_UNITS}/>
            </>
          )}
        </FlexContainer>

        <FlexContainer alignItems="center">
          <FlexContainer flexDirection="column">
            <FlexContainer alignItems="center" flexDirection="row" justifyContent="flex-end">
              {titleEls}
            </FlexContainer>

            {subtitle && (
              <Text default monospace small>
                {subtitle}
              </Text>
            )}
          </FlexContainer>

          <Spacing mr={PADDING_UNITS} />

          <Tooltip
            block
            label={[
              LANGUAGE_DISPLAY_MAPPING[language],
              BLOCK_TYPE_NAME_MAPPING[type],
            ].filter(i => i).join(' ')}
            size={null}
            widthFitContent
          >
            <Circle
              color={color?.accent}
              size={UNIT * 5}
              square
            >
              <Icon active size={ICON_SIZE} />
            </Circle>
          </Tooltip>
        </FlexContainer>
      </HeaderStyle>

      <SubheaderButtonStyle>
        <CSSTransition
          classNames="chevron-down"
          in
          timeout={400}
        >
          <KeyboardShortcutButton
            className="chevron-down-enter-done-visible"
            noBackground
            noBorder
            noPadding
            onClick={() => {
              alert('OPEN SUBHEADER');
            }}
            uuid={`KeyboardShortcutButton/${uuid}/subheader/menu/button`}
          >
            <ChevronDownV2 default size={ICON_SIZE} />
          </KeyboardShortcutButton>
        </CSSTransition>
      </SubheaderButtonStyle>

      {running && (
        <div style={{ position: 'absolute', width: '100%' }}>
          <Loading
            color={color?.accent}
            colorLight={color?.accentLight}
            width="100%"
          />
        </div>
      )}
    </HeaderWrapperStyle>
  );
}

export default CodeBlockHeader;
