import { ThemeProvider } from 'styled-components';
import V2ThemeType, { ThemeSettingsType } from '@mana/themes/interfaces';
import V2Head from '@mana/elements/Head';
import { LayoutVersionEnum } from '@utils/layouts';
import { getTheme } from '@mana/themes/utils';
import { AppProps } from 'next/app';

function NextAppV2({ Component }: AppProps) {
  return (
    <ThemeProvider theme={getTheme() as V2ThemeType}>
      <Component />
    </ThemeProvider>
  );
}

export default NextAppV2;
