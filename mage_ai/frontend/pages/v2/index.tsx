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
  DownCaret,
  DownTriangle,
  Expired,
  Hidden,
  Insights,
  LeftCaret,
  Locked,
  Powerups,
  Quickstart,
  RightCaret,
  RightUp,
  Settings,
  Trigger,
  UpCaret,
  UpTriangle,
  Users,
  Visible,
} from '@mana/icons';

const ICONS = [
  Billing,
  Close,
  Cluster,
  Dark,
  DownCaret,
  DownTriangle,
  Expired,
  Hidden,
  Insights,
  LeftCaret,
  Locked,
  Powerups,
  Quickstart,
  RightCaret,
  RightUp,
  Settings,
  Trigger,
  UpCaret,
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

  return (
    <Grid>
      <Divider />

      <Row>
        <Col>
          <Row>
            <Col>
              <Text>Your current screen class is: &nbsp;</Text>
            </Col>

            <Col>
              <ClientOnly>
                <Tag secondary>Hello</Tag>
              </ClientOnly>

              <Divider short />
            </Col>
          </Row>
        </Col>
        <Col>
          <Button Icon={Cluster} {...buttonProps} primary>
            Add
          </Button>
        </Col>
        <Col>
          <Button Icon={Settings} {...buttonProps} secondary>
            Add
          </Button>
        </Col>
      </Row>

      <Divider />

      <Row>
        <Col>
          <Section>
            <Row align="center" justify="between">
              <Col md={2}>
                <Text light>{text}</Text>
              </Col>
              <Col md={5}>
                <Text>{text}</Text>
              </Col>
              <Col md={3}>
                <Text italic>{text}</Text>
              </Col>
            </Row>
            <Row align="stretch" justify="center">
              <Col md={3}>
                <Text medium>{text}</Text>
              </Col>
              <Col md={2}>
                <Text semiBold>{text}</Text>
              </Col>
              <Col md={7}>
                <Row align="center" direction="column" style={{ height: 600 }}>
                  <Col>
                    <Section>
                      <Text light monospace>
                        {text}
                      </Text>
                    </Section>
                  </Col>
                  <Col>
                    <Section>
                      <Text monospace>{text}</Text>
                    </Section>
                  </Col>
                  <Col>
                    <Section>
                      <Text italic monospace>
                        {text}
                      </Text>
                    </Section>
                  </Col>
                </Row>
              </Col>
            </Row>
            <Row align="stretch" justify="around">
              <Col md={4}>
                <Section stretch>
                  <Text bold>{text}</Text>
                </Section>
              </Col>
              <Col md={3}>
                <Section stretch>
                  <Text bold italic>
                    {text}
                  </Text>
                </Section>
              </Col>
              <Col md={2}>
                <Section stretch>
                  <Text black>{text}</Text>
                </Section>
              </Col>
            </Row>
          </Section>
        </Col>
      </Row>

      <Divider />

      <Section>
        <Row nogutter>
          <Col offset={{ md: 8 }}>
            <Text medium monospace>
              {text}
            </Text>
          </Col>
        </Row>
        <Divider short />
        <Row align="center">
          <Col md="content">
            <Text monospace semiBold>
              Stretch to fit the content
            </Text>
          </Col>
          <Col>
            <Button {...buttonProps} primary>
              Add
            </Button>
          </Col>
        </Row>

        <Divider short />

        <Row align="center">
          <Col md={2} order={{ md: 3, lg: 1 }}>
            <Text monospace semiBold>
              {text}
            </Text>
          </Col>
          <Col md={4} order={{ md: 2, lg: 2 }}>
            <Text bold monospace>
              {text}
            </Text>
          </Col>
          <Col md={6} order={{ md: 1, lg: 3 }}>
            <Text bold italic monospace>
              {text}
            </Text>
          </Col>
        </Row>
      </Section>

      <Row align="center">
        <Col>
          <Section>
            <Row align="center">
              <Col md={6}>
                <Button {...buttonProps} primary tag="normal">
                  Primary
                </Button>
              </Col>
              <Col md={6}>
                <Section>
                  <Row align="center" justify="center" style={{ height: 400 }}>
                    <Col md={12}>
                      <FlexContainer justifyContent="center">
                        <Button {...buttonProps} primary small tag="small">
                          Primary
                        </Button>
                      </FlexContainer>
                    </Col>
                    <Col md={12}>
                      <FlexContainer justifyContent="center">
                        <Button {...buttonProps} secondary tag="small">
                          Secondary
                        </Button>
                      </FlexContainer>
                    </Col>
                    <Col md={12}>
                      <FlexContainer justifyContent="center">
                        <Button {...buttonProps} tag="small">
                          Standard
                        </Button>
                      </FlexContainer>
                    </Col>
                    <Col md={12}>
                      <FlexContainer justifyContent="center">
                        <Button {...buttonProps} basic tag="small">
                          Basic
                        </Button>
                      </FlexContainer>
                    </Col>
                  </Row>
                </Section>
              </Col>
            </Row>
          </Section>
        </Col>

        <Col>
          <Section>
            <Row justify="center">
              <Col md={5}>
                <Button {...buttonProps} secondary tag="normal">
                  Secondary
                </Button>
              </Col>
              <Col md={5}>
                <Button {...buttonProps} tag="normal">
                  Standard
                </Button>
              </Col>
            </Row>

            <Divider />

            <Section>
              <Button {...buttonProps} basic tag="normal">
                Basic
              </Button>
            </Section>
          </Section>
        </Col>
      </Row>

      <Row>
        {ICONS.map((Icon, idx) => (
          <Col key={idx} md={2}>
            <Section>
              <Row justify="around">
                <Col md="content">
                  <Text monospace>{idx}</Text>
                </Col>

                <Col md="content">
                  // @ts-ignore
                  <Icon />
                </Col>
              </Row>
            </Section>
          </Col>
        ))}
      </Row>
    </Grid>
  );
}

export async function getServerSideProps() {
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
