type ColProps = {
  uuid?: string;
};

function Col({
  uuid,
}: ColProps) {
  const element = document.createElement('div');
  element.id = uuid;
  element.style.display = 'grid';

  return element;
}

export default Col;
