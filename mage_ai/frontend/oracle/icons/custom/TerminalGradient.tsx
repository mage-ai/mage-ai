function TerminalGradient({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.5 18V6c0-1.38071 1.11929-2.5 2.5-2.5h12c1.3807 0 2.5 1.11929 2.5 2.5v12c0 1.3807-1.1193 2.5-2.5 2.5H6c-1.38071 0-2.5-1.1193-2.5-2.5zM2 18V6c0-2.20914 1.79086-4 4-4h12c2.2091 0 4 1.79086 4 4v12c0 2.2091-1.7909 4-4 4H6c-2.20914 0-4-1.7909-4-4zm9.0935-8.41432c.3235-.25876.3759-.73073.1172-1.05417-.2588-.32345-.7308-.37589-1.0542-.11713L7.03148 10.9144c-.17791.1423-.28148.3578-.28148.5856 0 .2279.10357.4433.28148.5857l3.12502 2.5c.3234.2587.7954.2063 1.0542-.1172.2587-.3234.2063-.7954-.1172-1.0541L8.70058 11.5l2.39292-1.91432zM14.5 13.25c-.4142 0-.75.3358-.75.75s.3358.75.75.75H17c.4142 0 .75-.3358.75-.75s-.3358-.75-.75-.75h-2.5z"
        fill="url(#paint0_linear_1244_32583)"
      />
      <defs>
        <clipPath id="clip0_5247_222548">
          <rect width="24" height="24" fill="white" />
        </clipPath>
        <linearGradient id="paint0_linear_1244_32583" x1="1.07031" y1="11.8041" x2="21.9428" y2="11.8041" gradientUnits="userSpaceOnUse">
          <stop offset="0.28125" stopColor="#7D55EC"/>
          <stop offset="1" stopColor="#2AB2FE"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default TerminalGradient;
