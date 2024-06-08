import AppContainer from '@components/v2/AppContainer';
import Button from '@mana/elements/Button';
import Grid, { Row as GridRow } from '@mana/components/Grid';
import Section from '@mana/elements/Section';
import TextInput from '@mana/elements/Input/TextInput';
import { ContainerStyled } from './index.style';
import { Row, Col } from '@mana/components/Container';
import { Cluster } from '@mana/icons';

function GridContainer() {
  return (
    <ContainerStyled>
      <Grid
        height="inherit"
        pad
        templateRows="auto 1fr"
      >
        <GridRow row={1}>
          <Section>
            <Row align="center" justify="start">
              <Col xs="content">
                <Button
                  Icon={Cluster}
                  onClick={() => {
                    console.log('Run pipeline');
                  }}
                  primary
                >
                  Run pipeline
                </Button>
              </Col>
              <Col>
                <Row>
                  <Col>
                    <TextInput
                      monospace
                      number
                      placeholder="Row"
                    />
                  </Col>
                  <Col>
                    <TextInput
                      monospace
                      number
                      placeholder="Column"
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Section>
        </GridRow>

        <Grid
          row={2}
          templateColumns="repeat(2, 1fr)"
          uuid="app-layout"
        >
          <AppContainer />
          <AppContainer />
        </Grid>
      </Grid>
    </ContainerStyled>
  );
}

export default GridContainer;
