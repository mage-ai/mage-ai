import React, { useContext } from 'react';

export type BrandColorType = {
  earth?: boolean;
  energy?: boolean;
  fire?: boolean;
  inverted?: boolean;
  stone?: boolean;
  water?: boolean;
  wind?: boolean;
};

export type ModelThemeType = {
  chatBubbleProps: BrandColorType;
  graphicButtonProps: BrandColorType & {
    Icon: any;
    iconName: string;
  };
  logoProps: BrandColorType;
  mageImageUrl: string;
  mascotImageUrls: {
    base: string;
    castingSpell: string;
    chargingUp: string;
    thinking: string;
  };
  sharedProps: BrandColorType;
};

const DEFAULT_PROPS = {
  chatBubbleProps: null,
  graphicButtonProps: null,
  logoProps: null,
  mageImageUrl: null,
  mascotImageUrls: {
    base: null,
    castingSpell: null,
    chargingUp: null,
    thinking: null,
  },
  sharedProps: null,
};
const ModelThemeContext = React.createContext<ModelThemeType>(DEFAULT_PROPS);

export const useModelTheme = () => useContext(ModelThemeContext) || DEFAULT_PROPS;

export default ModelThemeContext;
