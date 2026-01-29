import CodeBlock from '@oracle/components/CodeBlock';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { ENCRYPTION_WARNING, SAMPLE_SECRET_VALUE, SECRET_IN_CODE } from './constants';

type SharedInformationProps = {
  muted?: boolean;
  small?: boolean;
  width?: number;
};

function UsageExamples({
  muted = false,
  small = false,
  width,
}: SharedInformationProps) {
  return (
    <>
      <Spacing mb={PADDING_UNITS}>
        <Text muted={muted} small={small}>
          To reference a secret, use the following templating syntax:
        </Text>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <CodeBlock
          language="yaml"
          maxWidth={width}
          small
          source={SAMPLE_SECRET_VALUE}
        />
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <Text muted={muted} small={small}>
          To reference a secret in code, you can import the `get_secret_value` helper method:
        </Text>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <CodeBlock
          language="python"
          maxWidth={width}
          small
          source={SECRET_IN_CODE}
        />
      </Spacing>
    </>
  );
}

function EncryptionWarning({
  muted = false,
  small = false,
}: SharedInformationProps) {
  return (
    <Spacing mb={PADDING_UNITS}>
      <Text muted={muted} small={small}>
        <Text inline warning>
          WARNING:
        </Text>{' '}
        {ENCRYPTION_WARNING}
      </Text>
    </Spacing>
  );
}

export { EncryptionWarning, UsageExamples };

