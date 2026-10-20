import { useEffect, useState } from 'react';

import CustomTemplateType, {
  OBJECT_TYPE_BLOCKS,
  OBJECT_TYPE_PIPELINES,
} from '@interfaces/CustomTemplateType';
import Dashboard from '@components/Dashboard';
import PipelineTemplateDetail from '@components/CustomTemplates/PipelineTemplateDetail';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import TemplateDetail from '@components/CustomTemplates/TemplateDetail';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { queryFromUrl } from '@utils/url';

type TemplateDetailsProps = {
  objectType?: string;
  slug: string;
};

function TemplateDetails({
  objectType: objectTypeProp,
  slug: templateUUID,
}: TemplateDetailsProps) {
  const { object_type: objectTypeFromUrl } = queryFromUrl();
  const [template, setTemplate] = useState<CustomTemplateType>(null);

  const objectType = objectTypeFromUrl || objectTypeProp || OBJECT_TYPE_BLOCKS;
  const isPipeline = OBJECT_TYPE_PIPELINES === objectType;

  const {
    data: dataCustomTemplate,
  } = api.custom_templates.detail(
    templateUUID && encodeURIComponent(templateUUID),
    {
      object_type: objectType,
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
            href: isPipeline ? `/templates?object_type=${OBJECT_TYPE_PIPELINES}` : '/templates',
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
        <>
          {(!objectType || OBJECT_TYPE_BLOCKS === objectType) && (
            <TemplateDetail
              // We need this or else the block code doesn’t update when coming back to the page.
              key={template?.content?.slice(0, 40)}
              template={template}
            />
          )}

          {isPipeline && (
            <PipelineTemplateDetail
              template={template}
            />
          )}
        </>
      )}
    </Dashboard>
  );
}

TemplateDetails.getInitialProps = async (ctx) => {
  const {
    object_type: objectType,
    slug,
  }: {
    object_type?: string;
    slug: string[],
  } = ctx.query;

  return {
    objectType,
    slug,
  };
};

export default PrivateRoute(TemplateDetails);
