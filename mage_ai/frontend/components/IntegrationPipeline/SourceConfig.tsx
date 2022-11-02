import React, { useEffect, useMemo, useState } from 'react';
import { parse, stringify } from 'yaml';
import { useMutation } from 'react-query';

import BlockType, { BlockLanguageEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import CodeEditor from '@components/CodeEditor';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import api from '@api';
import { CodeEditorStyle } from './index.style';
import { onSuccess } from '@api/utils/response';


type SourceConfigProps = {
  api: string;
  block: BlockType;
  blockContent: any;
  onChangeCodeBlock: any;
  pipeline: PipelineType;
};


function SourceConfig({
  api: apiName,
  block,
  blockContent,
  onChangeCodeBlock,
  pipeline,
}: SourceConfigProps) {
  const [blockConfig, setBlockConfig] = useState(null);

  useEffect(() => {
    if (blockContent && !blockConfig) {
      setBlockConfig(stringify(blockContent?.config));
    }
  }, [blockContent])


  const [connected, setConnected] = useState<boolean>(null);
  const [testConnection, { isLoading }] = useMutation(
    api[apiName].useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setConnected(true);
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
            setConnected(false);
          },
        },
      ),
    },
  );

  if (!block) {
    return null;
  }

  return (
    <>
      <CodeEditorStyle>
        <CodeEditor
          autoHeight
          language={BlockLanguageEnum.YAML}
          onChange={(val: string) => {
            setBlockConfig(val);
            onChangeCodeBlock(block.uuid, stringify({
              ...blockContent,
              config: parse(val),
            }));
          }}
          tabSize={2}
          value={blockConfig || undefined}
          width="100%"
        />
      </CodeEditorStyle>
      <Spacing mt={1}>
        <FlexContainer alignItems="center">
          <Button
            onClick={() => {
              // @ts-ignore
              testConnection({
                action: 'test_connection',
                pipeline_uuid: pipeline.uuid,
                config: parse(blockConfig),
              })
            }}
            primary
            small
          >
            Test connection
          </Button>
          <Spacing ml={1}>
            {isLoading ? (
              <Spinner color="white" small/>
            ) : (
              <>
                {connected && (
                  <Text success>
                    Connected successfully!
                  </Text>
                )}
                {connected === false && (
                  <Text danger>
                    Failed to connect.
                  </Text>
                )}
              </>
            )}
          </Spacing>
        </FlexContainer>
      </Spacing>
    </>
  );
}

export default SourceConfig