import Head from '@oracle/elements/Head';
import Header, { HeaderProps } from '@components/shared/Header';
import SingleWidthContainer from '@oracle/components/SingleWidthContainer';
import { ContainerStyle } from './index.style';
import FlexContainer from '@oracle/components/FlexContainer';

type BasePageProps = {
  children: any;
  headerProps?: HeaderProps;
  title: string;
};

function BasePage({
  children,
  headerProps,
  title,
}: BasePageProps) {
  return (
    <>
      <Head title={title} />

      <Header {...headerProps} />

      <SingleWidthContainer>
        <ContainerStyle fullHeight>
          <FlexContainer
            flexDirection="column"
            fullHeight
            justifyContent="center"
          >
            {children}
          </FlexContainer>
        </ContainerStyle>
      </SingleWidthContainer>
    </>
  );
}

export default BasePage;
