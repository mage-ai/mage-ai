import * as osPath from 'path';
import { useMemo } from 'react';

import Circle from '@oracle/elements/Circle';
import CodeBlockHeaderProps from '../constants';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import { BLOCK_TYPE_ICON_MAPPING } from '@components/CustomTemplates/BrowseTemplates/constants';
import { BLOCK_TYPE_NAME_MAPPING, LANGUAGE_DISPLAY_MAPPING } from '@interfaces/BlockType';
import { HeaderStyle, ICON_SIZE } from './index.style';
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
  console.log('RENDER HEADER!');
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
      renderFromState,
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
          disabled={disabled}
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

      if (renderFromState) {
        const elState = renderFromState?.(executionState);
        if (elState) {
          el = elState;
        }
      }

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

      if (visible) {
        if (buttonsVisibleInner?.length >= 1) {
          buttonsVisibleInner.push(
            <Spacing key={`spacing/${uuid}/${uuidButton}/${idx}`} mr={PADDING_UNITS} />
          );
        }
        buttonsVisibleInner.push(el);
      } else {
        buttonsDropdownInner.push(el);
      }
    });

    return {
      buttonsDropdown: buttonsDropdownInner,
      buttonsVisible: buttonsVisibleInner,
    };
  }, [
    buttons,
    executionState,
    selected,
    uuid,
  ]);

  return (
    <HeaderStyle>
      <FlexContainer alignItems="center" flexDirection="row" justifyContent="space-between">
        <FlexContainer alignItems="center">
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

          <Spacing mr={PADDING_UNITS} />

          <FlexContainer flexDirection="column">
            <FlexContainer alignItems="center" flexDirection="row">
              {titleEls}
            </FlexContainer>
            {subtitle && (
              <Text default monospace small>
                {subtitle}
              </Text>
            )}
          </FlexContainer>
        </FlexContainer>

        <FlexContainer alignItems="center">
          {buttonsVisible}
        </FlexContainer>
      </FlexContainer>
    </HeaderStyle>
  );
}

export default CodeBlockHeader;
