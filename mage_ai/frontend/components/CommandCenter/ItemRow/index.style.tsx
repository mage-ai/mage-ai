import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { CommandCenterItemType, ItemTypeEnum, ObjectTypeEnum } from '@interfaces/CommandCenterType';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { ThemeType } from '@oracle/styles/themes/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { dig } from '@utils/hash';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { transition } from '@oracle/styles/mixins';

export const MAX_WIDTH = 94 * UNIT;
export const ITEM_ROW_HEIGHT = 44;
export const ITEM_ROW_MAX_WIDTH = MAX_WIDTH - (SCROLLBAR_WIDTH * 2);

export function getIconColor(item: CommandCenterItemType, opts: {
  theme?: ThemeType;
} = {}): {
  accent?: string;
  accentLight?: string;
  useStroke?: boolean;
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

  const colorUUID = displaySettingsByAttribute?.icon?.color_uuid;
  const strokeUUID = displaySettingsByAttribute?.icon?.stroke_uuid;

  const themeUse = (theme || dark);

  let accent = themeUse?.monotone?.gray;
  let accentLight = themeUse?.monotone?.grey500;
  let useStroke = false;

  if (ItemTypeEnum.MODE_DEACTIVATION === item?.item_type) {
    return {
      accent,
      accentLight,
    };
  }

  if (colorUUID) {
    accent = dig(themeUse, colorUUID);
    accentLight = dig(themeUse, colorUUID);
  } else if (strokeUUID) {
    accent = dig(themeUse, strokeUUID);
    accentLight = dig(themeUse, strokeUUID);
    useStroke = true;
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
  } else if (ObjectTypeEnum.PROJECT == objectType) {
    accent = themeUse?.accent?.rose;
    accentLight = themeUse?.accent?.roseLight;
  } else if (ObjectTypeEnum.PIPELINE == objectType) {
    accent = themeUse?.accent?.cyan;
    accentLight = themeUse?.accent?.cyanLight;
  } else if ([ObjectTypeEnum.PIPELINE_RUN, ObjectTypeEnum.REMOTE].includes(objectType)) {
    accent = themeUse?.accent?.teal;
    accentLight = themeUse?.accent?.tealLight;
  } else if (ObjectTypeEnum.TRIGGER == objectType) {
    accent = themeUse?.accent?.rose;
    accentLight = themeUse?.accent?.roseLight;
  }

  // Recently viewed pages
  if (metadata?.page?.timestamp) {
    accent = themeUse?.content?.active;
    accentLight = themeUse?.content?.default;
  }

  return {
    accent,
    accentLight,
    useStroke,
  };
}

export const ItemStyle = styled.div<{
  className: string;
  onClick: (e: Event) => void;
}>`
  border-radius: ${BORDER_RADIUS}px;
  cursor: pointer;
  height: ${ITEM_ROW_HEIGHT}px;
  left: ${SCROLLBAR_WIDTH}px;
  max-width: ${ITEM_ROW_MAX_WIDTH}px;
  padding: ${1.5 * UNIT}px;
  position: relative;
`;
