import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import { useMutation } from 'react-query';

import AuthToken from '@api/utils/AuthToken';
import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Panel from '@oracle/components/Panel/v2';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { Branch } from '@oracle/icons';
import { Col, Row } from '@components/shared/Grid';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { OutputContainerStyle } from '@components/PipelineDetail/PipelineExecution/index.style';
import { getWebSocket } from '@api/utils/url';
import { pauseEvent } from '@utils/events';
import { onSuccess } from '@api/utils/response';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import Flex from '@oracle/components/Flex';
import Terminal from '@components/Terminal';
import TextArea from '@oracle/elements/Inputs/TextArea';
import Checkbox from '@oracle/elements/Checkbox';
import { remove } from '@utils/array';
import { HeaderStyle, TerminalStyle } from './GitActions.style';


const GIT_ACTION_OPTIONS = {
  'clone': 'Clone repository',
  'new_branch': 'Create new branch',
  'commit': 'Commit & push',
  'pull': 'Pull',
  'reset_hard': 'Hard reset',
}

type GitActionsProps = {
  branch: string;
  fetchBranch: () => void;
};

function GitActions({
  branch,
  fetchBranch,
}: GitActionsProps) {
  const [payload, setPayload] = useState<any>();
  const [confirmMessage, setConfirmMessage] = useState<string>();
  const [action, setAction] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [showTerminal, setShowTerminal] = useState<boolean>();

  const {
    data: dataAllGitBranches,
    mutate: fetchAllBranches,
  } = api.git_branches.list();
  const allBranches = useMemo(
    () => dataAllGitBranches?.['git_branches'],
    [dataAllGitBranches],
  );

  const { data: dataSyncs } = api.syncs.list();
  const gitSettings = useMemo(() => {
    if (dataSyncs) {
      return dataSyncs.syncs?.[0];
    }
  }, [dataSyncs]);


  const [switchBranch, { isLoading: isLoadingSwitchBranch }] = useMutation(
    api.git_branches.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchAllBranches();
            window.location.reload();
          },
          onErrorCallback: ({
            error: {
              exception,
            },
          }) => {
            setError(exception);
          },
        },
      ),
    },
  );

  const [getStatus, { isLoading: isLoadingGetStatus }] = useMutation(
    () => api.git_branches.useUpdate(branch)({ git_branch: { action_type: 'status' } }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          onErrorCallback: ({
            error: {
              exception,
            },
          }) => {
            setError(exception);
          },
        },
      ),
    }
  );

  const [performAction, { isLoading: isLoadingPerformAction }] = useMutation(
    api.git_branches.useUpdate(branch),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setError(null);
            setMessage('DONE');
          },
          onErrorCallback: ({
            error: {
              exception,
            },
          }) => {
            setError(exception);
          },
        },
      ),
    }
  );

  const [
    performActionWithRefresh,
    { isLoading: isLoadingPerformActionWithRefresh },
  ] = useMutation(
    api.git_branches.useUpdate(branch),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setError(null);
            window.location.reload();
          },
          onErrorCallback: ({
            error: {
              exception,
            },
          }) => {
            setError(exception);
          },
        },
      ),
    }
  );
  
  const [status, setStatus] = useState<string>();
  const [untrackedFiles, setUntrackedFiles] = useState<string[]>([]);
  const [modifiedFiles, setModifiedFiles] = useState<string[]>([]);

  const updateStatus = useCallback(() => {
    getStatus().then(({ data }) => {
      const response = data?.['git_branch'];
      const status = response?.['status'];
      const modifiedFiles = response?.['modified_files'];
      const untrackedFiles = response?.['untracked_files'];
      setStatus(status);
      setUntrackedFiles(untrackedFiles);
      setModifiedFiles(modifiedFiles);
    });
  }, [getStatus]);

  const isLoading = useMemo(
    () =>
      isLoadingSwitchBranch ||
      isLoadingPerformAction ||
      isLoadingPerformActionWithRefresh,
    [
      isLoadingSwitchBranch,
      isLoadingPerformAction,
      isLoadingPerformActionWithRefresh,
    ],
  );
  
  useEffect(() => updateStatus(), [action, updateStatus]);

  const fileCheckbox = (file) => (
    <Checkbox
      checked={(payload?.['files'] || []).includes(file)}
      key={file}
      label={
        <Text small>
          {file}
        </Text>
      }
      onClick={() => {
        setPayload(prev => {
          let files = prev?.files || [];
          if (files.includes(file)) {
            files = remove(files, f => f === file);
          } else {
            files = [file].concat(files);
          }
          return {
            ...prev,
            files: files,
          };
        });
      }}
    />
  );

  const addFilesEl = useMemo(() => (
    <>
      <Button
        onClick={() => setPayload(prev => ({
          ...prev,
          files: modifiedFiles.concat(untrackedFiles),
        }))}
      >
        Include all changes
      </Button>
      <OutputContainerStyle noScrollbarTrackBackground>
        <Spacing mb={1} />
        {modifiedFiles && modifiedFiles.length > 0 && (
          <>
            <Spacing mb={1}>
              <Text>
                Modified files
              </Text>
            </Spacing>
            {modifiedFiles.map(fileCheckbox)}
          </>
        )}
        {untrackedFiles && untrackedFiles.length > 0 && (
          <>
            <Spacing mb={1}>
              <Text>
                Untracked files
              </Text>
            </Spacing>
            {untrackedFiles.map(fileCheckbox)}
          </>
        )}
      </OutputContainerStyle>
    </>
  ), [
    modifiedFiles,
    payload,
    untrackedFiles,
  ]);

  const actionPanel = useMemo(() => (
    <Spacing p={2}>
      {isLoading ? (
        <Spinner color="white" />
      ) : (
        <>
          {action === 'commit' && (
            <>
              <TextArea
                compact
                fullWidth
                label="Commit message"
                monospace
                onChange={e => setPayload(prev => ({
                  ...prev,
                  message: e.target.value,
                }))}
                required
                value={payload?.['message']}
              />
              <Spacing mt={1} />
              <FlexContainer>
                <Button
                  borderLess
                  onClick={() => {
                    // @ts-ignore
                    performAction({
                      git_branch: {
                        action_type: 'commit',
                        ...payload,
                      }
                    }).then(() => {
                      updateStatus();
                      setPayload(null);
                    });
                  }}
                  success
                >
                  Commit
                </Button>
                <Spacing mr={1} />
                <Button
                  borderLess
                  onClick={() => {
                    // @ts-ignore
                    performAction({
                      git_branch: {
                        action_type: 'push',
                      },
                    });
                  }}
                  primary
                >
                  Push
                </Button>
              </FlexContainer>
            </>
          )}
          {action === 'new_branch' && (
            <>
              <TextInput
                compact
                fullWidth
                label="Branch name"
                monospace
                onChange={e => setPayload({
                  name: e.target.value,
                })}
                value={payload?.['name']}
              />
              <Spacing mt={1} />
              <Button
                borderLess
                onClick={() => {
                  // @ts-ignore
                  switchBranch({
                    git_branch: payload,
                  });
                }}
                primary
              >
                Create
              </Button>
            </>
          )}
          {action === 'clone' && (
            <>
              <Text>
                Clone from <Text default inline>
                  {gitSettings?.remote_repo_link}
                </Text> to <Text default inline>
                  {gitSettings?.repo_path}
                </Text>. This <Text danger inline>
                  will overwrite
                </Text> any existing data in the local repository.
              </Text>
              <Spacing mt={1} />
              <Button
                borderLess
                onClick={() => {
                  // @ts-ignore
                  performActionWithRefresh({
                    git_branch: {
                      action_type: 'clone',
                    },
                  });
                }}
                primary
              >
                Clone
              </Button>
            </>
          )}
          {action === 'pull' && (
            <Button
              borderLess
              onClick={() => {
                // @ts-ignore
                performActionWithRefresh({
                  git_branch: {
                    action_type: 'pull',
                  },
                });
              }}
              primary
            >
              Pull
            </Button>
          )}
          {action === 'reset_hard' && (
            <>
              <Spacing mb={1}>
                <Text>
                  {confirmMessage || 'This will reset your local branch to match the remote branch.'}
                </Text>
              </Spacing>
              {confirmMessage ? (
                <Button
                  borderLess
                  onClick={() => {
                    setConfirmMessage(null);
                    // @ts-ignore
                    performActionWithRefresh({
                      git_branch: {
                        action_type: 'reset',
                      },
                    });
                  }}
                  warning
                >
                  Confirm
                </Button>
              ) : (
                <Button
                  borderLess
                  onClick={() => setConfirmMessage(
                    'Are you sure you want to reset your branch? Your local changes may be erased.')}
                  primary
                >
                  Reset branch
                </Button>
              )}
            </>
          )}
          <Spacing mt={1}>
            {!isLoading && (
              <>
                {!error && message && (
                  <Text>
                    {message}
                  </Text>
                )}
                {error && (
                  <Text preWrap danger>
                    {error}
                  </Text>
                )}
              </>
            )}
          </Spacing>
        </>
      )}
    </Spacing>
  ), [
    isLoading,
    action,
    error,
    message,
    payload,
    confirmMessage,
    status,
  ]);

  const token = useMemo(() => new AuthToken(), []);
  const sharedWebsocketData = useMemo(() => ({
    api_key: OAUTH2_APPLICATION_CLIENT_ID,
    token: token.decodedToken.token,
  }), [
    token,
  ]);

  const {
    lastMessage,
    sendMessage,
  } = useWebSocket(getWebSocket('terminal'), {
    shouldReconnect: () => true,
    queryParams: sharedWebsocketData,
  });

  return (
    <div style={{
      height: '75vh',
      width: '75vw',
    }}>
      <Panel fullHeight>
        <HeaderStyle>
          <Spacing m={2}>
            <FlexContainer>
              <Select
                beforeIcon={<Branch />}
                compact
                key="select_branch"
                onChange={(e) => {
                  e.preventDefault();
                  // @ts-ignore
                  switchBranch({
                    git_branch: {
                      name: e.target.value
                    },
                  });
                }}
                placeholder="Select a branch"
                value={branch}
              >
                {allBranches?.map(({ name }) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
              <Spacing ml={2} />
              <Select
                compact
                key="select_git_action"
                onChange={(e) => {
                  e.preventDefault();
                  setAction(e.target.value);
                  setMessage(null);
                  setPayload(null);
                }}
                value={action}
              >
                <option value="">
                  Select an action
                </option>
                {Object.entries(GIT_ACTION_OPTIONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </FlexContainer>
          </Spacing>
          <Spacing m={2}>
            <FlexContainer alignItems="center">
              <Text>UI</Text>
              <Spacing ml={1} />
              <ToggleSwitch
                checked={!!showTerminal}
                monotone
                onCheck={() => setShowTerminal(prev => !prev)}
              />
              <Spacing ml={1} />
              <Text>Terminal</Text>
            </FlexContainer>
          </Spacing>
        </HeaderStyle>
        <Row fullHeight>
          <Col md={6}>
            <Spacing p={2}>
              {action === 'commit' ? addFilesEl : (
                <OutputContainerStyle noScrollbarTrackBackground>
                  {status?.split('\\n')?.map((t) => (
                    <Text key={t} monospace preWrap small>
                      {t}
                    </Text>
                  ))}
                </OutputContainerStyle>
              )}
            </Spacing>
          </Col>
          <Col md={6}>
            {showTerminal ? (
              <TerminalStyle>
                <Terminal
                  lastMessage={lastMessage}
                  sendMessage={sendMessage}
                />
              </TerminalStyle>
            ) : actionPanel}
          </Col>
        </Row>
      </Panel>
    </div>
  );
}

export default GitActions;
