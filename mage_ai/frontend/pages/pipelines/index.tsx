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
  const { data } = api.pipelines.list({ include_schedules_count: 1 });

  const pipelines = useMemo(() => data?.pipelines || [], [data]);

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
            router.push('/pipelines/[pipeline]/edit', `/pipelines/${uuid}/edit`);
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

  return (
    <Dashboard
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
          <Text bold monospace muted>
            Name
          </Text>,
          <Text bold monospace muted>
            Blocks
          </Text>,
          <Text bold monospace muted>
            Schedules
          </Text>,
          null,
        ]}
        columnFlex={[5, 2, 2, 1]}
        rows={pipelines.map(({
          blocks,
          name,
          schedules_count: schedulesCount,
        }) => {
          const blocksCount = blocks.filter(({ type }) => BlockTypeEnum.SCRATCHPAD !== type).length;

          return [
            <Text>
              {name}
            </Text>,
            <Text muted={blocksCount === 0}>
              {blocksCount}
            </Text>,
            <Text muted={schedulesCount === 0}>
              {schedulesCount}
            </Text>,
            <Flex flex={1} justifyContent="flex-end">
              <ChevronRight muted size={2 * UNIT} />
            </Flex>
          ];
        })}
      />
    </Dashboard>
  );
}

export default PipelineListPage;
