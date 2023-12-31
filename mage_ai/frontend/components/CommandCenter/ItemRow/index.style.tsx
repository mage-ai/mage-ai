import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { CommandCenterItemType, ObjectTypeEnum } from '@interfaces/CommandCenterType';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { dig } from '@utils/hash';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { transition } from '@oracle/styles/mixins';

export const ITEM_ROW_HEIGHT = 44;

export function getIconColor(item: CommandCenterItemType, opts: {
  theme?: ThemeType;
} = {}): {
  accent?: string;
  accentLight?: string;
} {
  const theme = opts?.theme;

  const {
    display_settings_by_attribute: displaySettingsByAttribute,
    metadata,
    object_type: objectType,
  } = item || {
    display_settings_by_attribute: null,
    metadata: null,
    object_type: null,
  };

  const colorUUID = displaySettingsByAttribute?.item?.icon?.color_uuid;

  const themeUse = (theme || dark);

  let accent = themeUse?.monotone?.gray;
  let accentLight = themeUse?.monotone?.grey500;

  if (colorUUID) {
    accent = dig(themeUse, colorUUID);
    accentLight = dig(themeUse, colorUUID);
  } else if (ObjectTypeEnum.APPLICATION == objectType) {
    accent = themeUse?.accent?.sky;
    accentLight = themeUse?.accent?.skyLight;
  } else if (ObjectTypeEnum.BLOCK == objectType) {
    return getColorsForBlockType(item?.metadata?.block?.type, {
      theme,
    });
  } else if (ObjectTypeEnum.CODE == objectType) {
    accent = themeUse?.accent?.negative;
    accentLight = themeUse?.accent?.negativeTransparent;
  } else if (ObjectTypeEnum.CHAT === objectType || ObjectTypeEnum.DOCUMENT === objectType) {
    accent = themeUse?.background?.success;
    accentLight = themeUse?.background?.successLight;
  } else if (ObjectTypeEnum.FILE == objectType) {
    accent = themeUse?.accent?.warning;
    accentLight = themeUse?.accent?.warningTransparent;
  } else if (ObjectTypeEnum.FOLDER == objectType) {
    accent = themeUse?.chart?.tertiary;
    accentLight = themeUse?.accent?.skyLight;
  } else if (ObjectTypeEnum.GIT == objectType) {
    accent = themeUse?.accent?.rose;
    accentLight = themeUse?.accent?.roseLight;
  } else if (ObjectTypeEnum.PIPELINE == objectType) {
    accent = themeUse?.accent?.cyan;
    accentLight = themeUse?.accent?.cyanLight;
  } else if (ObjectTypeEnum.TRIGGER == objectType) {
    accent = themeUse?.accent?.rose;
    accentLight = themeUse?.accent?.roseLight;
  }

  if (metadata?.action_timestamp) {
    const temp = accentLight;
    accentLight = accent;
    accent = temp;
  }

  return {
    accent,
    accentLight,
  };
}

export const ItemStyle = styled.div<{
  onClick: () => void;
}>`
  border-radius: ${BORDER_RADIUS}px;
  cursor: pointer;
  height: ${ITEM_ROW_HEIGHT}px;
  padding: ${1.5 * UNIT}px;
`;
