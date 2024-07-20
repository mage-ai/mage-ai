import dynamic from 'next/dynamic';
import { SearchV3, ChatV2, Code, DocumentIcon, Builder, CaretDown, CaretLeft } from '@mana/icons';
import Grid from '@mana/components/Grid';
import stylesHeader from '@styles/scss/layouts/Header/Header.module.scss';
import stylesPipelineBuilder from '@styles/scss/pages/PipelineBuilder/PipelineBuilder.module.scss';
import { useContext, useEffect } from 'react';
import { LayoutContext } from '@context/v2/Layout';
import DetailLayout from '../DetailLayout';

interface PipelineDetailProps {
  frameworkUUID?: string;
  useExecuteCode: any;
  useRegistration: any;
  uuid?: string;
}

const PipelineCanvas = dynamic(() => import('@components/v2/Apps/PipelineCanvas'), { ssr: false });

function PipelineBuilder({ frameworkUUID, uuid, ...props }: PipelineDetailProps) {
  const { header, page } = useContext(LayoutContext);

  useEffect(() => {
    if (frameworkUUID && uuid) {
      header?.setHeader && header?.setHeader?.({
        buildInterAppNavItems: (items, { router }) => [
          {
            Icon: Builder,
            onClick: () => {
              router.push({
                pathname: '/v2/pipelines/[slug]/builder/[framework]',
                query: {
                  framework: 'rag',
                  slug: 'rag1',
                },
              });
            },
            uuid: 'builder',
          },
          ...items?.filter(({ uuid }) => uuid === 'code'),
        ],
        cacheKey: [frameworkUUID, uuid].join(':'),
        selectedNavItem: 'builder',
        version: 0,
      });

      page?.setPage && page?.setPage?.({
        success: true,
        title: 'Ultra Mage',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameworkUUID, uuid]);

  return (
    <DetailLayout loadEditorServices>
      <div className={[stylesHeader.content, stylesPipelineBuilder.container].join(' ')}>
        <Grid autoColumns="auto" height="inherit" templateRows="auto 1fr auto" width="100%">
          <div />

          <Grid autoRows="auto" height="inherit" templateColumns="auto 1fr" width="100%">
            <div />
            <PipelineCanvas {...props} executionFrameworkUUID={frameworkUUID} pipelineUUID={uuid} />
          </Grid>

          <div />
        </Grid>
      </div>
    </DetailLayout>
  );
}

export default PipelineBuilder;
