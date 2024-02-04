import { Dynamic, render } from 'solid-js/web';
import './index.css';
import test from './test.mdx';

function App() {
  let article: any;
  let context = {
    el: {
      Heading(props: any) {
        return <Dynamic component={'h' + props.depth} id={props.identifier}>
          {article.headings[props.identifier]()}
        </Dynamic>;
      },
      Math(props: any) {
        if (props.type === 'block') {
          return <pre><code>{'(block math)\n'}{props.children}</code></pre>;
        } else {
          return <code>{'(inline math) '}{props.children}</code>;
        }
      },
      Code(props: any) {
        return <pre><code>{props.children}</code></pre>;
      },
      Blockquote(props: any) {
        return <blockquote>{props.children}</blockquote>;
      },
      Footnote(props: any) {
        return <span>[footnote {props.index}]</span>
      },
      Image(props: any) {
        return <span>[image: {props.src}]</span>
      },
    }
  }
  article = test(context);

  return <div>
    {article.content()}
  </div>;
}

const root = document.getElementById('root')!;
render(() => <App />, root);
