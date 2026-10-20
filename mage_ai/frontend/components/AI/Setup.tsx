import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import {
  UNITS_BETWEEN_SECTIONS
} from '@oracle/styles/units/spacing';
import Button from '@oracle/elements/Button';

export default function Setup() {
  return (
    <Spacing mb={UNITS_BETWEEN_SECTIONS}>
      <Panel>
        <Text warning>
          You need to add an OpenAI API key to your project before you can
          generate pipelines using AI.
        </Text>

        <Spacing mt={1}>
          <Text warning>
            Read <Link
              href="https://help.openai.com/en/articles/4936850-where-do-i-find-my-secret-api-key"
              openNewWindow
            >
              OpenAI’s documentation
            </Link> to get your API key.
          </Text>
        </Spacing>

        <Spacing mt={2}>
          <Text>

            Want to code faster and smarter with deeply integrated AI capabilities for building data pipelines?
          </Text>

          <Spacing mt={1}>
            <Button
              basic
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open('https://www.mage.ai/ai?ref=oss', '_blank');
              }}
              style={{
                backgroundColor: '#00FB82',
                padding: '8px 16px',
                fontSize: 16,
                color: '#000000',
              }}
              pill
            >
              Try Mage Pro
            </Button>
          </Spacing>
        </Spacing>
      </Panel>
    </Spacing >
  )
}
