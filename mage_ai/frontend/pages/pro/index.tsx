import Section from '@mana/elements/Section';
import { LayoutVersionEnum } from '@utils/layouts';
import { Row, Col, Visible, Hidden } from 'react-grid-system';

import Button from '@mana/elements/Button';
import Text from '@mana/elements/Text';

function Home({ data }: { data: any }) {
  return (
    <Section>
      <Text>
        <Text inline>Your current screen class is </Text>
        <Visible xs><strong>xs</strong></Visible>
        <Visible sm><strong>sm</strong></Visible>
        <Visible md><strong>md</strong></Visible>
        <Visible lg><strong>lg</strong></Visible>
        <Visible xl><strong>xl</strong></Visible>
        <Visible xxl><strong>xxl</strong></Visible>
        <Text inline>.</Text>
      </Text>

      <Text>
        I’ve found several existing blocks that can potentially be reused.
        Take a look and let me know if anything works,
        you can also ask me to simply choose the best one.
        {data?.pipelines?.[0]?.uuid}
      </Text>

      <Button>
        Apps
      </Button>
    </Section>
  );
}

export async function getServerSideProps() {
  const res = await fetch('https://demo.mage.ai/api/pipelines?_limit=1');
  const data = await res.json();

  return {
    props: {
      data,
      version: LayoutVersionEnum.PRO,
    },
  };
}

export default Home;
