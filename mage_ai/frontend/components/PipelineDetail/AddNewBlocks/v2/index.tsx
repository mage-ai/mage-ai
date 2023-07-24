import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import MarkdownPen from '@oracle/icons/custom/MarkdownPen';
import Spacing from '@oracle/elements/Spacing';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Tooltip from '@oracle/components/Tooltip';
import {
  ContainerStyle,
  ICON_SIZE,
  DividerStyle,
} from './index.style';
import {
  BlockBlank,
  TemplateShapes,
} from '@oracle/icons';

function AddNewBlocksV2() {
  return (
    <ContainerStyle>
      <FlexContainer
        alignItems="center"
      >
        <Tooltip
          block
          label="Add a block from a template"
          size={null}
          widthFitContent
        >
          <Button
            iconOnly
            noBackground
            noBorder
            noPadding
            onClick={() => {
              console.log('templates');
            }}
          >
            <TemplateShapes size={ICON_SIZE} />
          </Button>
        </Tooltip>

        <Spacing mr={3} />

        <Tooltip
          block
          label="Add a blank custom block"
          size={null}
          widthFitContent
        >
          <Button
            iconOnly
            noBackground
            noBorder
            noPadding
            onClick={() => {
              console.log('blank');
            }}
          >
            <BlockBlank size={ICON_SIZE} />
          </Button>
        </Tooltip>

        <Spacing mr={3} />

        <Tooltip
          block
          label="Add a markdown block for documentation"
          size={null}
          widthFitContent
        >
          <Button
            iconOnly
            noBackground
            noBorder
            noPadding
            onClick={() => {
              console.log('markdown');
            }}
          >
            <MarkdownPen size={ICON_SIZE} />
          </Button>
        </Tooltip>

        <Spacing mr={3} />

        <DividerStyle />

        <Spacing mr={3} />

        <TextInput
          fullWidth
          noBackground
          noBorder
          paddingHorizontal={0}
          paddingVertical={0}
          placeholder="Add block that..."
        />
      </FlexContainer>
    </ContainerStyle>
  );
}

export default AddNewBlocksV2;
