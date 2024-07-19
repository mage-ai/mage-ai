import { ExecutionOutputType, VariableTypeEnum } from '@interfaces/CodeExecutionType';
import Ansi from 'ansi-to-react';
import Text from '@mana/elements/Text';

interface ExecutionOutputProps {
  executionOutput: ExecutionOutputType;
}

export default function ExecutionOutput({
  executionOutput,
}: ExecutionOutputProps) {
  const { output } = executionOutput;

  return (
    <div>
      <Text monospace small>
        <pre
        style={{
          whiteSpace: 'pre-wrap',
        }}
      >
          <Ansi>
            {output && JSON.stringify(output, null, 2)}
          </Ansi>
        </pre>
      </Text>
    </div>
  );
}
