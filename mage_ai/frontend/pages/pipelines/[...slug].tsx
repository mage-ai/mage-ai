import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import BlockType, {
  BlockTypeEnum,
  OutputType,
  SampleDataType,
} from '@interfaces/BlockType';
import FileBrowser from '@components/FileBrowser';
import FileEditor from '@components/FileEditor';
import FileHeaderMenu from '@components/PipelineDetail/FileHeaderMenu';
import Head from '@oracle/elements/Head';
import KernelStatus from '@components/PipelineDetail/KernelStatus';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import KernelOutputType, { DataTypeEnum } from '@interfaces/KernelOutputType';
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
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_WIDTH,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_WIDTH,
  get,
  set,
} from '@storage/localStorage';
import {
  NAV_ICON_MAPPING,
  SIDEKICK_VIEWS,
  VIEW_QUERY_PARAM,
  ViewKeyEnum,
} from '@components/Sidekick/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { equals, pushAtIndex, removeAtIndex } from '@utils/array';
import { goToWithQuery } from '@utils/routing';
import { onSuccess } from '@api/utils/response';
import { randomNameGenerator } from '@utils/string';
import { queryFromUrl } from '@utils/url';
import { useWindowSize } from '@utils/sizes';

type PipelineDetailPageProps = {
  pipeline: PipelineType;
};

function PipelineDetailPage({
  pipeline: pipelineProp,
}: PipelineDetailPageProps) {
  const router = useRouter();
  const {
    height: heightWindow,
    width: widthWindow,
  } = useWindowSize();
  const [afterWidth, setAfterWidth] = useState(
    get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_WIDTH, AFTER_DEFAULT_WIDTH));
  const [afterWidthForChildren, setAfterWidthForChildren] = useState<number>(null);
  const [beforeWidth, setBeforeWidth] = useState(
    get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_WIDTH, BEFORE_DEFAULT_WIDTH));
  const [afterHidden, setAfterHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN));
  const [beforeHidden, setBeforeHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);
  const [filesTouched, setFilesTouched] = useState<{
    [filePath: string]: boolean;
  }>({});

  const qUrl = queryFromUrl();
  const {
    [VIEW_QUERY_PARAM]: activeSidekickView,
    file_path: filePathFromUrl,
  } = qUrl;
  const filePathsFromUrl = useMemo(() => {
    let arr = qUrl['file_paths[]'] || [];
    if (!Array.isArray(arr)) {
      arr = [arr];
    }
    return arr;
  }, [qUrl]);
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

  const blockRefs = useRef({});
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
  ]);

  useEffect(() => {
    if (!afterMousedownActive) {
      setAfterWidthForChildren(afterWidth);
      set(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_WIDTH, afterWidth);
    }
  }, [
    afterMousedownActive,
    afterWidth,
    setAfterWidthForChildren,
  ]);
  useEffect(() => {
    if (!beforeMousedownActive) {
      set(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_WIDTH, beforeWidth);
    }
  }, [
    beforeMousedownActive,
    beforeWidth,
  ]);

  // Pipeline
  const [pipelineLastSaved, setPipelineLastSaved] = useState<Date>(null);
  const [pipelineContentTouched, setPipelineContentTouched] = useState<boolean>(false);

  // Variables
  const {
    data: dataGlobalVariables,
    mutate: fetchVariables,
  } = api.variables.pipelines.list(!afterHidden && pipelineUUID);
  const globalVariables = dataGlobalVariables?.variables;

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

  const resetState = useCallback(() => {
    setEditingBlock({
      upstreamBlocks: {
        block: null,
        values: [],
      },
    });
    setMessages({});
    setPipelineContentTouched(false);
    setPipelineLastSaved(null);
    setRunningBlocks([]);
    setSelectedBlock(null);
  }, []);
  useEffect(() => {
    if (pipelineUUID !== pipelineUUIDPrev) {
      contentByBlockUUID.current = {};
    }
  }, [pipelineUUID, pipelineUUIDPrev]);

  const {
    data: blockSampleData,
    mutate: fetchSampleData,
  } = api.blocks.pipelines.outputs.detail(
    !afterHidden && pipelineUUID,
    selectedBlock?.type !== BlockTypeEnum.SCRATCHPAD && selectedBlock?.uuid,
  );
  const sampleData: SampleDataType = blockSampleData?.outputs?.[0]?.sample_data;
  const {
    data: blockAnalysis,
    mutate: fetchAnalysis,
  } = api.blocks.pipelines.analyses.detail(
    !afterHidden && pipelineUUID,
    selectedBlock?.type !== BlockTypeEnum.SCRATCHPAD && selectedBlock?.uuid,
  );
  const {
    insights,
    metadata,
    statistics = {},
  } = blockAnalysis?.analyses?.[0] || {};

  useEffect(() => {
    if (runningBlocks.length === 0) {
      fetchAnalysis();
      fetchSampleData();
      fetchVariables();
    }
  }, [
    fetchAnalysis,
    fetchSampleData,
    fetchVariables,
    runningBlocks,
  ]);

  useEffect(() => {
    if (editingBlock.upstreamBlocks?.block) {
      setAfterHidden(false);
      setActiveSidekickView(ViewKeyEnum.TREE);
    }
  }, [editingBlock.upstreamBlocks]);

  // Kernels
  const [messages, setMessages] = useState<{
    [uuid: string]: KernelOutputType[];
  }>({});

  const {
    data,
    isLoading,
    mutate: fetchPipeline,
  } = api.pipelines.detail(pipelineUUID);
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

  // Files
  const openFile = useCallback((filePath: string) => {
    const filePathEncoded = encodeURIComponent(filePath);
    let filePaths = queryFromUrl()['file_paths[]'] || [];
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    if (!filePaths.includes(filePathEncoded)) {
      filePaths.push(filePathEncoded);
    }
    goToWithQuery({
      'file_paths[]': filePaths,
      file_path: filePathEncoded,
    });
  }, []);

  useEffect(() => {
    setSelectedFilePath(filePathFromUrl);
  }, [
    filePathFromUrl,
  ]);
  useEffect(() => {
    if (!equals(filePathsFromUrl, selectedFilePaths)) {
      setSelectedFilePaths(filePathsFromUrl);
    }
  }, [
    filePathsFromUrl
  ]);

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

  const [updatePipelineNoContent] = useMutation(api.pipelines.useUpdate(pipelineUUID));
  const updatePipelineName = useCallback((name: string) => (
    // @ts-ignore
    updatePipelineNoContent({
      pipeline: { name },
    }).then((response: any) => {
      onSuccess(
        response, {
          callback: ({ pipeline: { uuid } }) => {
            router.push(`/pipelines/${uuid}`);
            fetchFileTree();
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
    },
  )), [
    fetchFileTree,
    updatePipelineNoContent,
    router,
  ]);

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
    name: string = randomNameGenerator(),
  ) => {
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
    if (pipelineUUIDPrev !== pipelineUUID) {
      setBlocks([]);
    }
  }, [
    pipelineUUID,
    pipelineUUIDPrev,
  ]);

  useEffect(() => {
    if (typeof pipeline?.blocks !== 'undefined') {
      setBlocks(pipeline.blocks);
    }
  }, [
    pipeline?.blocks,
  ]);

  useEffect(() => {
    if (!blocks.length && typeof pipeline?.blocks !== 'undefined') {
      const messagesInit = {};
      contentByBlockUUID.current = {};

      pipeline.blocks.forEach(({
        content,
        outputs,
        uuid,
      }: BlockType) => {
        if (outputs.length >= 1) {
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
        }
        contentByBlockUUID.current[uuid] = content;
      });

      setMessages((messagesPrev) => ({
        ...messagesInit,
        ...messagesPrev,
      }));
    }
  }, [
    blocks,
    pipeline?.blocks,
    setBlocks,
    setMessages,
  ]);

  const onSelectBlockFile = useCallback((
    blockUUID: string,
    blockType: BlockTypeEnum,
    filePath: string,
  ) => {
    // Block is in pipeline
    const block =
      blocks.find(({ type, uuid }: BlockType) => type === blockType && uuid === blockUUID);

    if (block) {
      setSelectedBlock(block);
      if (blockRefs?.current) {
        const blockRef = blockRefs.current[`${block.type}s/${block.uuid}.py`];
        blockRef?.current?.scrollIntoView();
      }
    } else {
      openFile(filePath);
    }
  }, [
    blocks,
  ]);

  const fileTree = useMemo(() => (
    <FileBrowser
      files={filesData?.files}
      onSelectBlockFile={onSelectBlockFile}
      openFile={openFile}
      openPipeline={(uuid: string) => {
        resetState();
        router.push('/pipelines/[...slug]', `/pipelines/${uuid}`);
      }}
    />
  ), [
    filesData?.files,
    onSelectBlockFile,
  ]);
  const sideKick = useMemo(() => (
    <Sidekick
      activeView={activeSidekickView}
      afterWidth={afterWidthForChildren}
      blockRefs={blockRefs}
      blocks={blocks}
      editingBlock={editingBlock}
      fetchPipeline={fetchPipeline}
      globalVariables={globalVariables}
      insights={insights}
      metadata={metadata}
      pipeline={pipeline}
      runningBlocks={runningBlocks}
      sampleData={sampleData}
      selectedBlock={selectedBlock}
      setEditingBlock={setEditingBlock}
      setSelectedBlock={setSelectedBlock}
      statistics={statistics}
      views={SIDEKICK_VIEWS}
    />
  ), [
    activeSidekickView,
    afterWidthForChildren,
    blockRefs,
    blocks,
    editingBlock,
    fetchPipeline,
    globalVariables,
    insights,
    metadata,
    pipeline,
    runningBlocks,
    sampleData,
    selectedBlock,
    setEditingBlock,
    statistics,
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
  const mainContainerHeaderMemo = useMemo(() => (
    <KernelStatus
      filePaths={selectedFilePaths}
      filesTouched={filesTouched}
      isBusy={runningBlocks.length >= 1}
      isPipelineUpdating={isPipelineUpdating}
      kernel={kernel}
      pipeline={pipeline}
      pipelineContentTouched={pipelineContentTouched}
      pipelineLastSaved={pipelineLastSaved}
      restartKernel={restartKernel}
      selectedFilePath={selectedFilePath}
      updatePipelineName={updatePipelineName}
    />
  ), [
    filesTouched,
    isPipelineUpdating,
    kernel,
    pipeline,
    pipelineContentTouched,
    pipelineLastSaved,
    restartKernel,
    runningBlocks,
    selectedFilePath,
    selectedFilePaths,
    updatePipelineName,
  ]);

  return (
    <>
      <Head title={pipeline?.name} />

      <TripleLayout
        after={sideKick}
        afterHeader={(
          <>
            {SIDEKICK_VIEWS.map(({ key, label }: any) => {
              const active = key === activeSidekickView;
              const Icon = NAV_ICON_MAPPING[key];

              return (
                <Spacing key={key} pl={1}>
                  <KeyboardShortcutButton
                    beforeElement={<Icon />}
                    blackBorder
                    compact
                    onClick={() => setActiveSidekickView(key)}
                    selected={active}
                    uuid={key}
                  >
                    {label}
                  </KeyboardShortcutButton>
                </Spacing>
              );
            })}
          </>
        )}
        afterHidden={afterHidden}
        afterMousedownActive={afterMousedownActive}
        afterWidth={afterWidth}
        before={fileTree}
        beforeHeader={(
          <FileHeaderMenu
            fetchFileTree={fetchFileTree}
            interruptKernel={interruptKernel}
            restartKernel={restartKernel}
            savePipelineContent={savePipelineContent}
            setMessages={setMessages}
          />
        )}
        beforeHidden={beforeHidden}
        beforeMousedownActive={beforeMousedownActive}
        beforeWidth={beforeWidth}
        mainContainerHeader={mainContainerHeaderMemo}
        mainContainerRef={mainContainerRef}
        setAfterHidden={setAfterHidden}
        setAfterMousedownActive={setAfterMousedownActive}
        setAfterWidth={setAfterWidth}
        setBeforeHidden={setBeforeHidden}
        setBeforeMousedownActive={setBeforeMousedownActive}
        setBeforeWidth={setBeforeWidth}
      >
        {!selectedFilePath && pipelineDetailMemo}

        {filePathsFromUrl?.map((filePath: string) => (
          <div
            key={filePath}
            style={{
              display: selectedFilePath === filePath
                ? null
                : 'none',
            }}
          >
            <FileEditor
              filePath={filePath}
              pipeline={pipeline}
              setFilesTouched={setFilesTouched}
            />
          </div>
        ))}

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
