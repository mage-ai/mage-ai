import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import BlockContext from '@context/Block';
import BlockType, { BlockTypeEnum, OutputType } from '@interfaces/BlockType';
import FileTree from '@components/FileTree';
import FileHeaderMenu from '@components/PipelineDetail/FileHeaderMenu';
import Head from '@oracle/elements/Head';
import KernelContext from '@context/Kernel';
import KernelOutputType, { DataTypeEnum } from '@interfaces/KernelOutputType';
import PipelineContext from '@context/Pipeline';
import PipelineDetail from '@components/PipelineDetail';
import PipelineType from '@interfaces/PipelineType';
import Sidekick from '@components/Sidekick';
import Spacing from '@oracle/elements/Spacing';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import {
  AFTER_DEFAULT_WIDTH,
  BEFORE_DEFAULT_WIDTH,
} from '@components/TripleLayout/index.style';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN,
  get,
  set,
} from '@storage/localStorage';
import { SIDEKICK_VIEWS } from '@components/Sidekick/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { VIEW_QUERY_PARAM, ViewKeyEnum } from '@components/Sidekick/constants';
import { goToWithQuery } from '@utils/routing';
import { onError, onSuccess } from '@api/utils/response';
import { pluralize, randomNameGenerator } from '@utils/string';
import { pushAtIndex, removeAtIndex } from '@utils/array';
import { queryFromUrl } from '@utils/url';
import { useWindowSize } from '@utils/sizes';

type PipelineDetailPageProps = {
  pipeline: PipelineType;
};

function PipelineDetailPage({
  pipeline: pipelineProp,
}: PipelineDetailPageProps) {
  const {
    height: heightWindow,
    width: widthWindow,
  } = useWindowSize();
  const [afterWidth, setAfterWidth] = useState(AFTER_DEFAULT_WIDTH);
  const [beforeWidth, setBeforeWidth] = useState(BEFORE_DEFAULT_WIDTH);
  const [afterHidden, setAfterHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN));
  const [beforeHidden, setBeforeHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);

  const qFromUrl = queryFromUrl();
  const activeSidekickView = qFromUrl[VIEW_QUERY_PARAM];
  const setActiveSidekickView = useCallback((
    newView: ViewKeyEnum,
    pushHistory: boolean = true,
  ) => {
    goToWithQuery({
      [VIEW_QUERY_PARAM]: newView,
    }, {
      pushHistory,
    });
  }, [
    activeSidekickView,
  ]);
  useEffect(() => {
    if (!activeSidekickView) {
      setActiveSidekickView(ViewKeyEnum.TREE, false);
    }
  }, [activeSidekickView]);

  const contentByBlockUUID = useRef({});
  const mainContainerRef = useRef(null);
  const pipelineUUID = pipelineProp.uuid;
  const pipelineUUIDPrev = usePrevious(pipelineUUID);

  const setContentByBlockUUID = useCallback((data: {
    [uuid: string]: string;
  }) => {
    contentByBlockUUID.current = {
      ...contentByBlockUUID.current,
      ...data,
    };
  }, [contentByBlockUUID]);

  useEffect(() => {
    if (pipelineUUID !== pipelineUUIDPrev) {
      contentByBlockUUID.current = {};
    }
  }, [pipelineUUID, pipelineUUIDPrev]);

  const [mainContainerWidth, setMainContainerWidth] = useState<number>(null);
  useEffect(() => {
    if (mainContainerRef?.current && !afterMousedownActive && !beforeMousedownActive) {
      setMainContainerWidth(mainContainerRef.current.getBoundingClientRect().width);
    }
  }, [
    afterMousedownActive,
    beforeMousedownActive,
    afterHidden,
    afterWidth,
    beforeHidden,
    beforeWidth,
    mainContainerRef?.current,
    setMainContainerWidth,
    widthWindow,
  ])

  // Pipeline
  const [pipelineLastSaved, setPipelineLastSaved] = useState<Date>(null);
  const [pipelineContentTouched, setPipelineContentTouched] = useState<boolean>(false);

  // Blocks
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [editingBlock, setEditingBlock] = useState<{
    upstreamBlocks: {
      block: BlockType;
      values: BlockType[];
    };
  }>({
    upstreamBlocks: null,
  });
  const [runningBlocks, setRunningBlocks] = useState<BlockType[]>([]);
  const [selectedBlock, setSelectedBlock] = useState(null);

  useEffect(() => {
    if (editingBlock.upstreamBlocks?.block) {
      setAfterHidden(false);
      setActiveSidekickView(ViewKeyEnum.TREE);
    };
  }, [editingBlock.upstreamBlocks]);

  // Kernels
  const [messages, setMessages] = useState<{
    [uuid: string]: KernelOutputType[];
  }>({});

  const {
    data,
    isLoading,
    mutate: fetchPipeline,
  } = api.pipelines.detail(pipelineUUID, {
    include_content: true,
  });
  const { data: filesData, mutate: fetchFileTree } = api.files.list();
  const pipeline = data?.pipeline;
  const {
    data: dataKernels,
    mutate: fetchKernels,
  } = api.kernels.list({}, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });
  const kernels = dataKernels?.kernels;
  const kernel = kernels?.[0];

  const [updatePipeline, { isLoading: isPipelineUpdating }] = useMutation(
    api.pipelines.useUpdate(pipelineUUID, { update_content: true }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => setPipelineContentTouched(false),
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
  const savePipelineContent = useCallback(() => {
    setPipelineLastSaved(new Date());

    // @ts-ignore
    return updatePipeline({
      pipeline: {
        ...pipeline,
        blocks: blocks.map((block: BlockType) => ({
          ...block,
          content: contentByBlockUUID.current[block.uuid] || block.content,
          outputs: (BlockTypeEnum.SCRATCHPAD === block.type && messages[block.uuid])
            ? messages[block.uuid].map((d: KernelOutputType, idx: number) => ({
              text_data: JSON.stringify(d),
              variable_uuid: `${block.uuid}_${idx}`,
            }))
            : block.outputs,
        })),
      },
    });
  }, [
    blocks,
    contentByBlockUUID.current,
    messages,
    pipeline,
    setPipelineLastSaved,
    updatePipeline,
  ]);

  const [deleteBlock] = useMutation(
    ({ uuid }: BlockType) => api.blocks.pipelines.useDelete(pipelineUUID, uuid)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            block: {
              uuid,
            },
          }) => {
            setBlocks((blocksPrevious) => removeAtIndex(
              blocksPrevious,
              blocksPrevious.findIndex(({ uuid: uuid2 }: BlockType) => uuid === uuid2),
            ));
            fetchPipeline();
          },
          onErrorCallback: ({
            url_parameters: urlParameters,
          }: {
            url_parameters: {
              block_uuid: string;
            };
          }, {
            messages,
          }) => {
            setMessages(messagesPrev => ({
              ...messagesPrev,
              [urlParameters.block_uuid]: messages.map(msg => ({
                data: msg,
                type: DataTypeEnum.TEXT_PLAIN,
              })),
            }));
          },
        },
      ),
    },
  );

  const [restartKernel] = useMutation(
    api.restart.kernels.useCreate(kernel?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => fetchKernels(),
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
  const [interruptKernel] = useMutation(
    api.interrupt.kernels.useCreate(kernel?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (response) => {

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

  const restartKernelWithConfirm = useCallback(() => {
    const warning = 'Do you want to restart the kernel? All variables will be cleared.';
    if (typeof window !== 'undefined' && window.confirm(warning)) {
      restartKernel();
    }
  }, [restartKernel]);

  const [createBlock] = useMutation(api.blocks.pipelines.useCreate(pipelineUUID));
  const addNewBlockAtIndex = useCallback((
    block: BlockType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
  ) => {
    const name = randomNameGenerator();
    // @ts-ignore
    createBlock({
      block: {
        name,
        priority: idx,
        ...block,
      },
    }).then((response: {
      data: {
        block: BlockType;
      };
    }) => {
      onSuccess(
        response, {
          callback: () => {
            const {
              data: {
                block,
              },
            } = response;
            setBlocks((previousBlocks) => pushAtIndex(block, idx, previousBlocks));
            onCreateCallback?.(block);
            fetchFileTree();
            fetchPipeline();
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
      );
    });
  }, [
    createBlock,
    setBlocks,
  ]);

  useEffect(() => {
    if (typeof pipeline?.blocks !== 'undefined') {
      setBlocks(pipeline.blocks);

      const messagesInit = {};
      contentByBlockUUID.current = {};

      pipeline.blocks.forEach(({
        content,
        outputs,
        uuid,
      }: BlockType) => {
        messagesInit[uuid] = outputs.map(({
          sample_data: sampleData,
          text_data: textDataJsonString,
          type,
        }: OutputType) => {
          if (sampleData) {
            return {
              data: sampleData,
              type,
            };
          } else if (textDataJsonString) {
            return JSON.parse(textDataJsonString);
          }

          return textDataJsonString;
        });
        contentByBlockUUID.current[uuid] = content;
      });

      setMessages(messagesInit);
    }
  }, [
    pipeline?.blocks,
    setBlocks,
    setMessages,
  ]);

  // TODO: API should report filesystem as FileNodeType[], not FileNodeType
  const files = useMemo(() => filesData ? [filesData?.files] : [], [
    filesData?.files,
  ]);
  const blockRefs = useRef({});
  const fileTree = useMemo(() => (
    <FileTree
      blockRefs={blockRefs}
      pipeline={pipeline}
      setSelectedBlock={setSelectedBlock}
      tree={files}
    />
  ), [
    blockRefs,
    files,
    pipeline,
    setSelectedBlock,
  ]);
  const sideKick = useMemo(() => (
    <Sidekick
      blockRefs={blockRefs}
      editingBlock={editingBlock}
      fetchPipeline={fetchPipeline}
      pipeline={pipeline}
      selectedBlock={selectedBlock}
      setEditingBlock={setEditingBlock}
      setSelectedBlock={setSelectedBlock}
      views={SIDEKICK_VIEWS}
    />
  ), [
    blockRefs,
    editingBlock,
    fetchPipeline,
    pipeline,
    selectedBlock,
    setEditingBlock,
  ]);
  const pipelineDetailMemo = useMemo(() => (
    <PipelineDetail
      addNewBlockAtIndex={addNewBlockAtIndex}
      blockRefs={blockRefs}
      blocks={blocks}
      deleteBlock={deleteBlock}
      fetchFileTree={fetchFileTree}
      fetchPipeline={fetchPipeline}
      interruptKernel={interruptKernel}
      isPipelineUpdating={isPipelineUpdating}
      kernel={kernel}
      mainContainerRef={mainContainerRef}
      mainContainerWidth={mainContainerWidth}
      messages={messages}
      pipeline={pipeline}
      pipelineContentTouched={pipelineContentTouched}
      pipelineLastSaved={pipelineLastSaved}
      restartKernel={restartKernel}
      runningBlocks={runningBlocks}
      savePipelineContent={savePipelineContent}
      selectedBlock={selectedBlock}
      setContentByBlockUUID={setContentByBlockUUID}
      setEditingBlock={setEditingBlock}
      setMessages={setMessages}
      setPipelineContentTouched={setPipelineContentTouched}
      setRunningBlocks={setRunningBlocks}
      setSelectedBlock={setSelectedBlock}
    />
  ), [
    addNewBlockAtIndex,
    blockRefs,
    blocks,
    deleteBlock,
    fetchFileTree,
    fetchPipeline,
    interruptKernel,
    isPipelineUpdating,
    kernel,
    mainContainerRef,
    mainContainerWidth,
    messages,
    pipeline,
    pipelineContentTouched,
    pipelineLastSaved,
    restartKernel,
    runningBlocks,
    savePipelineContent,
    selectedBlock,
    setContentByBlockUUID,
    setEditingBlock,
    setMessages,
    setPipelineContentTouched,
    setRunningBlocks,
    setSelectedBlock,
  ]);

  return (
    <>
      <Head title={pipeline?.name} />

      <TripleLayout
        activeSidekickView={activeSidekickView}
        after={sideKick}
        afterHidden={afterHidden}
        afterWidth={afterWidth}
        before={fileTree}
        beforeHeader={(
          <FileHeaderMenu
            interruptKernel={interruptKernel}
            restartKernel={restartKernel}
            savePipelineContent={savePipelineContent}
          />
        )}
        beforeHidden={beforeHidden}
        beforeWidth={beforeWidth}
        mainContainerRef={mainContainerRef}
        setActiveSidekickView={setActiveSidekickView}
        setAfterHidden={setAfterHidden}
        setAfterWidth={setAfterWidth}
        setBeforeHidden={setBeforeHidden}
        setBeforeWidth={setBeforeWidth}
        setAfterMousedownActive={setAfterMousedownActive}
        afterMousedownActive={afterMousedownActive}
        beforeMousedownActive={beforeMousedownActive}
        setBeforeMousedownActive={setBeforeMousedownActive}
      >
        {pipelineDetailMemo}

        <Spacing
          pb={Math.max(
            Math.floor((heightWindow / 2) / UNIT),
            0,
          )}
        />
      </TripleLayout>
    </>
  );
}

PipelineDetailPage.getInitialProps = async (ctx: any) => {
  const { slug: slugArray }: { slug: string[] } = ctx.query;
  let pipelineUUID;

  if (Array.isArray(slugArray)) {
    pipelineUUID = slugArray[0];
  }

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PipelineDetailPage;
