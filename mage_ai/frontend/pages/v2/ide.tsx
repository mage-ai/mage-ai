import Button from '@mana/elements/Button';
import Divider from '@mana/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Grid, { Row, Col } from '@mana/components/Grid';
import Section from '@mana/elements/Section';
import Tag from '@mana/components/Tag';
import Text from '@mana/elements/Text';
import { LayoutVersionEnum } from '@utils/layouts';
import MateriaIDE from 'components/v2/Materia';

function IDE() {
  return (
    <Row>
      <Col>
        <Section>
          <MateriaIDE />
        </Section>
      </Col>
    </Row>
  );
}

export async function getStaticProps() {
  return {
    props: {
      version: LayoutVersionEnum.V2,
    },
  };
}

export default IDE;
