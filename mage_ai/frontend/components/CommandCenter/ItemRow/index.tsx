import React from 'react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import {
  CommandCenterItemType,
  ObjectTypeEnum,
} from '@interfaces/CommandCenterType';
import { ItemRowClassNameEnum } from '../constants';
import { ItemStyle, getIconColor } from './index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { getDisplayCategory } from '../utils';
import { getIcon } from './constants';

type ItemRowProps = {
  className: string;
  item: CommandCenterItemType;
  onClick: (e: Event) => void;
};

function ItemRow({
  className,
  item,
  onClick,
}: ItemRowProps, ref) {
  const {
    description,
    display_settings_by_attribute: displaySettingsByAttribute,
    metadata,
    title,
  } = item;
  const {
    description: descriptionDisplaySettings,
  } = displaySettingsByAttribute || {
    description: null,
  };

  const Icon = getIcon(item);
  const iconColor = getIconColor(item);
  const category = getDisplayCategory(item, true);

  const maxLetters = 85 - ((title?.length || 0) + (category?.length || 0));
  const descriptionCount = description?.length || 0;
  let descriptionUse = description;
  if (descriptionCount > maxLetters) {
    descriptionUse = `${descriptionUse?.slice(0, maxLetters)}..`;
  }

  return (
    <ItemStyle
      className={className}
      // @ts-ignore
      onClick={onClick}
      ref={ref}
    >
      <FlexContainer alignItems="center" fullHeight justifyContent="space-between">
        <Flex alignItems="center" flex={1}>
          {Icon && (
            <Icon
              fill={iconColor?.accent}
              size={2 * UNIT}
            />
          )}

          <div style={{ marginRight: 1.5 * UNIT }} />

          <Text weightStyle={4}>
            {title}
          </Text>

          <Spacing mr={PADDING_UNITS} />

          {description && (
            <Text
              default
              monospace={descriptionDisplaySettings?.text_styles?.monospace}
              small={!descriptionDisplaySettings?.text_styles?.regular}
            >
              {descriptionUse}
            </Text>
          )}
        </Flex>

        <Text muted>
          {category}
        </Text>
      </FlexContainer>
    </ItemStyle>
  );
}

export default React.forwardRef(ItemRow);
