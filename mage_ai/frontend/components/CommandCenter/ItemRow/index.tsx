import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { CommandCenterItemType, CommandCenterTypeEnum } from '@interfaces/CommandCenterType';
import { ItemStyle, getIconColor } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { getIcon } from './constants';


type ItemRowProps = {
  item: CommandCenterItemType;
};

function ItemRow({
  item,
}: ItemRowProps) {
  const {
    description,
    metadata,
    title,
    type,
  } = item;

  const Icon = getIcon(item);
  const iconColor = getIconColor(item);

  return (
    <ItemStyle>
      <FlexContainer alignItems="center" justifyContent="space-between">
        <Flex alignItems="center" flex={1}>
          <Icon
            fill={iconColor?.accent}
            size={2 * UNIT}
          />

          <Spacing mr={1} />

          <Text weightStyle={4}>
            {title}
          </Text>

          <Spacing mr={2} />

          {description && (
            <Text default>
              {description}
            </Text>
          )}
        </Flex>

        <Text muted>
          {capitalizeRemoveUnderscoreLower(type)}
        </Text>
      </FlexContainer>
    </ItemStyle>
  );
}

export default ItemRow;
