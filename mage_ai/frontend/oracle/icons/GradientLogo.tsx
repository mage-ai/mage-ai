const HEIGHT = 14;
const WIDTH = 20;
const RATIO = WIDTH / HEIGHT;

type GradientLogoProps = {
  height?: number;
  width?: number;
}

function GradientLogo({
  height,
  width,
}: GradientLogoProps) {
  const h = height || (width ? (width * (1 / RATIO)) : HEIGHT);
  const w = width || (height ? (height * (RATIO)) : WIDTH);

  return (
    <svg
  width={w}
  height={h}
  viewBox="0 0 400 300"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M393.46 53.27H200V50.27C200 38.23 204.81 26.68 213.44 18.19C222.07 9.7 233.77 4.9 245.88 4.9H393.46V53.27Z"
    fill="#2A19EF"
  />
  <path
    d="M6.54 53.27H200V56.27C200 68.37 195.17 79.97 186.5 88.48C177.83 96.99 166.08 101.63 154 101.63H6.54V53.27Z"
    fill="#2A19EF"
  />
  <path
    d="M393.46 246.73H6.54V295.1H393.46V246.73Z"
    fill="#2A19EF"
  />
  <path
    d="M393.46 150H200V147C200 134.96 204.81 123.41 213.44 114.92C222.07 106.43 233.77 101.63 245.88 101.63H393.46V150Z"
    fill="#2A19EF"
  />
  <path
    d="M6.54 150H200V153C200 165.1 195.17 176.7 186.5 185.21C177.83 193.72 166.08 198.37 154 198.37H6.54V150Z"
    fill="#2A19EF"
  />
</svg>
  );
}

export default GradientLogo;
