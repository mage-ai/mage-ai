import React from 'react';

import Button from '@mana/elements/Button';
import Grid from '@mana/components/Grid';
import Padding from '@mana/elements/Padding';
import TextInput from '@mana/elements/Input/TextInput';
import { AppLoaderProps } from '../../../../interfaces';

function ToolbarTop(_props: AppLoaderProps, ref: React.Ref<HTMLDivElement>) {
  return (
    <Padding bottom='small' top='small'>
      <Grid columnGap={12} templateColumns='auto 1fr' templateRows='1fr'>
        <Button
          onClick={() => {
            console.log('browse');
          }}
          small
        >
          Browse
        </Button>

        <TextInput basic monospace placeholder='/' small />
      </Grid>
    </Padding>
  );
}

export default React.forwardRef(ToolbarTop);
