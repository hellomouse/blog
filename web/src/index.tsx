import { Dynamic, render } from 'solid-js/web';
import { createSignal, createEffect, onCleanup, Show, For, JSX } from 'solid-js';
import './css/font.css';
import './css/index.css';
import './css/blog.css';
import TableOfContents from './components/TableOfContents';
import test from './test.mdx';
import { Article, Context } from 'jsx2jsx';

function makeFootnotesList(footnotes: Article['footnotes']): [number, string, () => JSX.Element][] {
  // need this as object order is not guaranteed
  let arr: [number, string, () => JSX.Element][] = [];
  for (let [name, [index, footnote]] of Object.entries(footnotes)) {
    arr[index] = [index, name, footnote];
  }
  return arr.slice(1);
}

function App() {
  let article!: Article;
  let context: Context = {
    el: {
      Heading(props) {
        return <Dynamic component={'h' + props.depth} id={props.identifier}>
          {article.headings[props.identifier]()}
        </Dynamic>;
      },
      Math(props) {
        if (props.type === 'block') {
          return <pre><code>{'(block math)\n'}{props.children}</code></pre>;
        } else {
          return <code>{'(inline math) '}{props.children}</code>;
        }
      },
      Code(props) {
        return <pre class="code-block"><code>{props.children}</code></pre>;
      },
      Blockquote(props) {
        return <blockquote>{props.children}</blockquote>;
      },
      Footnote(props) {
        return <sup class="inline-footnote" id={`footnote-ref-${props.identifier}`}>
          <a href={`#footnote-def-${props.identifier}`}>{props.index}</a>
          <div class="inline-footnote__hover">
            <div class="blog-post__footnote">
              <a class="blog-post__footnote__link" href={`#footnote-ref-${props.identifier}`}>{props.index}</a>
              <div>{article.footnotes[props.identifier][1]()}</div>
            </div>
          </div>
        </sup>
      },
      Image(props) {
        return <img class="post-img" src={props.src} alt={props.alt}></img>
      },
    }
  }
  article = test(context);

  const [isDesktop, setIsDesktop] = createSignal(true);
  const updateIsDesktop = () => setIsDesktop(window.innerWidth > 900);

  createEffect(() => {
    updateIsDesktop();
    window.addEventListener('resize', updateIsDesktop);
    onCleanup(() => window.removeEventListener('resize', updateIsDesktop));
  });

  return <div class="blog-post">
    <Show when={isDesktop()}>
      <TableOfContents article={article} />
    </Show>
    <div class="blog-container">
      <section style="margin-bottom: 30px">
        <p class="blog-post__tags"><span class="blog-post__tags__tag">Tags</span></p>

        <section class="blog-post__title">
          <h1>My Experimental Blog Post</h1>
          <a href="/" class="blog-post__title__username">Bowserinator &nbsp; / &nbsp; Oct 1, 2022 </a>
        </section>
      </section>

      <Show when={!isDesktop()}>
        <TableOfContents article={article} />
      </Show>

      {article.content()}

      <section class="blog-post__footnote_container">
        <For each={makeFootnotesList(article.footnotes)}>
          {([index, id, footnote]) => <div class="blog-post__footnote" id={`footnote-def-${id}`}>
            <a class="blog-post__footnote__link" href={`#footnote-ref-${id}`}>{index}</a>
            <span class="blog-post__footnote__content">{footnote()}</span>
          </div>}
        </For>
      </section>
    </div>

  </div>
}

const root = document.getElementById('root')!;
render(() => <App />, root);
