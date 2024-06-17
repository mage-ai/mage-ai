import Grid from '@mana/components/Grid';
import Text from '@mana/elements/Text';
import Badge from '@mana/elements/Badge';
import Circle from '@mana/elements/Circle';
import { ConfigurationOptionType, BorderConfigType, TitleConfigType } from './types';
import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { getBlockColor } from '@mana/themes/blocks';
import Aside from './Blocks/Aside';
import GradientContainer from '@mana/elements/Gradient';

type BlockNodeProps = {
  borderConfig?: BorderConfigType;
  collapsed?: boolean;
  configurationOptions?: ConfigurationOptionType[];
  titleConfig?: TitleConfigType;
};

export function BlockNode({
  borderConfig,
  titleConfig,
}: BlockNodeProps) {
  const { borders } = borderConfig || {};
  const { asides, badge, inputConnection, outputConnection } = titleConfig || {};
  const { before } = asides || {};

  const classNames = [
    styles.blockNode,
    borders?.length >= 2
      ? ''
      : borders?.length === 1
        ?  styles[`border-color-${borders?.[0]?.baseColorName?.toLowerCase()}`]
        : '',
  ];
  console.log(styles);

  const main = (
    <div className={classNames.join(' ')}>
      <Grid
        rowGap={8}
        templateRows="auto"
      >
        <Grid
          alignItems="center"
          columnGap={8}
          templateColumns={[
            inputConnection ? 'auto' : '1fr',
            inputConnection && outputConnection ? '1fr' : '',
            outputConnection ? 'auto' : '',
          ].join(' ')}
          templateRows="1fr"
        >
          {inputConnection && (
            <Circle
              backgroundColor={getBlockColor(inputConnection?.fromItem?.type, { getColorName: true })?.names?.base}
              size={12}
            />
          )}
          {badge && <Badge {...badge} />}
          {outputConnection && (
            <Circle
              backgroundColor={getBlockColor(outputConnection?.toItem?.type, { getColorName: true })?.names?.base}
              size={12}
            />
          )}
        </Grid>
        <Grid alignItems="center" columnGap={12} templateColumns="auto 1fr" templateRows="1fr">
          {before && <Aside {...before} />}

          <Text semibold small>{titleConfig?.label}</Text>
        </Grid>
      </Grid>
    </div>
  );

  if (borders?.length >= 1) {
    return (
      <GradientContainer borderColors={borders?.slice?.(0, 2)?.map(b => b.baseColorName)}>
        {main}
      </GradientContainer>
    );
  }

  return main;
}
