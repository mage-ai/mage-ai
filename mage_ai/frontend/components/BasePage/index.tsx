import Head from '@oracle/elements/Head';
import Header, { HeaderProps } from '@components/shared/Header';
import SingleWidthContainer from '@oracle/components/SingleWidthContainer';
import { ContainerStyle } from './index.style';

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
          {children}
        </ContainerStyle>
      </SingleWidthContainer>
    </>
  );
}

export default BasePage;
