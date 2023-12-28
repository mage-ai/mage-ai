import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton, {
  KeyTextsPostitionEnum,
} from '@oracle/elements/Button/KeyboardShortcutButton';
import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { ApplicationProps } from '../ItemApplication/constants';
import { KEY_CODE_KEY_SYMBOL_MAPPING } from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { getIcon } from '../ItemRow/constants';
import { getIconColor } from '../ItemRow/index.style';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';

function ApplicationFooter({
  item,
}: ApplicationProps) {
  const {
    application,
    title,
  } = item;

  const Icon = getIcon(item);
  const iconColor = getIconColor(item);

  return (
    <FlexContainer alignItems="center" fullWidth justifyContent="space-between">
      <Flex alignItems="center" flex={1}>
        <Icon
          fill={iconColor?.accent}
          size={2 * UNIT}
        />

        <div style={{ marginRight: 1.5 * UNIT }} />

        <Text weightStyle={4}>
          {title}
        </Text>

        <Spacing mr={PADDING_UNITS} />
      </Flex>

      <FlexContainer alignItems="center">
        {application?.buttons?.map(({
          action_types: actionTypes,
          color_uuid: colorUUID,
          keyboard_shortcuts: keyboardShortcuts,
          label,
          tooltip,
        }) => (
          <FlexContainer alignItems="center" key={label}>
            <KeyboardShortcutButton
              addPlusSignBetweenKeys
              bold
              compact
              keyTextGroups={keyboardShortcuts?.map(
                arr => arr?.map(keyCode => KEY_CODE_KEY_SYMBOL_MAPPING[keyCode]),
              )}
              keyTextsPosition={KeyTextsPostitionEnum.RIGHT}
              noBorder
              onClick={() => {
                console.log('enter')
              }}
            >
              {label}
            </KeyboardShortcutButton>
          </FlexContainer>
        ))}
      </FlexContainer>
    </FlexContainer>
  );
}

export default ApplicationFooter;
