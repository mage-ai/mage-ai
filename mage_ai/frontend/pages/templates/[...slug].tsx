import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import TemplateDetail from '@components/CustomTemplates/TemplateDetail';

type TemplateDetailsProps = {
  slug: string;
};

function TemplateDetails({
  slug,
}: TemplateDetailsProps) {
  return (
    <Dashboard
      title={slug}
      uuid="TemplatesDetail/index"
    >
      <TemplateDetail
        templateUUID={slug}
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

  return {
    slug,
  };
};

export default PrivateRoute(TemplateDetails);
