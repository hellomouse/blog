import { render } from 'solid-js/web';
import './index.css';
import { createEffect, createSignal, onCleanup } from 'solid-js';
import './dev-global-process-polyfill';
import { transformFromAst } from '@babel/standalone';
import * as js from '@babel/types';

function App() {
  let [val, setVal] = createSignal(0);

  createEffect(() => {
    let interval = setInterval(() => setVal(a => a + 1), 1000);
    onCleanup(() => clearInterval(interval));
  });

  let output = transformFromAst(
    js.program([js.expressionStatement(js.arrowFunctionExpression([], js.stringLiteral('hello')))]),
    undefined,
    { code: true },
  );
  console.log(output);

  return <p>
    Hello {val()}
    {output!.code}
  </p>;
}

const root = document.getElementById('root')!;
render(() => <App />, root);
