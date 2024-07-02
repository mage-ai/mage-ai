import React, { useEffect } from 'react';
import Route from '@components/v2/Route';
import dynamic from 'next/dynamic';
import useExecutionManager from '@components/v2/ExecutionManager/useExecutionManager';
import { NextPageContext } from 'next';
import { PipelineExecutionFrameworkUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';

const Builder = dynamic(() => import('@components/v2/Layout/Pipelines/Detail/Builder'), { ssr: false });
const Detail = dynamic(() => import('@components/v2/Layout/Pipelines/Detail'), { ssr: false });

function PipelineDetailPage({ slug }: { slug: string[] }) {
  const {
    teardown,
    useExecuteCode: useExecuteCodeBase,
    useRegistration: useRegistrationBase,
  } = useExecutionManager();

  function useExecuteCode(channel: string = slug.join('/'), stream: string = '') {
    return useExecuteCodeBase(channel, stream);
  }

  function useRegistration(channel: string = slug.join('/'), stream: string = '') {
    return useRegistrationBase(channel, stream);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => teardown(), []);

  if (slug?.length >= 1) {
    const uuid: string = slug[0];
    const pageName = slug[1];
    let frameworkUUID: string = null;

    if (slug.length >= 3 && slug[2] === PipelineExecutionFrameworkUUIDEnum.RAG) {
      frameworkUUID = String(slug[2]) as string;
    }

    const Layout = pageName === 'builder' ? Builder : Detail;
    return (
      <Layout
        // @ts-ignore
        frameworkUUID={frameworkUUID ?? undefined}
        useExecuteCode={useExecuteCode}
        useRegistration={useRegistration}
        uuid={uuid ?? undefined}
      />
    );
  }

  return <div />;
}

PipelineDetailPage.getInitialProps = async (ctx: NextPageContext) => {
  const { slug } = ctx.query;
  return {
    slug,
  };
};

export default Route(PipelineDetailPage);