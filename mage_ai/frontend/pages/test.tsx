import Browser from '@components/BlockBrowser';

function Test() {
  return (
    <div>
      <Browser
        onClickAction={opts => console.log(opts)}
      />
    </div>
  );
}

export default Test;
