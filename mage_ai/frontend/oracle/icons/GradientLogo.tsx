const HEIGHT = 14;
const WIDTH = 18.53;
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
    <svg width={w} height={h} viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path opacity="0.4" d="M15.3266 0L19.2641 1.82961e-06L11.9687 14L8.03125 14L15.3266 0Z" fill="url(#paint0_linear_1303_5)" />
      <path d="M11.9692 1.82961e-06L8.03164 0L0.736328 14L4.67383 14L8.03164 7.55626V14H11.9691V8.38194e-05L11.9692 1.82961e-06Z" fill="url(#paint1_linear_1303_5)" />
      <path d="M15.3269 2.57679e-06H19.2644V14H15.3269V2.57679e-06Z" fill="url(#paint2_linear_1303_5)" />
      <defs>
        <linearGradient id="paint0_linear_1303_5" x1="8.03125" y1="7" x2="19.2641" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0.28125" stopColor="#7D55EC" />
          <stop offset="1" stopColor="#2AB2FE" />
        </linearGradient>
        <linearGradient id="paint1_linear_1303_5" x1="0.736328" y1="7" x2="19.2644" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0.28125" stopColor="#7D55EC" />
          <stop offset="1" stopColor="#2AB2FE" />
        </linearGradient>
        <linearGradient id="paint2_linear_1303_5" x1="0.736328" y1="7" x2="19.2644" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0.28125" stopColor="#7D55EC" />
          <stop offset="1" stopColor="#2AB2FE" />
        </linearGradient>
    </defs>
  </svg>
  );
}

export default GradientLogo;
