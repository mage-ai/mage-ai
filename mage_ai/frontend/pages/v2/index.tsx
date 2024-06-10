import Route from '@components/v2/Route';

function Home() {
  return <div />;
}

export async function getStaticProps() {
  const res = await fetch('https://demo.mage.ai/api/pipelines?_limit=1');
  const data = await res.json();

  return {
    props: {
      data,
    },
  };
}

export default Route(Home);
