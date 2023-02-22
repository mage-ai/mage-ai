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
import { KEY_CODE_ENTER } from '@utils/hooks/keyboardShortcuts/constants';
import { getFullPathWithoutRootFolder } from '../utils';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';

type NewFileProps = {
  fetchFileTree?: () => void;
  onCancel: () => void;
  selectedFolder: FileType;
  setErrors?: (opts: {
    errors: any;
    response: any;
  }) => void;
};

function NewFile({
  fetchFileTree,
  onCancel,
  selectedFolder,
  setErrors,
}: NewFileProps) {
  const refTextInput = useRef(null);
  const [directory, setDirectory] = useState<string>('');
  const [filename, setFilename] = useState<string>('');

  useEffect(() => {
    refTextInput?.current?.focus();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      setDirectory(getFullPathWithoutRootFolder(selectedFolder));
    }
  }, [selectedFolder]);

  const [createFile] = useMutation(api.files.useCreate());

  return (

    <Panel
      footer={(
        <FlexContainer>
          <KeyboardShortcutButton
            bold
            disabled={!(filename && directory)}
            inline
            keyboardShortcutValidation={({
              keyMapping,
            }) => onlyKeysPresent([KEY_CODE_ENTER], keyMapping)}
            onClick={() => {
              // @ts-ignore
              createFile({
                file: {
                  dir_path: directory,
                  name: filename,
                  overwrite: false,
                },
                file_json_only: true,
              }).then(({
                data,
              }) => {
                const {
                  error,
                } = data;

                if (error) {
                  setErrors?.({
                    errors: {
                      messages: [error.message],
                    },
                    response: data,
                  });
                } else {
                  onCancel();
                  fetchFileTree?.();
                }
              });
            }}
            primary
            tabIndex={0}
            uuid="NewFile/create_file"
          >
            Create file
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
      headerTitle="New file"
    >
      <TextInput
        label="Directory"
        monospace
        onChange={e => setDirectory(e.target.value)}
        required
        setContentOnMount
        value={directory}
      />

      <Spacing mt={2}>
        <TextInput
          label="Filename"
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

export default NewFile;
