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
    subtitle,
    title,
  } = item || {
    description: '',
    display_settings_by_attribute: null,
    metadata: null,
    subtitle: '',
    title: '',
  };
  const {
    description: descriptionDisplaySettings,
    subtitle: subtitleDisplaySettings,
  } = displaySettingsByAttribute || {
    description: null,
    subtitle: null,
  };

  const Icon = getIcon(item);
  const { accent, useStroke } = getIconColor(item);
  const category = subtitle || getDisplayCategory(item, true);

  const maxLetters = (
    descriptionDisplaySettings?.text_styles?.monospace
      ? 100
      : 150
  ) - ((1.75 * (title?.length || 0) + (category?.length || 0)));
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
              fill={useStroke ? null : accent}
              stroke={useStroke ? accent : null}
              size={2 * UNIT}
            />
          )}

          <div style={{ marginRight: 1.5 * UNIT }} />

          <Text noWrapping weightStyle={4}>
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

        <Text
          monospace={subtitleDisplaySettings?.text_styles?.monospace}
          small={!subtitleDisplaySettings?.text_styles?.regular}
          muted={typeof subtitleDisplaySettings?.text_styles?.muted === 'undefined'
            || subtitleDisplaySettings?.text_styles?.muted
          }
        >
          {category}
        </Text>
      </FlexContainer>
    </ItemStyle>
  );
}

export default React.forwardRef(ItemRow);
