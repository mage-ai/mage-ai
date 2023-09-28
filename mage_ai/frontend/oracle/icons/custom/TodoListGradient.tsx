function TodoListGradient({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M7 17c0 1.1046-.89543 2-2 2s-2-.8954-2-2 .89543-2 2-2 2 .8954 2 2zm1.5 0c0 1.933-1.567 3.5-3.5 3.5S1.5 18.933 1.5 17s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5zm2.25-.5c0-.4142.3358-.75.75-.75H22c.4142 0 .75.3358.75.75s-.3358.75-.75.75H11.5c-.4142 0-.75-.3358-.75-.75zM8.68946 4.29563c.16317-.38072-.0132-.82163-.39392-.9848-.38072-.16316-.82163.0132-.9848.39392L5.06418 8.94674c-.07952.18554-.3348.2052-.44179.03402L3.1361 6.60269c-.21953-.35125-.68225-.45803-1.0335-.2385-.35125.21954-.45803.68225-.2385 1.0335l1.48629 2.37807c.74892 1.19824 2.53587 1.06064 3.0925-.23814l2.24657-5.24199zM11.5 6.75c-.4142 0-.75.33579-.75.75s.3358.75.75.75H22c.4142 0 .75-.33579.75-.75s-.3358-.75-.75-.75H11.5z" fill="url(#paint0_linear_2919_69883)" />
      <defs>
      <linearGradient id="paint0_linear_2919_69883" x1="1.5" y1="11.875" x2="22.75" y2="11.875" gradientUnits="userSpaceOnUse">
        <stop offset=".28125" stopColor="#7D55EC" />
        <stop offset="1" stopColor="#2AB2FE" />
      </linearGradient>
      </defs>
    </svg>
  );
}

export default TodoListGradient;
