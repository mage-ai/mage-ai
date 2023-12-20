import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import FileType from '@interfaces/FileType';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { ProjectTypeEnum } from '@interfaces/ProjectType';
import { UNIT } from '@oracle/styles/units/spacing';
import { getFullPathWithoutRootFolder, removeRootFromFilePath } from '../utils';
import { isEmptyObject } from '@utils/hash';
import { onSuccess } from '@api/utils/response';

type NewFolderProps = {
  fetchFileTree?: () => void;
  file?: FileType;
  moveFile?: boolean;
  onCancel: () => void;
  onCreateFile?: (file: FileType) => void;
  projectType?: ProjectTypeEnum;
  selectedFolder: FileType;
  setErrors?: (opts: {
    errors: any;
    response: any;
  }) => void;
  showError?: (opts: {
    errors: any;
    response: any;
  }) => void;
};

function NewFolder({
  fetchFileTree,
  file: fileProp,
  moveFile,
  onCancel,
  onCreateFile,
  projectType,
  selectedFolder,
  setErrors,
  showError,
}: NewFolderProps) {
  const refTextInput = useRef(null);
  const file = isEmptyObject(fileProp) ? null : fileProp;

  const [directory, setDirectory] = useState<string>(file
    ? getFullPathWithoutRootFolder(file, null, true)
    : '',
  );
  const [filename, setFilename] = useState<string>(file
    ? file?.name
    : '',
  );

  useEffect(() => {
    refTextInput?.current?.focus();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      setDirectory(removeRootFromFilePath(selectedFolder?.uuid));
    }
  }, [selectedFolder]);

  const [createFolder] = useMutation(
    api.folders.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({ file }) => {
            fetchFileTree?.();
            onCancel();
            onCreateFile?.(file);
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

  const [updateFolder] = useMutation(
    api.folders.useUpdate(file && encodeURIComponent(getFullPathWithoutRootFolder(file))),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchFileTree?.();
            onCancel();
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

  const [createProject, { isLoading: isLoadingCreateProject }] = useMutation(
    api.projects.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchFileTree?.();
            onCancel();
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

  return (
    <Panel
      footer={(
        <FlexContainer>
          <KeyboardShortcutButton
            bold
            disabled={!filename}
            inline
            loading={isLoadingCreateProject}
            onClick={() => {
              if (file) {
                // @ts-ignore
                return updateFolder({
                  folder: {
                    name: filename,
                    path: directory,
                  },
                });
              } else if (projectType) {
                // @ts-ignore
                return createProject({
                  project: {
                    repo_path: directory,
                    type: projectType,
                    uuid: filename,
                  },
                });
              } else {
                // @ts-ignore
                return createFolder({
                  folder: {
                    name: filename,
                    overwrite: false,
                    path: directory,
                  },
                });
              }
            }}
            primary
            tabIndex={0}
            uuid="NewFolder/create_folder"
          >
            {projectType && 'Create project'}
            {!projectType && (
              <>
                {file
                  ? moveFile
                    ? 'Move'
                    : 'Rename'
                  : 'Create'} folder
              </>
            )}
          </KeyboardShortcutButton>

          <Spacing ml={1}>
            <Button
              onClick={() => onCancel()}
              tabIndex={0}
            >
              Cancel
            </Button>
          </Spacing>
        </FlexContainer>
      )}
      headerTitle={file
        ? moveFile
          ? 'Move folder'
          : 'Rename folder'
        : projectType
          ? (ProjectTypeEnum.STANDALONE === projectType
            ? 'New Mage project'
            : ProjectTypeEnum.DBT === projectType
              ? 'New dbt project'
              : 'New project'
          )
          : 'New folder'
        }
      minWidth={UNIT * 50}
    >
      <TextInput
        disabled={!!file && !moveFile}
        label={projectType ? 'Project directory' : 'Directory'}
        monospace
        onChange={e => setDirectory(e.target.value)}
        setContentOnMount
        value={directory}
      />

      <Spacing mt={2}>
        <TextInput
          disabled={!!moveFile}
          label={projectType ? 'Project name' : 'Folder name'}
          monospace
          onChange={e => setFilename(e.target.value)}
          ref={refTextInput}
          required
          value={filename}
        />
      </Spacing>
    </Panel>
  );
}

export default NewFolder;
