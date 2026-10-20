import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton, {
  KeyTextsPostitionEnum,
} from '@oracle/elements/Button/KeyboardShortcutButton';
import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { CLOSE_OUTPUT_BUTTON_ID } from './index.style';
import { CommandCenterItemType, ItemApplicationType,} from '@interfaces/CommandCenterType';
import {
  KEY_SYMBOL_ARROW_DOWN,
  KEY_SYMBOL_ARROW_UP,
  KEY_SYMBOL_C,
  KEY_SYMBOL_CONTROL,
  KEY_SYMBOL_ENTER,
  KEY_SYMBOL_ESCAPE,
  KEY_SYMBOL_META,
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SettingsWithKnobs } from '@oracle/icons';
import { buildSettingsItemWithApplication } from './constants';
import { pauseEvent } from '@utils/events';

type FooterProps = {
  addApplication: (item: CommandCenterItemType, application: ItemApplicationType) => void;
  closeCommandCenter: () => void;
  closeOutput: () => void;
  handleNavigation: (increment: number) => void;
  handleSelectItemRow: () => void;
  refFooterButtonEnter: any;
  refFooterButtonEscape: any;
  refFooterButtonUp: any;
};

function Footer({
  addApplication,
  closeCommandCenter,
  closeOutput,
  handleNavigation,
  handleSelectItemRow,
  refFooterButtonEnter,
  refFooterButtonEscape,
  refFooterButtonUp,
}: FooterProps) {
  const {
    application,
    item,
  } = buildSettingsItemWithApplication();

  return (
    <FlexContainer alignItems="center" fullWidth justifyContent="space-between">
      <Flex alignItems="center" flex={1}>
        <FlexContainer alignItems="center">
          <Button
            iconOnly
            noBackground
            noBorder
            noPadding
            onClick={() => {
              addApplication(item, application);
            }}
          >
            <SettingsWithKnobs default size={UNIT * 2} />
          </Button>

          <div style={{ marginRight: UNIT * 2 }} />

          <div id={CLOSE_OUTPUT_BUTTON_ID}>
            <KeyboardShortcutButton
              addPlusSignBetweenKeys
              bold
              compact
              default
              keyTextGroups={[[KEY_SYMBOL_CONTROL, KEY_SYMBOL_C]]}
              keyTextsPosition={KeyTextsPostitionEnum.RIGHT}
              noBackground
              onClick={(e) => {
                pauseEvent(e);
                closeOutput();
              }}
              uuid="command-center-footer-close-output"
            >
              Close output
            </KeyboardShortcutButton>
          </div>
        </FlexContainer>
      </Flex>

      <FlexContainer alignItems="center">
        <FlexContainer alignItems="center">
          <KeyboardShortcutButton
            addPlusSignBetweenKeys
            bold
            compact
            keyTextGroups={[[KEY_SYMBOL_ENTER]]}
            keyTextsPosition={KeyTextsPostitionEnum.RIGHT}
            onClick={(e) => {
              pauseEvent(e);
              handleSelectItemRow();
            }}
            uuid="command-center-footer-button-enter"
          >
            <span ref={refFooterButtonEnter}>Select</span>
          </KeyboardShortcutButton>

          <Spacing mr={1} />

          <KeyboardShortcutButton
            addPlusSignBetweenKeys
            bold
            compact
            default
            keyTextGroups={[[KEY_SYMBOL_ARROW_UP]]}
            keyTextsPosition={KeyTextsPostitionEnum.RIGHT}
            noBackground
            onClick={(e) => {
              pauseEvent(e);
              handleNavigation(-1);
            }}
            uuid="command-center-footer-button-up"
          >
            <span ref={refFooterButtonUp}>Up</span>
          </KeyboardShortcutButton>

          <KeyboardShortcutButton
            addPlusSignBetweenKeys
            bold
            compact
            default
            keyTextGroups={[[KEY_SYMBOL_ARROW_DOWN]]}
            keyTextsPosition={KeyTextsPostitionEnum.RIGHT}
            noBackground
            onClick={(e) => {
              pauseEvent(e);
              handleNavigation(1);
            }}
            uuid="command-center-footer-button-right"
          >
            Down
          </KeyboardShortcutButton>

          <KeyboardShortcutButton
            addPlusSignBetweenKeys
            bold
            compact
            default
            keyTextGroups={[[KEY_SYMBOL_ESCAPE]]}
            keyTextsPosition={KeyTextsPostitionEnum.RIGHT}
            noBackground
            onClick={(e) => {
              pauseEvent(e);
              closeCommandCenter();
            }}
            uuid="command-center-footer-button-escape"
          >
            <span ref={refFooterButtonEscape}>Close</span>
          </KeyboardShortcutButton>
        </FlexContainer>
      </FlexContainer>
    </FlexContainer>
  );
}

export default Footer;
