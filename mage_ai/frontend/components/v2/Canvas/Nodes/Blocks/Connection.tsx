import { ConnectionType } from '../types';
import BlockType, { StatusTypeEnum } from '@interfaces/BlockType';
import Text from '@mana/elements/Text';
import Circle from '@mana/elements/Circle';
import Grid from '@mana/components/Grid';
import { getBlockColor } from '@mana/themes/blocks';
import { randomSample } from '@utils/array';

type ConnectionProps = {
  block: BlockType;
  connection: ConnectionType;
  emphasized?: boolean;
};

const TEST = false;

export default function Connection({ block, connection, emphasized }: ConnectionProps) {
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

  const randomBoolean = (Number(new Date()) * (fromItem?.uuid?.length || 1) * (toItem?.uuid?.length || 1)) % 2 === 0;

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
        {fromItem && (
        <>
          <Circle
            backgroundColor={(!fromItemFailed && randomBoolean) || !TEST ? fromItemColor : null}
            borderColor={TEST && fromItemFailed ? 'red' : 'gray'}
            size={12}
          />

          <Text italic={randomBoolean} muted small>
            {fromItem?.name}
          </Text>
          </>
        )}
      </Grid>

      <Grid alignItems="center" columnGap={8} justifyItems="end" templateColumns="1fr auto" templateRows="1fr">
        {toItem && (
          <>
            <Text italic={!randomBoolean} muted small>
              {toItem?.name}
            </Text>

            <Circle
              backgroundColor={(!toItemFailed && randomBoolean) || !TEST ? toItemColor : null}
              borderColor={TEST && toItemFailed ? 'red' : 'gray'}
              size={12}
            />
          </>
        )}
      </Grid>
    </Grid>
  );
}
