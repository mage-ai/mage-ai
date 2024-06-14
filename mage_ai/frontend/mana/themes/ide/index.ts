import { BackgroundsType, ColorsType } from '../colors';
import { ModeEnum } from '../modes';
import { rules as rulesDark } from './dark';
import { rules as rulesLight } from './light';

export interface IDEType {
  background: {
    color: BackgroundsType['ide'];
  };
  rules: {
    [ModeEnum.DARK]: Record<string, Record<string, string>>;
    [ModeEnum.LIGHT]: Record<string, Record<string, string>>;
  };
}

export default function build(colors: ColorsType): IDEType {
  return {
    background: {
      color: colors.backgrounds.ide,
    },
    rules: {
      [ModeEnum.DARK]: rulesDark(colors),
      [ModeEnum.LIGHT]: rulesLight(colors),
    },
  };
}
