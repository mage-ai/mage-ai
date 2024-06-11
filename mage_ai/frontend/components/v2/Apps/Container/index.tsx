import React from 'react';

import Button, { ButtonGroup } from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import Grid from '@mana/components/Grid';
import { AddAppFunctionOptionsType, AppConfigType } from '@components/v2/Apps/interfaces';
import { AppSubtypeEnum, AppTypeEnum } from '@components/v2/Apps/constants';
import TextInput from '@mana/elements/Input/TextInput';
import { Close, CaretRight, CaretLeft, CaretUp, CaretDown } from '@mana/icons';
import { Header } from './index.style';
import { randomSimpleHashGenerator } from '@utils/string';

// import useBrowser from '@components/v2/Apps/Browser/useBrowser';
// import EditorApp from '@components/v2/Apps/Editor';

type AppContainerProps = {
  app: AppConfigType;
  onAdd?: (app: AppConfigType, opts?: AddAppFunctionOptionsType) => void;
  onRemove?: (uuid: string) => void;
  uuid: string;
};

function AppContainer({
  app,
  onAdd,
  onRemove,
  uuid,
}: AppContainerProps, ref: React.Ref<HTMLDivElement>) {
  const { subtype, type } = app;

  function addApp(rowRelative: number, columnRelative: number) {
    onAdd(
      {
        subtype,
        type,
        uuid: randomSimpleHashGenerator(),
      },
      {
        grid: {
          relative: {
            layout: {
              column: columnRelative,
              row: rowRelative,
            },
            uuid,
          },
        },
      },
    );
  }

  // const { main, toolbars } = useBrowser({ app });

  return (
    <Grid borders justifyContent="stretch" justifyItems="stretch" ref={ref}>
      <Grid
        autoFlow="column"
        justifyContent="stretch"
        justifyItems="stretch"
        style={{
          position: 'relative',
        }}
        templateColumns="1fr"
        templateRows="1fr"
      >
        <Header>
          <Grid
            autoFlow="column"
            columnGap={12}
            templateColumns="auto 1fr"
          >
            <Button
              onClick={() => {
                console.log('browse');
              }}
              small
            >
              Browse
            </Button>

            <TextInput basic monospace placeholder="/" small />
          </Grid>

          <ButtonGroup itemsContained>
            <Button Icon={CaretDown} basic grouped onClick={() => addApp(1, 0)} small />
            <Button Icon={CaretUp} basic grouped onClick={() => addApp(-1, 0)} small />
            <Button Icon={CaretLeft} basic grouped onClick={() => addApp(0, -1)} small />
            <Button Icon={CaretRight} basic grouped onClick={() => addApp(0, 1)} small />
            <Divider vertical />
            <Button Icon={Close} basic grouped onClick={() => onRemove(uuid)} small />
          </ButtonGroup>
        </Header>

        {/* {type === AppTypeEnum.EDITOR && subtype === AppSubtypeEnum.IDE && <EditorApp app={app} />}
        {type === AppTypeEnum.BROWSER && subtype === AppSubtypeEnum.SYSTEM && main} */}
      </Grid>
    </Grid>
  );
}

export default React.forwardRef(AppContainer);
