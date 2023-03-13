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


const GIT_ACTION_OPTIONS = [
  'create new branch',
  'commit',
  'pull',
  'reset',
]

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
  
  const [status, setStatus] = useState<string>();

  const updateStatus = useCallback(() => {
    getStatus().then(({ data }) => {
      const status = data?.['git_branch']?.['status']
      setStatus(status);
    });
  }, [getStatus])

  const isLoading = useMemo(
    () => isLoadingSwitchBranch || isLoadingPerformAction,
    [isLoadingSwitchBranch, isLoadingPerformAction],
  );

  return (
    <div style={{
      width: '400px',
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
              placeholder="Select an action"
              value={action}
            >
              {GIT_ACTION_OPTIONS.map(action => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </Select>
          </Spacing>
          {action === 'commit' && (
            <>
              <Spacing m={1}>
                <OutputContainerStyle maxHeight={400} noScrollbarTrackBackground>
                  {status?.split('\\n')?.map((t) => (
                    <Text key={t} preWrap small>
                      {t}
                    </Text>
                  ))}
                </OutputContainerStyle>
              </Spacing>
              <FlexContainer justifyContent="space-between">
                <TextInput
                  compact
                  label="Commit message"
                  monospace
                  onChange={e => setPayload({
                    message: e.target.value,
                  })}
                  value={payload?.['message']}
                />
                <Button
                  borderLess
                  onClick={() => {
                    // @ts-ignore
                    performAction({
                      git_branch: {
                        action_type: 'commit',
                        ...payload,
                      }
                    })
                  }}
                  success
                >
                  Commit
                </Button>
                <Button
                  borderLess
                  onClick={() => {
                    // @ts-ignore
                    performAction({
                      git_branch: {
                        action_type: 'push',
                      }
                    })
                  }}
                  primary
                >
                  Push
                </Button>
              </FlexContainer>
            </>
          )}
          {action === 'create new branch' && (
            <FlexContainer justifyContent="space-between">
              <TextInput
                compact
                label="Branch name"
                monospace
                onChange={e => setPayload({
                  name: e.target.value
                })}
                value={payload?.['name']}
              />
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
                Create Branch
              </Button>
            </FlexContainer>
          )}
          {action === 'pull' && (
            <Button
              borderLess
              onClick={() => {
                // @ts-ignore
                performAction({
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
          {action === 'reset' && (
            <>
              {confirmMessage ? (
                <FlexContainer>
                  <Text>
                    {confirmMessage}
                  </Text>
                  <Button
                    borderLess
                    onClick={() => {
                      // @ts-ignore
                      performAction({
                        git_branch: {
                          action_type: 'reset',
                        },
                      });
                      setConfirmMessage(null);
                    }}
                    primary
                  >
                    Confirm
                  </Button>
                </FlexContainer>
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
            {isLoading && (<Spinner />)}
            {!isLoading && (
              <>
                {!error && message && (
                  <Text>
                    {message}
                  </Text>
                )}
                {error && (
                  <Text danger>
                    {error}
                  </Text>
                )}
              </>
            )}
          </Spacing>
          
        </Spacing>
      </Panel>
    </div>
  )
}

export default GitActions;
