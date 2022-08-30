import { useMemo } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType'
import Dashboard from '@components/Dashboard';
import Flex from '@oracle/components/Flex';
import FlexTable from '@oracle/components/FlexTable';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Text from '@oracle/elements/Text';
import api from '@api';
import { Add, ChevronRight } from '@oracle/icons';
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
            router.push('/pipelines/[pipeline]', `/pipelines/${uuid}`);
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

  const pipelines = useMemo(() => data?.pipelines || [], [data]);
  const projects = dataProjects?.projects;

  return (
    <Dashboard
      projects={projects}
      subheaderChildren={
        <KeyboardShortcutButton
          background={BUTTON_GRADIENT}
          bold
          beforeElement={<Add size={2.5 * UNIT} />}
          inline
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
    >
      <FlexTable
        buildLinkProps={(rowIndex: number) => ({
          as: `/pipelines/${pipelines[rowIndex].uuid}`,
          href: '/pipelines/[pipeline]',
        })}
        columnHeaders={[
          <Text bold monospace>
            Name
          </Text>,
          <Text bold monospace>
            Blocks
          </Text>,
          null,
        ]}
        columnFlex={[8, 1, 1]}
        rows={pipelines.map(({
          blocks,
          name,
        }) => [
          <Text>
            {name}
          </Text>,
          <Text>
            {blocks.filter(({ type }) => BlockTypeEnum.SCRATCHPAD !== type).length}
          </Text>,
          <Flex flex={1} justifyContent="flex-end">
            <ChevronRight muted size={2 * UNIT} />
          </Flex>
        ])}
      />
    </Dashboard>
  );
}

export default PipelineListPage;
