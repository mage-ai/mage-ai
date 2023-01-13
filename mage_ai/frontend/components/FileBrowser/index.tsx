import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { useRouter } from 'next/router';
import { useMutation } from 'react-query';

import BlockType, { BlockRequestPayloadType, BlockTypeEnum } from '@interfaces/BlockType';
import FileType from '@interfaces/FileType';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import Folder, { FolderSharedProps } from './Folder';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ContainerStyle } from './index.style';
import { ContextAreaProps } from '@components/ContextMenu';
import { HEADER_Z_INDEX } from '@components/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildAddBlockRequestPayload } from '../FileEditor/utils';
import { getBlockFromFile, getFullPathWithoutRootFolder } from './utils';
import { find } from '@utils/array';
import { onSuccess } from '@api/utils/response';

const MENU_WIDTH: number = UNIT * 20;

type FileBrowserProps = {
  addNewBlock?: (b: BlockRequestPayloadType, cb: any) => void;
  blocks?: BlockType[];
  deleteBlockFile?: (b: BlockType) => void;
  deleteWidget?: (b: BlockType) => void;
  fetchPipeline?: () => void;
  files?: FileType[];
  pipeline?: PipelineType;
  setSelectedBlock?: (block: BlockType) => void;
  widgets?: BlockType[];
} & FolderSharedProps & ContextAreaProps;

export enum FileContextEnum {
  BLOCK_FILE = 'block_file',
  DISABLED = 'disabled',
  FILE = 'file',
  FOLDER = 'folder',
  PIPELINE = 'pipeline',
};

function FileBrowser({
  addNewBlock,
  blocks = [],
  deleteBlockFile,
  deleteWidget,
  fetchPipeline,
  files,
  pipeline,
  setSelectedBlock,
  widgets = [],
  ...props
}: FileBrowserProps, ref) {
  const timeout = useRef(null);
  const themeContext = useContext(ThemeContext);
  const [coordinates, setCoordinates] = useState<{
    x: number;
    y: number;
  }>(null);
  const [draggingFile, setDraggingFile] = useState<FileType>(null);
  const [selectedFile, setSelectedFile] = useState<FileType>(null);

  const { data: serverStatus } = api.status.list();
  const repoPath = useMemo(() => serverStatus?.status?.repo_path, [serverStatus]);

  const dataExporterBlock: BlockType = find(pipeline?.blocks, ({ type }) => BlockTypeEnum.DATA_EXPORTER === type);
  const [updateDestinationBlock] = useMutation(
    api.blocks.pipelines.useUpdate(pipeline?.uuid, dataExporterBlock?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipeline?.();
          },
        },
      ),
    },
  );

  const handleClick = useCallback(() => setSelectedFile(null), [setSelectedFile]);

  useEffect(() => {
    const handleMouseUp = (e) => {
      clearTimeout(timeout.current);
      setDraggingFile(null);

      if (draggingFile && pipeline && addNewBlock) {
        const {
          width,
          x,
        } = ref?.current?.getBoundingClientRect?.() || {};

        if (e.pageX > x + width) {
          const isIntegrationPipeline = pipeline?.type === PipelineTypeEnum.INTEGRATION;

          const blockReqPayload = buildAddBlockRequestPayload(
            {
              ...draggingFile,
              path: getFullPathWithoutRootFolder(draggingFile),
            },
            repoPath,
            pipeline,
          );

          addNewBlock?.(
            blockReqPayload,
            block => {
              if (isIntegrationPipeline && dataExporterBlock) {
                // @ts-ignore
                updateDestinationBlock({
                  block: {
                    ...dataExporterBlock,
                    upstream_blocks: [block.uuid],
                  },
                });
              }
              setSelectedBlock?.(block);
            },
          );
        }
      }
    };
    const handleMouseMove = (e) => {
      if (draggingFile) {
        setCoordinates({
          x: e.pageX,
          y: e.pageY,
        });
      }
    };

    document?.addEventListener('click', handleClick);
    document?.addEventListener('mousemove', handleMouseMove);
    document?.addEventListener('mouseup', handleMouseUp);

    return () => {
      document?.removeEventListener('click', handleClick);
      document?.removeEventListener('mousemove', handleMouseMove);
      document?.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    draggingFile,
    pipeline,
    ref,
    dataExporterBlock,
    setSelectedBlock,
    timeout,
  ]);

  const pipelineBlockUuids = useMemo(() => blocks.concat(widgets).map(({ uuid }) => uuid), [
    blocks,
    widgets,
  ]);

  const filesMemo = useMemo(() => files?.map((file: FileType) => (
    <Folder
      {...props}
      containerRef={ref}
      file={file}
      key={file.name}
      level={0}
      pipelineBlockUuids={pipelineBlockUuids}
      setCoordinates={setCoordinates}
      setDraggingFile={setDraggingFile}
      setSelectedFile={setSelectedFile}
      theme={themeContext}
      timeout={timeout}
    />
  )), [
    files,
    pipelineBlockUuids,
    ref,
    themeContext,
    timeout,
  ]);

  const selectedBlock = useMemo(() => selectedFile && getBlockFromFile(selectedFile), [
    selectedFile,
  ]);
  const draggingBlock  = useMemo(() => draggingFile && getBlockFromFile(draggingFile), [
    draggingFile,
  ]);

  const menuMemo = useMemo(() => {
    if (!selectedBlock) {
      return <div />;
    }

    const {
      x: xContainer,
      width,
    } = ref?.current?.getBoundingClientRect() || {};
    const {
      x = 0,
      y = 0,
    } = coordinates || {};
    let xFinal = x;
    if (x + MENU_WIDTH >= xContainer + width) {
      xFinal = (xContainer + width) - (MENU_WIDTH + UNIT);
    }
    if (xFinal < 0) {
      xFinal = 0;
    }

    return (
      <div
        style={{
          left: xFinal,
          position: 'fixed',
          top: y + (UNIT / 2),
          zIndex: HEADER_Z_INDEX + 100,
        }}
      >
        <FlyoutMenu
          items={[
            {
              label: () => 'Delete file',
              onClick: () => {
                if (selectedBlock.type === BlockTypeEnum.CHART) {
                  deleteWidget(selectedBlock);
                } else {
                  deleteBlockFile(selectedBlock);
                }
              },
              uuid: 'delete_file',
            },
          ]}
          open
          parentRef={undefined}
          uuid="FileBrowser/ContextMenu"
          width={MENU_WIDTH}
        />
      </div>
    );
  }, [
    coordinates,
    ref,
    selectedBlock,
  ]);

  return (
    <ContainerStyle ref={ref}>
      {filesMemo}

      {selectedBlock && menuMemo}

      {draggingBlock && (
        <div
          style={{
            left: coordinates?.x - UNIT,
            position: 'fixed',
            top: coordinates?.y - UNIT,
            zIndex: HEADER_Z_INDEX + 100,
          }}
        >
          <Text
            cursor="grabbing"
            monospace
          >
            {draggingBlock?.uuid}
          </Text>
        </div>
      )}
    </ContainerStyle>
  );
}

export default React.forwardRef(FileBrowser);
