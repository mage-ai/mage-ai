import Section from '@mana/elements/Section';
import { LayoutVersionEnum } from '@utils/layouts';
import { Row, Col, Visible, Hidden } from 'react-grid-system';

import ClientOnly from '@hocs/ClientOnly';
import Button from '@mana/elements/Button';
import Tag from '@mana/components/Tag';
import Text from '@mana/elements/Text';
import Divider from '@mana/elements/Divider';

function Home({ data }: { data: any }) {
  const text = `
    I’ve found several existing blocks that can potentially be reused.
    Take a look and let me know if anything works,
    you can also ask me to simply choose the best one.
  `;
  return (
    <>
      <Divider />

      <Button
        basic
        logEvent={{ page: 'home', uuid: 'testing' }}
        onClick={() => console.log('Clicked!')}
        small
        tag={data?.pipelines?.[0]?.type}
      >
        Add
      </Button>

      <Divider short />

      <Button
        logEvent={{ page: 'home', uuid: 'testing' }}
        onClick={() => console.log('Clicked!')}
        small
        tag={data?.pipelines?.[0]?.type}
      >
        Add
      </Button>

      <Divider short />

      <Section>
        <Text>
          Your current screen class is: &nbsp;

          <ClientOnly>
            <Tag secondary>
              <Visible xs><strong>xs</strong></Visible>
              <Visible sm><strong>sm</strong></Visible>
              <Visible md><strong>md</strong></Visible>
              <Visible lg><strong>lg</strong></Visible>
              <Visible xl><strong>xl</strong></Visible>
              <Visible xxl><strong>xxl</strong></Visible>
            </Tag>
          </ClientOnly>
        </Text>

        <Divider />

        <Text light >{text}</Text>
        <Divider short />
        <Text >{text}</Text>
        <Divider short />
        <Text italic >{text}</Text>
        <Divider short />
        <Text medium >{text}</Text>
        <Divider short />
        <Text  semiBold>{text}</Text>
        <Divider short />
        <Text bold >{text}</Text>
        <Divider short />
        <Text bold italic >{text}</Text>
        <Divider short />
        <Text black >{text}</Text>

        <Divider />

        <Text light monospace>{text}</Text>
        <Divider short />
        <Text monospace>{text}</Text>
        <Divider short />
        <Text italic monospace>{text}</Text>
        <Divider short />
        <Text medium monospace>{text}</Text>
        <Divider short />
        <Text monospace semiBold>{text}</Text>
        <Divider short />
        <Text bold monospace>{text}</Text>
        <Divider short />
        <Text bold italic monospace>{text}</Text>
      </Section>

      <Section>

        <Button
          logEvent={{ page: 'home', uuid: 'testing' }}
          onClick={() => console.log('Clicked!')}
          primary
          tag="normal"
        >
          Primary
        </Button>

        <Divider short />

        <Button
          logEvent={{ page: 'home', uuid: 'testing' }}
          onClick={() => console.log('Clicked!')}
          primary
          small
          tag="small"
        >
          Primary
        </Button>

        <Divider />

        <Button
          logEvent={{ page: 'home', uuid: 'testing' }}
          onClick={() => console.log('Clicked!')}
          secondary
          tag="normal"
        >
          Secondary
        </Button>

        <Divider short />

        <Button
          logEvent={{ page: 'home', uuid: 'testing' }}
          onClick={() => console.log('Clicked!')}
          secondary
          tag="small"
        >
          Secondary
        </Button>

        <Divider />

        <Button
          logEvent={{ page: 'home', uuid: 'testing' }}
          onClick={() => console.log('Clicked!')}
          tag="normal"
        >
          Standard
        </Button>

        <Divider short />

        <Button
          logEvent={{ page: 'home', uuid: 'testing' }}
          onClick={() => console.log('Clicked!')}
          tag="small"
        >
          Standard
        </Button>

        <Divider />

        <Button
          basic
          logEvent={{ page: 'home', uuid: 'testing' }}
          onClick={() => console.log('Clicked!')}
          tag="normal"
        >
          Basic
        </Button>

        <Divider short />

        <Button
          basic
          logEvent={{ page: 'home', uuid: 'testing' }}
          onClick={() => console.log('Clicked!')}
          tag="small"
        >
          Basic
        </Button>
      </Section>
    </>
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
