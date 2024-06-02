import Colors, { ColorsType } from './colors';
import ThemeType, { ThemeSettingsType, ThemeTypeEnum, ValueMappingType } from './interfaces';
import { DEFAULT_MODE, ModeEnum, ModeType } from './modes';
import { mergeDeep, setNested } from '@utils/hash';
import backgrounds, { BackgroundsType } from './backgrounds';
import borders, { BordersType } from './borders';
import buttons, { ButtonsType } from './buttons';
import fonts, { FontsType } from './fonts';
import margin, { MarginType } from './margin';
import padding, { PaddingType } from './padding';

function unflatten(mapping: { [key: string]: ModeType }): any {
  return Object.entries(mapping).reduce((acc, [key, modeValues]) => {
    const values = Object.entries(modeValues).reduce((acc2, [mode, color]) => ({
      ...acc2,
      [mode]: Colors[color][mode],
    }), {});
    const obj = setNested(acc, key, values);

    return mergeDeep(acc, obj);
  }, {} as any);
}

function extractValueInMode(mode: ModeEnum, mapping: any) {
  return Object.entries(mapping).reduce((acc, [key, value]) => ({
    ...acc,
    [key]: typeof value === 'object'
      ? Object.keys(value as object).some(key => key === mode)
        ? value[mode]
        : extractValueInMode(mode, value)
      : value,
  }), {});
}

interface CombinerType {
  colors: ColorsType;
  combine: (
    modeValues: (colors: ColorsType) => ValueMappingType | { [key: string]: ModeType },
    overrideThemeKey?: string,
  ) => ValueMappingType;
}

class Combiner implements CombinerType {
  public colors: ColorsType;
  private mode: ModeEnum;
  private theme: ThemeType;

  constructor(public themeSettings?: ThemeSettingsType) {
    const {
      mode,
      theme,
      type,
    } = themeSettings || {} as ThemeSettingsType;

    this.mode = mode || DEFAULT_MODE;

    if (ThemeTypeEnum.SYSTEM === type && typeof window !== 'undefined') {
      this.mode = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? ModeEnum.DARK
        : ModeEnum.LIGHT;
    }

    this.theme = null;
    if (ThemeTypeEnum.CUSTOM === type) {
      this.theme = theme;
    }


    this.colors = {
      ...extractValueInMode(this.mode, Colors),
      ...(this.theme?.colors || {}),
    } as ColorsType;

    this.combine = this.combine.bind(this);
  }

  public combine(
    modeValues: (colors: ColorsType) => ValueMappingType
      | BackgroundsType
      | BordersType
      | ButtonsType
      | ColorsType
      | FontsType
      | MarginType
      | PaddingType
      | { [key: string]: ModeType },
    overrideThemeKey?: string,
  ): ValueMappingType {
    const values = extractValueInMode(this.mode, modeValues(this.colors));

    return {
      ...(values || {}),
      ...(this.theme?.[overrideThemeKey] || {}),
    };
  }
}

export default function buildTheme(themeSettings?: ThemeSettingsType): ThemeType {
  const combiner = new Combiner(themeSettings);

  const elements = Object.entries({
    backgrounds,
    borders,
    buttons,
    fonts,
    margin,
    padding,
  }).reduce((acc, [key, value]) => ({
    ...acc,
    [key]: combiner.combine(value, key),
  }), {} as ThemeType);

  return {
    ...elements,
    colors: combiner.colors,
  };
}
