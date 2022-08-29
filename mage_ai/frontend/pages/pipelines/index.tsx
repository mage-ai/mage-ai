import { NextPage } from 'next';

import api from '@api';

function PipelineListPage(): NextPage {
  const {
    data,
  } = api.pipelines.list();
  const pipelines = data?.pipelines;

  console.log(pipelines)

  return (
    <div>
    </div>
  );
}

PipelineListPage.getInitialProps = async (ctx: any) => {
  return {

  };
};

export default PipelineListPage;
