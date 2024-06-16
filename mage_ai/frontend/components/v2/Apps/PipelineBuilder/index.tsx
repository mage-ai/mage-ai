import dynamic from 'next/dynamic';

import Grid from '@mana/components/Grid';
import styles from '@styles/scss/pages/PipelineBuilder/Main.module.scss';

export default function PipelineBuilder() {
  const PipelineBuilderCanvas = dynamic(() => import('../PipelineBuilderCanvas'), {
    ssr: false,
  });

  return (
    <div className={styles.container}>
      <Grid
        autoColumns="auto"
        height="inherit"
        templateRows="auto 1fr auto"
        width="100%"
      >
        <div />

        <Grid
          autoRows="auto"
          height="inherit"
          templateColumns="auto 1fr"
          width="100%"
        >
          <div />

          <PipelineBuilderCanvas />
        </Grid>

        <div />
      </Grid>
    </div>
  );
}
