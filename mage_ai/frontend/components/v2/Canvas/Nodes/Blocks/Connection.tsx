import { ConnectionType, ConnectionPortType } from '../types';
import BlockType, { StatusTypeEnum } from '@interfaces/BlockType';
import Text from '@mana/elements/Text';
import Circle from '@mana/elements/Circle';
import Grid from '@mana/components/Grid';
import { getBlockColor } from '@mana/themes/blocks';
import { randomSample } from '@utils/array';
import { useMemo } from 'react';

type ConnectionProps = {
  block: BlockType;
  connection: ConnectionType;
  emphasized?: boolean;
};

const TEST = false;

export default function Connection({ block, connection }: ConnectionProps) {
  const { fromPort, toPort } = connection;

  const fromItem = connection?.fromItem && connection?.fromItem?.uuid !== block?.uuid && connection?.fromItem;
  const fromItemFailed = StatusTypeEnum.FAILED === randomSample([
    StatusTypeEnum.EXECUTED,
    StatusTypeEnum.FAILED,
    StatusTypeEnum.NOT_EXECUTED,
    StatusTypeEnum.UPDATED,,
  ]);
  const fromItemColor = TEST && fromItemFailed
    ? null
    : (getBlockColor(fromItem?.type, { getColorName: true })?.names?.base || 'gray')?.toLowerCase();

  const toItem = connection?.toItem && connection?.toItem?.uuid !== block?.uuid && connection?.toItem;
  const toItemFailed = StatusTypeEnum.FAILED === randomSample([
    StatusTypeEnum.EXECUTED,
    StatusTypeEnum.FAILED,
    StatusTypeEnum.NOT_EXECUTED,
    StatusTypeEnum.UPDATED,,
  ]);
  const toItemColor = TEST && toItemFailed
    ? null
    : (getBlockColor(toItem?.type, { getColorName: true })?.names?.base || 'gray')?.toLowerCase();

  // const randomBoolean = (Number(new Date()) * (fromItem?.uuid?.length || 1) * (toItem?.uuid?.length || 1)) % 2 === 0;

  // console.log(block);
  // console.log(fromItem, toItem);
  // console.log(fromPort, toPort);

  const fromPortMemo = useMemo(() => fromItem && (
    <>
      {(fromPort ?? { render: el => el })?.render(
        <Circle
          backgroundColor={fromPort ? fromItemColor : undefined}
          borderColor={fromPort
            ? fromItemColor ? false : 'gray'
            : 'red'}
          size={12}
        />,
      )}

      <Text italic={!fromPort} muted small>
        {fromItem?.name}
      </Text>
    </>
  ), [fromItem, fromPort, fromItemColor]);

  const toPortMemo = useMemo(() => toItem && (
    <>
      <Text italic={!toPort} muted small>
        {toItem?.name}
      </Text>

      {(toPort ?? { render: el => el })?.render(
        <Circle
          backgroundColor={toPort ? toItemColor : undefined}
          borderColor={toPort
            ? fromItemColor ? false : 'gray'
            : 'red'}
          size={12}
        />,
      )}
    </>
  ), [toItem, toPort, toItemColor]);

  return (
    <Grid
      alignItems="center"
      columnGap={8}
      templateColumns={[
        fromItem ? '1fr' : 'auto',
        toItem ? '1fr' : 'auto',
      ].join(' ')}
      templateRows="1fr"
    >
      <Grid alignItems="center" columnGap={8} justifyItems="start" templateColumns="auto 1fr" templateRows="1fr">
        {fromPortMemo}
      </Grid>

      <Grid alignItems="center" columnGap={8} justifyItems="end" templateColumns="1fr auto" templateRows="1fr">
        {toPortMemo}
      </Grid>
    </Grid>
  );
}
