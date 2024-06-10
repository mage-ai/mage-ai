type ColProps = {
  uuid?: string;
};

function Col({ uuid }: ColProps) {
  const element = document.createElement('div');
  element.id = uuid;
  element.style.display = 'grid';
  element.style.gridTemplateRows = 'inherit';
  element.style.overflow = 'hidden';

  return element;
}

export default Col;
