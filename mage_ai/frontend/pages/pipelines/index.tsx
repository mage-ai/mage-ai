import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Dashboard from '@components/Dashboard';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import api from '@api';
import { Add } from '@oracle/icons';
import { BUTTON_GRADIENT } from '@oracle/styles/colors/gradients';
import { UNIT } from '@oracle/styles/units/spacing';
import { onSuccess } from '@api/utils/response';
import { randomNameGenerator } from '@utils/string';

function PipelineListPage() {
  const router = useRouter();
  const {
    data,
  } = api.pipelines.list();
  const { data: dataProjects } = api.projects.list();

  const [createPipeline, { isLoading }] = useMutation(
    api.pipelines.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline: {
              uuid,
            },
          }) => {
            router.push('/pipelines/[...slug]', `/pipelines/${uuid}`);
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      ),
    },
  );

  const pipelines = data?.pipelines;
  const projects = dataProjects?.projects;

  return (
    <Dashboard
      projects={projects}
      subheaderChildren={
        <KeyboardShortcutButton
          background={BUTTON_GRADIENT}
          bold
          beforeElement={<Add size={2.5 * UNIT} />}
          loading={isLoading}
          // @ts-ignore
          onClick={() => createPipeline({
            pipeline: {
              name: randomNameGenerator(),
            },
          })}
          uuid="PipelineListPage/new_pipeline"
        >
          New pipeline
        </KeyboardShortcutButton>
      }
      title="Pipelines"
    />
  );
}

export default PipelineListPage;
