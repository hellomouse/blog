import { Dynamic, render } from 'solid-js/web';
import './index.css';
import './dev-global-process-polyfill';
import test from './test.mdx';

function App() {
  let article: any;
  let context = {
    el: {
      Heading(props: any) {
        return <Dynamic component={'h' + props.depth} id={props.identifier}>
          {article.headings[props.identifier]()}
        </Dynamic>;
      }
    }
  }
  article = test(context);

  return <div>
    {article.content()}
  </div>;
}

const root = document.getElementById('root')!;
render(() => <App />, root);
