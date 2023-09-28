import light from '@oracle/styles/themes/light';
import { ThemeType } from '@oracle/styles/themes/constants';

export const getChartColors = (themeContext: ThemeType) => {
  const {
    brand: {
      earth200,
      earth300,
      earth400,
      energy200,
      energy300,
      energy400,
      fire200,
      fire300,
      fire400,
      water200,
      water300,
      water400,
      wind200,
      wind300,
      wind400,
    },
    chart: {
      backgroundPrimary,
      backgroundSecondary,
      backgroundTertiary,
    },
  } = themeContext || light;

  const COLORS = [
    wind400,
    water400,
    fire400,
    energy400,
    earth400,
    wind300,
    water300,
    fire300,
    energy300,
    earth300,
    wind200,
    water200,
    fire200,
    energy200,
    earth200,
  ];

  return [
    backgroundPrimary,
    backgroundSecondary,
    backgroundTertiary,
    ...COLORS,
  ];
};
