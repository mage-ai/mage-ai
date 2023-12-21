import * as osPath from 'path';
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
import FlyoutMenu, { DEFAULT_MENU_ITEM_HEIGHT } from '@oracle/components/FlyoutMenu';
import Folder, { FolderSharedProps } from './Folder';
import GradientLogoIcon from '@oracle/icons/GradientLogo';
import NewFile from './NewFile';
import NewFolder from './NewFolder';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PopupMenu from '@oracle/components/PopupMenu';
import Text from '@oracle/elements/Text';
import UploadFiles from './UploadFiles';
import api from '@api';
import useProject from '@utils/models/project/useProject';
import useStatus from '@utils/models/status/useStatus';
import {
  CUSTOM_EVENT_NAME_FOLDER_EXPAND,
} from '@utils/events/constants';
import { ContainerStyle } from './index.style';
import { ContextAreaProps } from '@components/ContextMenu';
import { DBT } from '@oracle/icons';
import { FILE_EXTENSION_TO_LANGUAGE_MAPPING_REVERSE } from '@interfaces/FileType';
import { HEADER_Z_INDEX } from '@components/constants';
import { ProjectTypeEnum } from '@interfaces/ProjectType';
import { UNIT } from '@oracle/styles/units/spacing';
import { buildAddBlockRequestPayload } from '../FileEditor/utils';
import { createPortal } from 'react-dom';
import { find, sortByKey } from '@utils/array';
import { getBlockFromFile, getFullPath, getFullPathWithoutRootFolder } from './utils';
import { initiateDownload } from '@utils/downloads';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';
import { useModal } from '@context/Modal';

const MENU_WIDTH: number = UNIT * 20;
const MENU_ITEM_HEIGHT = 36;

type FileBrowserProps = {
  addNewBlock?: (b: BlockRequestPayloadType, cb: any, opts?: {
    disableFetchingFiles?: boolean;
  }) => void;
  blocks?: BlockType[];
  deleteWidget?: (b: BlockType) => void;
  fetchAutocompleteItems?: () => void;
  fetchFiles?: () => void;
  fetchPipeline?: () => void;
  files?: FileType[];
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
  deleteWidget,
  fetchAutocompleteItems,
  fetchFiles: fetchFileTree,
  fetchPipeline,
  files,
  onClickFile,
  onClickFolder,
  onSelectBlockFile,
  openFile,
  openSidekickView,
  pipeline,
  setErrors,
  setSelectedBlock,
  widgets = [],
}: FileBrowserProps, ref) {
  const timeout = useRef(null);
  const themeContext = useContext(ThemeContext);
  const [coordinates, setCoordinates] = useState<{
    x: number;
    y: number;
  }>(null);
  const [draggingFile, setDraggingFile] = useState<FileType>(null);
  const [selectedFile, setSelectedFile] = useState<FileType>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    setReloadCount(prev => prev + 1);
  }, [files]);

  const selectedFolder = useMemo(() => selectedFile && typeof selectedFile?.children !== 'undefined' && selectedFile, [
    selectedFile,
  ]);

  const [showError] = useError(null, {}, [], {
    uuid: 'FileBrowser',
  });

  const {
    featureEnabled,
    featureUUIDs,
    project,
  } = useProject();
  const { status } = useStatus();

  const [downloadFile] = useMutation(
    (fullPath: string) => api.downloads.files.useCreate(fullPath)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            const token = response.data.download.token;
            initiateDownload(token);
          },
          onErrorCallback: (response, errors) => {
            if (setErrors) {
              return setErrors({
                errors,
                response,
              });
            }

            return showError({
              errors,
              response,
            });
          },
        }
      )
    }
  );

  const [deleteFile] = useMutation(
    (fullPath: string) => api.files.useDelete(fullPath)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchFileTree?.();
          },
          onErrorCallback: (response, errors) => {
            if (setErrors) {
              return setErrors({
                errors,
                response,
              });
            }

            return showError({
              errors,
              response,
            });
          },
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
          onErrorCallback: (response, errors) => {
            if (setErrors) {
              return setErrors({
                errors,
                response,
              });
            }

            return showError({
              errors,
              response,
            });
          },
        },
      ),
    },
  );

  const [deleteBlockFile] = useMutation(
    ({
      block: {
        language,
        type,
        uuid,
      },
      file,
      force = false,
    }: {
      block: BlockType;
      file: FileType;
      force?: boolean;
    }) => {
      return api.blocks.useDelete(
        encodeURIComponent(uuid), {
          file_path: file ? encodeURIComponent(getFullPathWithoutRootFolder(file)) : null,
          force,
        })();
    },
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            // fetchAutocompleteItems?.();
            // fetchPipeline?.();
            fetchFileTree?.();
          },
          onErrorCallback: ({
            error: {
              exception,
              message,
            },
          }) => {
            if (message.includes('raise HasDownstreamDependencies')) {
              showDeleteConfirmation({
                block: selectedBlock,
                file: selectedFile,
                exception,
              });
            }
          },
        },
      ),
    },
  );

  const [showDeleteConfirmation, hideDeleteConfirmation] = useModal(({
    block,
    file,
  }: {
    block: BlockType;
    file: FileType;
  }) => (
    <PopupMenu
      centerOnScreen
      danger
      onCancel={hideDeleteConfirmation}
      onClick={
        () => deleteBlockFile({
          block,
          file,
          force: true,
        }).then(() => hideDeleteConfirmation())
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

  const dataExporterBlock: BlockType = find(pipeline?.blocks, ({ type }) => BlockTypeEnum.DATA_EXPORTER === type);
  const [updateDestinationBlock] = useMutation(
    api.blocks.pipelines.useUpdate(encodeURIComponent(pipeline?.uuid), encodeURIComponent(dataExporterBlock?.uuid)),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipeline?.();
          },
          onErrorCallback: (response, errors) => {
            if (setErrors) {
              return setErrors({
                errors,
                response,
              });
            }

            return showError({
              errors,
              response,
            });
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
            status.repo_path,
            pipeline,
          );

          addNewBlock?.(
            {
              ...blockReqPayload,
              require_unique_name: false,
            },
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
            {
              disableFetchingFiles: true,
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
    setSelectedBlock,
    status,
    timeout,
    updateDestinationBlock,
  ]);

  const filesMemo = useMemo(() => files?.map((file: FileType) => (
    <Folder
      containerRef={ref}
      file={file}
      key={`${file.name}-${reloadCount}`}
      level={0}
      onClickFile={onClickFile}
      onClickFolder={onClickFolder}
      onSelectBlockFile={onSelectBlockFile}
      openFile={openFile}
      reloadCount={reloadCount}
      setCoordinates={setCoordinates}
      setDraggingFile={setDraggingFile}
      setSelectedFile={setSelectedFile}
      theme={themeContext}
      timeout={timeout}
    />
  )), [
    files,
    onClickFile,
    onClickFolder,
    openFile,
    // These cause re-render
    // Don’t use this for now. Just open the block as a file.
    // This function will re-render whenever a block is added or removed to the pipeline.
    onSelectBlockFile,
    reloadCount,
  ]);

  const selectedBlock = useMemo(() => selectedFile && getBlockFromFile(selectedFile), [
    selectedFile,
  ]);
  const draggingBlock  = useMemo(() => draggingFile && getBlockFromFile(draggingFile), [
    draggingFile,
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
    uuid: 'new_file',
  });

  const [showModalNewFolder, hideModalNewFolder] = useModal((opts: {
    file: FileType;
    moveFile?: boolean;
    projectType?: ProjectTypeEnum;
  }) => (
    <NewFolder
      fetchFileTree={fetchFileTree}
      file={opts?.file}
      moveFile={opts?.moveFile}
      onCancel={hideModalNewFolder}
      projectType={opts?.projectType}
      selectedFolder={selectedFolder}
      setErrors={setErrors}
      showError={showError}
    />
  ), {
  }, [
    fetchFileTree,
    selectedFolder,
    setErrors,
    showError,
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
    let xFinal = x + UNIT;
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
        {
          label: () => 'Expand all subfolders',
          onClick: () => {
            const eventCustom = new CustomEvent(CUSTOM_EVENT_NAME_FOLDER_EXPAND, {
              detail: {
                expand: true,
                file: selectedFile,
                folder: selectedFolder,
              },
            });

            if (typeof window !== 'undefined') {
              window.dispatchEvent(eventCustom);
            }
          },
          uuid: 'Expand all subfolders',
        },
        {
          label: () => 'Collapse all subfolders',
          onClick: () => {
            const eventCustom = new CustomEvent(CUSTOM_EVENT_NAME_FOLDER_EXPAND, {
              detail: {
                expand: false,
                file: selectedFile,
                folder: selectedFolder,
              },
            });

            if (typeof window !== 'undefined') {
              window.dispatchEvent(eventCustom);
            }
          },
          uuid: 'Collapse all subfolders',
        },
      ]);

      if (featureEnabled?.(featureUUIDs?.PROJECT_PLATFORM)) {
        items.push({
          beforeIcon: <GradientLogoIcon width={UNIT * 1.5} />,
          onClick: () => {
            showModalNewFolder({ projectType: ProjectTypeEnum.STANDALONE });
          },
          uuid: 'New Mage project',
        });
      }

      if (featureEnabled?.(featureUUIDs?.DBT_V2)) {
        items.push({
          beforeIcon: <DBT />,
          onClick: () => {
            showModalNewFolder({ projectType: ProjectTypeEnum.DBT });
          },
          uuid: 'New dbt project',
        });
      }
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
        }, {
          label: () => 'Download file',
          onClick: () => {
            const fp = getFullPathWithoutRootFolder(selectedFile);
            downloadFile(encodeURIComponent(fp));
          },
          uuid: 'download_file',
        },
      ]);

      if (selectedBlock) {
        items.push({
          label: () => 'Delete file',
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
                deleteBlockFile({
                  block: selectedBlock,
                  file: selectedFile,
                });
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

    let yFinal = y + (UNIT / 2);
    const menuHeight = MENU_ITEM_HEIGHT * items.length;
    if (y + menuHeight >= window.innerHeight) {
      yFinal = y - menuHeight;
    }

    return (
      createPortal(
        <div
          style={{
            left: xFinal,
            position: 'fixed',
            top: yFinal,
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
        </div>,
        document.body,
      )
    );
  }, [
    coordinates,
    deleteBlockFile,
    deleteFile,
    deleteFolder,
    deleteWidget,
    downloadFile,
    featureEnabled,
    featureUUIDs,
    project,
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
