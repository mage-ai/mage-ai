import PipelineList from '@components/PipelineList';
import api from '@api';

function PipelineListPage() {
  const {
    data,
  } = api.pipelines.list();
  const pipelines = data?.pipelines;

  return (
    <PipelineList pipelines={pipelines} />
  );
}

PipelineListPage.getInitialProps = async (ctx: any) => ({});

export default PipelineListPage;
