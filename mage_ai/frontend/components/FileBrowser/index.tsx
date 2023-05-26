import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ThemeContext } from 'styled-components';
import { useMutation } from 'react-query';

import BlockType, { BlockRequestPayloadType, BlockTypeEnum } from '@interfaces/BlockType';
import FileType from '@interfaces/FileType';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import Folder, { FolderSharedProps } from './Folder';
import NewFile from './NewFile';
import NewFolder from './NewFolder';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PopupMenu from '@oracle/components/PopupMenu';
import Text from '@oracle/elements/Text';
import UploadFiles from './UploadFiles';
import api from '@api';
import { ContainerStyle } from './index.style';
import { ContextAreaProps } from '@components/ContextMenu';
import {
  FILE_EXTENSION_TO_LANGUAGE_MAPPING_REVERSE,
} from '@interfaces/FileType';
import { HEADER_Z_INDEX } from '@components/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildAddBlockRequestPayload } from '../FileEditor/utils';
import { getBlockFromFile, getFullPathWithoutRootFolder } from './utils';
import { find } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { useModal } from '@context/Modal';

const MENU_WIDTH: number = UNIT * 20;

type FileBrowserProps = {
  addNewBlock?: (b: BlockRequestPayloadType, cb: any) => void;
  blocks?: BlockType[];
  // deleteBlockFile?: (b: BlockType) => void;
  deleteWidget?: (b: BlockType) => void;
  fetchAutocompleteItems?: () => void;
  fetchFileTree?: () => void;
  fetchPipeline?: () => void;
  files?: FileType[];
  onCreateFile?: (file: FileType) => void;
  pipeline?: PipelineType;
  setErrors?: (opts: {
    errors: any;
    response: any;
  }) => void;
  setSelectedBlock?: (block: BlockType) => void;
  widgets?: BlockType[];
} & FolderSharedProps & ContextAreaProps;

export enum FileContextEnum {
  BLOCK_FILE = 'block_file',
  DISABLED = 'disabled',
  FILE = 'file',
  FOLDER = 'folder',
  PIPELINE = 'pipeline',
}

function FileBrowser({
  addNewBlock,
  blocks = [],
  // deleteBlockFile,
  deleteWidget,
  fetchAutocompleteItems,
  fetchFileTree,
  fetchPipeline,
  files,
  onCreateFile,
  pipeline,
  setErrors,
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

  const { data: serverStatus } = api.statuses.list();
  const repoPath = useMemo(() => serverStatus?.statuses?.[0]?.repo_path, [serverStatus]);

  const [deleteFile] = useMutation(
    (fullPath: string) => api.files.useDelete(fullPath)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchFileTree?.();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [deleteFolder] = useMutation(
    (fullPath: string) => api.folders.useDelete(fullPath)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchFileTree?.();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [showDeleteConfirmation, hideDeleteConfirmation] = useModal(({
    block,
  }: {
    block: BlockType;
  }) => (
    <PopupMenu
      centerOnScreen
      danger
      onCancel={hideDeleteConfirmation}
      onClick={
        () => deleteBlockFile({ block, force: true })
          .then(() => hideDeleteConfirmation())
      }
      subtitle={
        'Deleting this block file is dangerous. This block may have dependencies ' +
        'in active pipelines. Press confirm to delete this block anyway ' +
        'and remove it as a dependency from downstream blocks.'
      }
      title={`Delete ${block.uuid} anyway?`}
      width={UNIT * 34}
    />
  ));

  const [deleteBlockFile] = useMutation(
    ({
      block: {
        language,
        type,
        uuid,
      },
      force = false,
    }: {
      block: BlockType;
      force?: boolean;
    }) => {
      let path = `${type}/${uuid}`;
      if (language && FILE_EXTENSION_TO_LANGUAGE_MAPPING_REVERSE[language]) {
        path = `${path}.${FILE_EXTENSION_TO_LANGUAGE_MAPPING_REVERSE[language].toLowerCase()}`;
      }

      return api.blocks.useDelete(encodeURIComponent(path), { force })();
    },
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchAutocompleteItems();
            fetchPipeline();
            fetchFileTree();
          },
          onErrorCallback: ({
            error: {
              exception,
              message,
            },
          }) => {
            if (message.includes('raise HasDownstreamDependencies')) {
              showDeleteConfirmation({ block: selectedBlock, exception });
            }
          },
        },
      ),
    },
  );

  const dataExporterBlock: BlockType = find(pipeline?.blocks, ({ type }) => BlockTypeEnum.DATA_EXPORTER === type);
  const [updateDestinationBlock] = useMutation(
    api.blocks.pipelines.useUpdate(pipeline?.uuid, dataExporterBlock?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipeline?.();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
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
    addNewBlock,
    dataExporterBlock,
    draggingFile,
    handleClick,
    pipeline,
    ref,
    repoPath,
    setSelectedBlock,
    timeout,
    updateDestinationBlock,
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
    props,
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
  const selectedFolder = useMemo(() => selectedFile && typeof selectedFile?.children !== 'undefined' && selectedFile, [
    selectedFile,
  ]);

  const [showModal, hideModal] = useModal(() => (
    <UploadFiles
      fetchFileTree={fetchFileTree}
      onCancel={hideModal}
      selectedFolder={selectedFolder}
    />
  ), {
  }, [
    fetchFileTree,
    selectedFolder,
  ], {
    background: true,
    uuid: 'upload_files',
  });

  const [showModalNewFile, hideModalNewFile] = useModal((opts: {
    file: FileType;
    moveFile?: boolean;
  }) => (
    <NewFile
      fetchFileTree={fetchFileTree}
      file={opts?.file}
      moveFile={opts?.moveFile}
      onCancel={hideModalNewFile}
      onCreateFile={onCreateFile}
      selectedFolder={selectedFolder}
      setErrors={setErrors}
    />
  ), {
  }, [
    fetchFileTree,
    onCreateFile,
    selectedFolder,
    setErrors,
  ], {
    background: true,
    disableClickOutside: true,
    uuid: 'new_file',
  });

  const [showModalNewFolder, hideModalNewFolder] = useModal((opts: {
    file: FileType;
    moveFile?: boolean;
  }) => (
    <NewFolder
      fetchFileTree={fetchFileTree}
      file={opts?.file}
      moveFile={opts?.moveFile}
      onCancel={hideModalNewFolder}
      selectedFolder={selectedFolder}
      setErrors={setErrors}
    />
  ), {
  }, [
    fetchFileTree,
    selectedFolder,
    setErrors,
  ], {
    background: true,
    disableClickOutside: true,
    uuid: 'new_folder',
  });

  const menuMemo = useMemo(() => {
    if (!selectedBlock && !selectedFile && !selectedFolder) {
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

    const items = [];
    if (selectedFolder) {
      items.push(...[
        {
          label: () => 'New folder',
          onClick: () => {
            showModalNewFolder();
          },
          uuid: 'new_folder',
        },
        {
          label: () => 'Rename folder',
          onClick: () => {
            showModalNewFolder({ file: selectedFolder });
          },
          uuid: 'rename_folder',
        },
        {
          label: () => 'Move folder',
          onClick: () => {
            showModalNewFolder({ file: selectedFolder, moveFile: true });
          },
          uuid: 'Move_folder',
        },
        {
          label: () => 'Delete folder',
          onClick: () => {
            const fp = getFullPathWithoutRootFolder(selectedFolder);
            if (typeof window !== 'undefined'
              && window.confirm(
                `Are you sure you want to delete folder ${fp} and all its subfolders and files?`,
              )
            ) {
              deleteFolder(encodeURIComponent(fp));
            }
          },
          uuid: 'Delete_folder',
        },
        {
          label: () => 'New file',
          onClick: () => {
            showModalNewFile({ file: {} });
          },
          uuid: 'new_file',
        },
        {
          label: () => 'Upload files',
          onClick: () => {
            showModal();
          },
          uuid: 'upload_files',
        },
      ]);
    } else if (selectedFile) {
      items.push(...[
        {
          label: () => 'Rename file',
          onClick: () => {
            showModalNewFile({ file: selectedFile });
          },
          uuid: 'rename_file',
        },
        {
          label: () => 'Move file',
          onClick: () => {
            showModalNewFile({ file: selectedFile, moveFile: true });
          },
          uuid: 'move_file',
        },
      ]);


      if (selectedBlock) {
        items.push({
          label: () => 'Delete block file',
          onClick: () => {
            if (selectedBlock.type === BlockTypeEnum.CHART) {
              if (typeof window !== 'undefined'
                && window.confirm(`Are you sure you want to delete widget ${selectedBlock.uuid}?`)
              ) {
                deleteWidget(selectedBlock);
              }
            } else {
              if (typeof window !== 'undefined'
                && window.confirm(`Are you sure you want to delete block ${selectedBlock.uuid}?`)
              ) {
                deleteBlockFile({ block: selectedBlock });
              }
            }
          },
          uuid: 'delete_block_file',
        });
      } else {
        items.push({
          label: () => 'Delete file',
          onClick: () => {
            const fp = getFullPathWithoutRootFolder(selectedFile);
            if (typeof window !== 'undefined'
              && window.confirm(`Are you sure you want to delete file ${fp}?`)
            ) {
              deleteFile(encodeURIComponent(fp));
            }
          },
          uuid: 'delete_file',
        });
      }
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
          items={items}
          open
          parentRef={undefined}
          uuid="FileBrowser/ContextMenu"
          width={MENU_WIDTH}
        />
      </div>
    );
  }, [
    coordinates,
    deleteBlockFile,
    deleteFile,
    deleteFolder,
    deleteWidget,
    ref,
    showModal,
    showModalNewFile,
    showModalNewFolder,
    selectedBlock,
    selectedFile,
    selectedFolder,
  ]);

  return (
    <ContainerStyle ref={ref}>
      {filesMemo}

      {(selectedBlock || selectedFile || selectedFolder) && menuMemo}

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
