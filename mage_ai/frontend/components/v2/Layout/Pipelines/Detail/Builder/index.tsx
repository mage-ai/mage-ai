import dynamic from 'next/dynamic';
import Grid from '@mana/components/Grid';
import styles from '@styles/scss/pages/PipelineBuilder/PipelineBuilder.module.scss';
import { PipelineDetailProps } from '../interfaces';
import { useContext, useEffect } from 'react';
import { LayoutContext } from '@context/v2/Layout';
import DetailLayout from '../DetailLayout';

const Canvas = dynamic(() => import('../../../../Apps/PipelineCanvas'), { ssr: false });

function PipelineBuilder({ frameworkUUID, uuid, ...props }: PipelineDetailProps) {
  const { header, page } = useContext(LayoutContext);

  useEffect(() => {
    if (frameworkUUID && uuid) {
      header.setHeader({
        navTag: frameworkUUID,
        selectedNavItem: 'builder',
        title: uuid,
      });

      page.setPage({
        error: true,
        title: 'Ultra Mage',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameworkUUID, uuid]);

  return (
    <DetailLayout loadEditorServices>
      <div className={styles.container}>
        <Grid autoColumns="auto" height="inherit" templateRows="auto 1fr auto" width="100%">
          <div />

          <Grid autoRows="auto" height="inherit" templateColumns="auto 1fr" width="100%">
            <div />

            <Canvas
              {...props}
              executionFrameworkUUID={frameworkUUID}
              pipelineUUID={uuid}
            />
          </Grid>

          <div />
        </Grid>
      </div>
    </DetailLayout >
  );
}

export default PipelineBuilder;
