import dynamic from 'next/dynamic';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
const Layout = dynamic(() => import('./Layout'));

function Canvas(props, ref: Ref.HTMLCanvasElement) {
  return (
    <DndProvider backend={HTML5Backend}>
      <Layout />
    </DndProvider>
  );
}

export default Canvas;
