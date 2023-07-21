import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import TemplateDetail from '@components/CustomTemplates/TemplateDetail';
import api from '@api';

function TemplateDetails({
  slug,
}) {
  // DO WE WANT to pass the template UUID or the entire template object to TemplateDetail?
  return (
    <Dashboard
      title={slug}
      uuid="TemplatesDetail/index"
    >
      <TemplateDetail
      />
    </Dashboard>
  );
}

TemplateDetails.getInitialProps = async (ctx) => {
  const {
    slug,
  }: {
    slug: string[],
  } = ctx.query;

  // if (Array.isArray(slugArray)) {
  //   const [pipelineScheduleId, subpath] = slugArray;

  //   return {
  //     pipelineScheduleId,
  //     pipelineUUID,
  //     subpath,
  //   };
  // }

  return {
    slug,
  };
};

export default PrivateRoute(TemplateDetails);
