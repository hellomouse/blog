import { render } from 'solid-js/web';
import './index.css';
import { createEffect, createSignal, onCleanup } from 'solid-js';

function App() {
  let [val, setVal] = createSignal(0);

  createEffect(() => {
    let interval = setInterval(() => setVal(a => a + 1), 1000);
    onCleanup(() => clearInterval(interval));
  });

  return <p>Hello {val()}</p>;
}

const root = document.getElementById('root')!;
render(() => <App />, root);
