const WIDTH = 69.063;
const HEIGHT = 85;
const RATIO = WIDTH / HEIGHT;

function AmazonWebServicesEMR({
  height,
  size,
  width,
}: {
  height?: number;
  size?: number;
  width?: number;
}) {
  let heightFinal;
  let widthFinal;

  if (size) {
    heightFinal = size / RATIO;
    widthFinal = size;
  } else if (height) {
    heightFinal = height;
    widthFinal = height * RATIO;
  } else if (width) {
    heightFinal = width / RATIO;
    widthFinal = width;
  }

  return (
    <svg
      fill="#fff"
      fillRule="evenodd"
      height={heightFinal}
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={widthFinal}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <use xlinkHref="#A" x="2.031" y="2.5" />
      <symbol id="A" overflow="visible">
        <g stroke="none">
          <path d="M16.829 39.981L13.086 62.83l-9.812 2.283-3.255-1.659V39.981h16.81z" fill="#9d5025" />
          <path d="M65 31.932l-32.5 2.351L0 31.932 32.5 0 65 31.932z" fill="#6b3b19" />
          <path d="M38.971 39.981H3.274v25.132l35.697-8.322v-16.81z" fill="#f58534" />
          <path d="M21.127 39.981l1.168 25.698-11.43 3.298-3.992-2.029V39.981h14.254z" fill="#9d5025" />
          <path d="M49.664 39.981H10.865v28.995l38.799-11.22V39.981z" fill="#f58534" />
          <path d="M29.255 39.981v30.507l-8.912 3.317-5.016-2.556V39.981h13.929z" fill="#9d5025" />
          <path d="M58.117 39.981H20.342v33.824l37.775-14.078V39.981z" fill="#f58534" />
          <path d="M26.019 76.703V39.981h24.602l11.803 24.771L32.49 80.001l-6.471-3.297z" fill="#9d5025" />
          <path d="M32.49 80.001v-40.02h32.5v23.464l-32.5 16.556zM65 31.932l-32.5-5.697V0L65 16.556v15.376z" fill="#f58534" />
          <path d="M0 31.932l32.5-5.697V0L0 16.556v15.376z" fill="#9d5025" />
        </g>
      </symbol>
    </svg>
  );
}

export default AmazonWebServicesEMR;
