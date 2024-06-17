import styles from '@styles/scss/components/Canvas/Nodes/BlockNode.module.scss';
import { ConfigurationOptionType, BorderConfigType, TitleConfigType } from './types';
import Grid from '@mana/components/Grid';

type BlockNodeProps = {
  borderConfig?: BorderConfigType;
  collapsed?: boolean;
  configurationOptions?: ConfigurationOptionType[];
  titleConfig?: TitleConfigType;
};

export function BlockNode({
  borderConfig,
}: BlockNodeProps) {
  return (
    <div
      className={[
        styles.blockNode,
      ].join(' ')}
    >
      <Grid>
      </Grid>
    </div>
  );
}
