import Button from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Grid, { Row, Col } from '@mana/components/Grid';
import MateriaIDE from '@components/v2/IDE';
import Section from '@mana/elements/Section';
import Tag from '@mana/components/Tag';
import Text from '@mana/elements/Text';
import { LayoutVersionEnum } from '@utils/layouts';

function IDEPage() {
  return (
    <>
      <MateriaIDE uuid="mager" />
    </>
  );
}

export async function getStaticProps() {
  return {
    props: {
      version: LayoutVersionEnum.V2,
    },
  };
}

export default IDEPage;
