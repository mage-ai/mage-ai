import { useEffect, useState } from 'react';

import CustomTemplateType, { OBJECT_TYPE_BLOCKS } from '@interfaces/CustomTemplateType';
import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import TemplateDetail from '@components/CustomTemplates/TemplateDetail';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type TemplateDetailsProps = {
  slug: string;
};

function TemplateDetails({
  slug: templateUUID,
}: TemplateDetailsProps) {
  const [template, setTemplate] = useState<CustomTemplateType>(null);

  const {
    data: dataCustomTemplate,
  } = api.custom_templates.detail(
    templateUUID && encodeURIComponent(templateUUID),
    {
      object_type: OBJECT_TYPE_BLOCKS,
    },
  );

  // We need this or else the block code doesn’t update when coming back to the page.
  useEffect(() => {
    if (dataCustomTemplate) {
      setTemplate(dataCustomTemplate?.custom_template);
    }
  }, [dataCustomTemplate]);

  return (
    <Dashboard
      addProjectBreadcrumbToCustomBreadcrumbs
      breadcrumbs={[
        {
          label: () => 'Templates',
          linkProps: {
            href: '/templates',
          },
        },
        {
          bold: true,
          label: () => templateUUID,
        },
      ]}
      title={templateUUID}
      uuid="TemplatesDetail/index"
    >
      {!dataCustomTemplate && (
        <Spacing p={PADDING_UNITS}>
          <Spinner inverted />
        </Spacing>
      )}
      {template && (
        <TemplateDetail
          // We need this or else the block code doesn’t update when coming back to the page.
          key={template?.content?.slice(0, 40)}
          template={template}
        />
      )}
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
