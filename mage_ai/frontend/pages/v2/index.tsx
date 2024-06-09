import Section from '@mana/elements/Section';
import { LayoutVersionEnum } from '@utils/layouts';

import ClientOnly from '@hocs/ClientOnly';
import Button from '@mana/elements/Button';
import Tag from '@mana/components/Tag';
import Text from '@mana/elements/Text';
import Divider from '@mana/elements/Divider';
import Grid, { Row, Col } from '@mana/components/Grid';
import FlexContainer from '@oracle/components/FlexContainer';
import {
  Billing,
  Close,
  Cluster,
  Dark,
  DownTriangle,
  Expired,
  Hidden,
  Insights,
  Locked,
  Powerups,
  Quickstart,
  RightUp,
  Settings,
  Trigger,
  UpTriangle,
  Users,
  Visible,
} from '@mana/icons';

const ICONS = [
  Billing,
  Close,
  Cluster,
  Dark,
  DownTriangle,
  Expired,
  Hidden,
  Insights,
  Locked,
  Powerups,
  Quickstart,
  RightUp,
  Settings,
  Trigger,
  UpTriangle,
  Users,
  Visible,
];

function Home({ data }: { data: any }) {
  const text = `
    I’ve found several existing blocks that can potentially be reused.
    Take a look and let me know if anything works,
    you can also ask me to simply choose the best one.
  `;

  const buttonProps = {
    logEvent: { page: 'home', uuid: 'testing' },
    onClick: () => console.log('Clicked!'),
    tag: data?.pipelines?.[0]?.type,
  };

  return <Grid></Grid>;
}

export async function getStaticProps() {
  const res = await fetch('https://demo.mage.ai/api/pipelines?_limit=1');
  const data = await res.json();

  return {
    props: {
      data,
      version: LayoutVersionEnum.V2,
    },
  };
}

export default Home;
