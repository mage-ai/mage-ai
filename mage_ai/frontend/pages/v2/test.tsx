import Route from '@components/v2/Route';
import { LayoutContext } from '@context/v2/Layout';
import { useContext, useEffect } from 'react';

function Test() {
  const { header, page } = useContext(LayoutContext);

  useEffect(() => {
    page.setPage({
      busy: true,
      title: 'My cool pipelines',
    });
    header.setHeader({
      navTag: 'LLM',
      selectedNavItem: 'builder',
      title: 'Pipelines',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div>Test</div>
}

Test.getInitialProps = async () => ({});

export default Route(Test);
