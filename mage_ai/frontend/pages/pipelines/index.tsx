import NextLink from 'next/link';
import { MutateFunction, useMutation } from 'react-query';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Dashboard from '@components/Dashboard';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import InputModal from '@oracle/elements/Inputs/InputModal';
import Link from '@oracle/elements/Link';
import PipelineType, {
  PipelineStatusEnum,
  PipelineTypeEnum,
  PIPELINE_TYPE_LABEL_MAPPING,
} from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import Toolbar from '@components/shared/Table/Toolbar';
import api from '@api';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { Clone, File, Open, Pause, PlayButtonFilled } from '@oracle/icons';
import { ScheduleStatusEnum } from '@interfaces/PipelineScheduleType';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize, randomNameGenerator } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { queryFromUrl } from '@utils/url';
import { useModal } from '@context/Modal';

const sharedOpenButtonProps = {
  borderRadius: BORDER_RADIUS_SMALL,
  iconOnly: true,
  noBackground: true,
  noBorder: true,
  outline: true,
  padding: '4px',
};

function PipelineListPage() {
  const router = useRouter();
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineType>(null);
  const [searchText, setSearchText] = useState<string>(null);
  const [pipelinesEditing, setPipelinesEditing] = useState<{
    [uuid: string]: boolean;
  }>({});
  const [errors, setErrors] = useState<ErrorsType>(null);

  const query = queryFromUrl();
  const { data, mutate: fetchPipelines } = api.pipelines.list({
    ...query,
    include_schedules: 1,
  });
  const pipelines: PipelineType[] = useMemo(() => {
    let pipelinesFinal: PipelineType[] = data?.pipelines || [];
    if (searchText) {
      const lowercaseSearchText = searchText.toLowerCase();
      pipelinesFinal = pipelinesFinal.filter(({ name, description, uuid }) =>
         name?.toLowerCase().includes(lowercaseSearchText)
          || uuid?.toLowerCase().includes(lowercaseSearchText)
          || description?.toLowerCase().includes(lowercaseSearchText),
      );
    }

    return pipelinesFinal;
  }, [data?.pipelines, searchText]);

  const useCreatePipelineMutation = (onSuccessCallback) => useMutation(
    api.pipelines.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline: {
              uuid,
            },
          }) => {
            onSuccessCallback?.(uuid);
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const [createPipeline, { isLoading: isLoadingCreate }]: [
    MutateFunction<any>,
    { isLoading: boolean },
  ] = useCreatePipelineMutation((pipelineUUID: string) => router.push(
    '/pipelines/[pipeline]/edit',
    `/pipelines/${pipelineUUID}/edit`,
  ));
  const [clonePipeline, { isLoading: isLoadingClone }]: [
    MutateFunction<any>,
    { isLoading: boolean },
  ] = useCreatePipelineMutation(() => fetchPipelines?.());

  const [updatePipeline, { isLoading: isLoadingUpdate }] = useMutation(
    (pipeline: PipelineType & {
      status?: ScheduleStatusEnum;
    }) => api.pipelines.useUpdate(pipeline.uuid)({ pipeline }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline: {
              uuid,
            },
          }) => {
            setPipelinesEditing(prev => ({
              ...prev,
              [uuid]: false,
            }));
            fetchPipelines();
            hideInputModal?.();
            setSelectedPipeline(null);
          },
          onErrorCallback: (response, errors) => {
            const pipelineUUID = response?.url_parameters?.pk;
            setPipelinesEditing(prev => ({
              ...prev,
              [pipelineUUID]: false,
            }));
            setErrors({
              errors,
              response,
            });
          },
        },
      ),
    },
  );
  const [deletePipeline, { isLoading: isLoadingDelete }] = useMutation(
    (uuid: string) => api.pipelines.useDelete(uuid)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipelines?.();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [showInputModal, hideInputModal] = useModal(({
    pipelineDescription,
    pipelineName,
  }: {
    pipelineDescription?: string;
    pipelineName?: string;
  }) => (
    <InputModal
      isLoading={isLoadingUpdate}
      minWidth={UNIT * 55}
      noEmptyValue={!!pipelineName}
      onClose={hideInputModal}
      onSave={(value: string) => {
        if (selectedPipeline) {
          const selectedPipelineUUID = selectedPipeline.uuid;
          const pipelineUpdateRequestBody: PipelineType = {
            uuid: selectedPipelineUUID,
          };
          if (pipelineName) {
            pipelineUpdateRequestBody.name = value;
          } else {
            pipelineUpdateRequestBody.description = value;
          }

          setPipelinesEditing(prev => ({
            ...prev,
            [selectedPipelineUUID]: true,
          }));
          updatePipeline(pipelineUpdateRequestBody);
        }
      }}
      textArea={!pipelineName}
      title={pipelineName
        ? 'Rename pipeline'
        : 'Edit description'
      }
      value={pipelineName ? pipelineName : pipelineDescription}
    />
  ), {} , [
    isLoadingUpdate,
    selectedPipeline,
  ], {
    background: true,
    uuid: 'rename_pipeline_and_save',
  });

  const toolbarEl = useMemo(() => (
    <Toolbar
      addButtonProps={{
        isLoading: isLoadingCreate,
        label: 'New',
        menuItems: [
          {
            label: () => 'Standard (batch)',
            onClick: () => createPipeline({
              pipeline: {
                name: randomNameGenerator(),
              },
            }),
            uuid: 'Pipelines/NewPipelineMenu/standard',
          },
          {
            label: () => 'Data integration',
            onClick: () => createPipeline({
              pipeline: {
                name: randomNameGenerator(),
                type: PipelineTypeEnum.INTEGRATION,
              },
            }),
            uuid: 'Pipelines/NewPipelineMenu/integration',
          },
          {
            label: () => 'Streaming',
            onClick: () => createPipeline({
              pipeline: {
                name: randomNameGenerator(),
                type: PipelineTypeEnum.STREAMING,
              },
            }),
            uuid: 'Pipelines/NewPipelineMenu/streaming',
          },
        ],
      }}
      deleteRowProps={{
        confirmationMessage: 'This is irreversible and will immediately delete everything associated \
          with the pipeline, including its blocks, triggers, runs, logs, and history.',
        isLoading: isLoadingDelete,
        item: 'pipeline',
        onDelete: () => deletePipeline(selectedPipeline?.uuid),
      }}
      filterOptions={{
        status: Object.values(PipelineStatusEnum),
        type: Object.values(PipelineTypeEnum),
      }}
      filterValueLabelMapping={PIPELINE_TYPE_LABEL_MAPPING}
      moreActionsMenuItems={[
        {
          label: () => 'Rename pipeline',
          onClick: () => showInputModal({ pipelineName: selectedPipeline?.name }),
          uuid: 'Pipelines/MoreActionsMenu/Rename',
        },
        {
          label: () => 'Edit description',
          onClick: () => showInputModal({ pipelineDescription: selectedPipeline?.description }),
          uuid: 'Pipelines/MoreActionsMenu/EditDescription',
        },
      ]}
      query={query}
      searchProps={{
        onChange: setSearchText,
        value: searchText,
      }}
      secondaryActionButtonProps={{
        Icon: Clone,
        confirmationDescription: 'Cloning the selected pipeline will create a new pipeline with the same \
          configuration and code blocks. The blocks use the same block files as the original pipeline. \
          Pipeline triggers, runs, backfills, and logs are not copied over to the new pipeline.',
        confirmationMessage: `Do you want to clone the pipeline ${selectedPipeline?.uuid}?`,
        isLoading: isLoadingClone,
        onClick: () => clonePipeline({
          pipeline: { clone_pipeline_uuid: selectedPipeline?.uuid },
        }),
        openConfirmationDialogue: true,
        tooltip: 'Clone pipeline',
      }}
      selectedRowId={selectedPipeline?.uuid}
      setSelectedRow={setSelectedPipeline}
    />
  ), [
    clonePipeline,
    createPipeline,
    deletePipeline,
    isLoadingClone,
    isLoadingCreate,
    isLoadingDelete,
    query,
    searchText,
    selectedPipeline?.description,
    selectedPipeline?.name,
    selectedPipeline?.uuid,
    showInputModal,
  ]);

  return (
    <Dashboard
      errors={errors}
      setErrors={setErrors}
      subheaderChildren={toolbarEl}
      title="Pipelines"
      uuid="pipelines/index"
    >
      {pipelines?.length === 0
        ? (
          <Spacing px ={3} py={1}>
            {!data
              ?
                <Spinner inverted large />
              :
                <Text bold default monospace muted>
                  No pipelines available
                </Text>
            }
          </Spacing>
        ): (
          <Table
            columnFlex={[null, 1, 3, 4, 1, 1, 1, null]}
            columns={[
              {
                label: () => '',
                uuid: 'action',
              },
              {
                uuid: 'Status',
              },
              {
                uuid: 'Name',
              },
              {
                uuid: 'Description',
              },
              {
                uuid: 'Type',
              },
              {
                uuid: 'Blocks',
              },
              {
                uuid: 'Triggers',
              },
              {
                center: true,
                uuid: 'Actions',
              },
            ]}
            isSelectedRow={(rowIndex: number) => pipelines[rowIndex]?.uuid === selectedPipeline?.uuid}
            onClickRow={(rowIndex: number) => setSelectedPipeline(prev => {
              const pipeline = pipelines[rowIndex];

              return (prev?.uuid !== pipeline?.uuid) ? pipeline : null;
            })}
            onDoubleClickRow={(rowIndex: number) => {
              router.push(
                  '/pipelines/[pipeline]',
                  `/pipelines/${pipelines[rowIndex].uuid}`,
              );
            }}
            rows={pipelines.map((pipeline, idx) => {
              const {
                blocks,
                description,
                schedules,
                type,
                uuid,
              } = pipeline;
              const blocksCount = blocks.filter(({ type }) => BlockTypeEnum.SCRATCHPAD !== type).length;
              const schedulesCount = schedules.length;
              const isActive = schedules.find(({ status }) => ScheduleStatusEnum.ACTIVE === status);

              return [
                (schedulesCount >= 1 || !!pipelinesEditing[uuid])
                  ? (
                    <Button
                      iconOnly
                      loading={!!pipelinesEditing[uuid]}
                      noBackground
                      noBorder
                      noPadding
                      onClick={(e) => {
                        pauseEvent(e);
                        setPipelinesEditing(prev => ({
                          ...prev,
                          [uuid]: true,
                        }));
                        updatePipeline({
                          ...pipeline,
                          status: isActive
                            ? ScheduleStatusEnum.INACTIVE
                            : ScheduleStatusEnum.ACTIVE,
                        });
                      }}
                    >
                      {isActive
                        ? <Pause muted size={2 * UNIT} />
                        : <PlayButtonFilled default size={2 * UNIT} />
                      }
                    </Button>
                  )
                  : null
                ,
                <Text
                  default={!isActive}
                  key={`pipeline_status_${idx}`}
                  monospace
                  success={!!isActive}
                >
                  {isActive
                    ? ScheduleStatusEnum.ACTIVE
                    : schedulesCount >= 1 ? ScheduleStatusEnum.INACTIVE : 'no schedules'
                  }
                </Text>,
                <NextLink
                  as={`/pipelines/${uuid}`}
                  href="/pipelines/[pipeline]"
                  key={`pipeline_name_${idx}`}
                  passHref
                >
                  <Link sameColorAsText>
                    {uuid}
                  </Link>
                </NextLink>,
                <Text
                  default
                  key={`pipeline_description_${idx}`}
                  title={description}
                  width={UNIT * 90}
                >
                  {description}
                </Text>,
                <Text
                  key={`pipeline_type_${idx}`}
                >
                  {type === PipelineTypeEnum.PYTHON ? 'Standard' : capitalize(type)}
                </Text>,
                <Text
                  default={blocksCount === 0}
                  key={`pipeline_block_count_${idx}`}
                  monospace
                >
                  {blocksCount}
                </Text>,
                <Text
                  default={schedulesCount === 0}
                  key={`pipeline_trigger_count_${idx}`}
                  monospace
                >
                  {schedulesCount}
                </Text>,
                <Flex
                  flex={1} justifyContent="flex-end"
                  key={`chevron_icon_${idx}`}
                >
                  <Button
                    {...sharedOpenButtonProps}
                    onClick={() => {
                      router.push(
                        '/pipelines/[pipeline]',
                        `/pipelines/${uuid}`,
                      );
                    }}
                    title="Detail"
                  >
                    <Open default size={2 * UNIT} />
                  </Button>
                  <Spacing mr={1} />
                  <Button
                    {...sharedOpenButtonProps}
                    onClick={() => {
                      router.push(
                        '/pipelines/[pipeline]/logs',
                        `/pipelines/${uuid}/logs`,
                      );
                    }}
                    title="Logs"
                  >
                    <File default size={2 * UNIT} />
                  </Button>
                </Flex>,
              ];
            })}
          />
      )}
    </Dashboard>
  );
}

PipelineListPage.getInitialProps = async () => ({});

export default PrivateRoute(PipelineListPage);
