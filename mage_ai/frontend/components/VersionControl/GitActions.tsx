import React, { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

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
import { OutputContainerStyle } from '@components/PipelineDetail/PipelineExecution/index.style';
import { onSuccess } from '@api/utils/response';


const GIT_ACTION_OPTIONS = {
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
  const [payload, setPayload] = useState<object>();
  const [confirmMessage, setConfirmMessage] = useState<string>();
  const [action, setAction] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const {
    data: dataAllGitBranches,
    mutate: fetchAllBranches,
  } = api.git_branches.list();
  const allBranches = useMemo(
    () => dataAllGitBranches?.['git_branches'],
    [dataAllGitBranches],
  );

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

  const updateStatus = useCallback(() => {
    getStatus().then(({ data }) => {
      const status = data?.['git_branch']?.['status']
      setStatus(status);
    });
  }, [getStatus])

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

  return (
    <div style={{
      width: '600px',
    }}>
      <Panel>
        <Spacing p={2}>
          <Spacing mb={1}>
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
          </Spacing>
          <Spacing mb={1}>
            <Select
              compact
              key="select_git_action"
              onChange={(e) => {
                e.preventDefault();
                if (e.target.value === 'commit') {
                  updateStatus();
                }
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
          </Spacing>
          {isLoading ? (
            <Spinner color="white" />
          ) : (
            <>
              {action === 'commit' && (
                <>
                  <Spacing m={1}>
                    <OutputContainerStyle maxHeight={400} noScrollbarTrackBackground>
                      {status?.split('\\n')?.map((t) => (
                        <Text key={t} monospace preWrap small>
                          {t}
                        </Text>
                      ))}
                    </OutputContainerStyle>
                  </Spacing>
                  <FlexContainer justifyContent="space-between">
                    <TextInput
                      compact
                      fullWidth
                      label="Commit message"
                      monospace
                      onChange={e => setPayload({
                        message: e.target.value,
                      })}
                      required
                      value={payload?.['message']}
                    />
                    <Spacing mr={1} />
                    <Button
                      borderLess
                      onClick={() => {
                        // @ts-ignore
                        performAction({
                          git_branch: {
                            action_type: 'commit',
                            ...payload,
                          }
                        }).then(() => updateStatus());
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
                          }
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
                <FlexContainer justifyContent="space-between">
                  <TextInput
                    compact
                    fullWidth
                    label="Branch name"
                    monospace
                    onChange={e => setPayload({
                      name: e.target.value
                    })}
                    value={payload?.['name']}
                  />
                  <Spacing mr={1} />
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
                </FlexContainer>
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
      </Panel>
    </div>
  )
}

export default GitActions;
