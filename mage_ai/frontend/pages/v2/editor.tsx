import MateriaIDE from '@components/v2/IDE';
import { LayoutVersionEnum } from '@utils/layouts';

function Editor() {
  return (
    <>
      <MateriaIDE uuid="mager" />
    </>
  );
}

export async function getStaticProps() {
  return {
    props: {
      version: LayoutVersionEnum.V2,
    },
  };
}

export default Editor;
