import React from 'react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { CommandCenterItemType, CommandCenterTypeEnum } from '@interfaces/CommandCenterType';
import { ItemStyle, getIconColor } from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { getIcon } from './constants';


type ItemRowProps = {
  focused?: boolean;
  item: CommandCenterItemType;
};

function ItemRow({
  focused,
  item,
}: ItemRowProps, ref) {
  const {
    description,
    metadata,
    title,
    type,
  } = item;

  const Icon = getIcon(item);
  const iconColor = getIconColor(item);

  return (
    <ItemStyle focused={focused} ref={ref}>
      <FlexContainer alignItems="center" justifyContent="space-between">
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

export default React.forwardRef(ItemRow);
