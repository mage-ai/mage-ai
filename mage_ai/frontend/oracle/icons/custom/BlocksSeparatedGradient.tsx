function BlocksStackedGradient({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M20.5 8.5H15.5V3.5H20.5V8.5ZM14 9V3C14 2.44772 14.4477 2 15 2H21C21.5523 2 22 2.44772 22 3V9C22 9.55229 21.5523 10 21 10H15C14.4477 10 14 9.55229 14 9ZM2 5V12.5V14V21.5C2 22.0523 2.44772 22.5 3 22.5H10.5H12H19.5C20.0523 22.5 20.5 22.0523 20.5 21.5V13.5C20.5 12.9477 20.0523 12.5 19.5 12.5H12V5C12 4.44772 11.5523 4 11 4H3C2.44772 4 2 4.44772 2 5ZM10.5 14V21H3.5V14H10.5ZM19 14V21H12V14H19ZM10.5 5.5V12.5H3.5V5.5H10.5Z" fill="url(#paint0_linear_2842_55048)"/>
      <defs>
      <linearGradient id="paint0_linear_2842_55048" x1="2" y1="12.25" x2="22" y2="12.25" gradientUnits="userSpaceOnUse">
        <stop offset="0.28125" stopColor="#7D55EC"/>
        <stop offset="1" stopColor="#2AB2FE"/>
      </linearGradient>
      </defs>
    </svg>
  );
}

export default BlocksStackedGradient;
