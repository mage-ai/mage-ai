function BlocksStackedGradient({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M3 3H9V9H3V3ZM10 2V9H17V16H24V24H17H16H10H9H2V17V16V10V9V2H10ZM16 23V17H10V23H16ZM17 23H23V17H17V23ZM16 16V10H10V16H16ZM9 10V16H3V10H9ZM9 17V23H3V17H9Z" fill="url(#paint0_linear_2738_140355)"/>
      <defs>
      <linearGradient id="paint0_linear_2738_140355" x1="2" y1="13" x2="24" y2="13" gradientUnits="userSpaceOnUse">
        <stop offset="0.28125" stopColor="#7D55EC"/>
        <stop offset="1" stopColor="#2AB2FE"/>
      </linearGradient>
      </defs>
    </svg>

  );
}

export default BlocksStackedGradient;
