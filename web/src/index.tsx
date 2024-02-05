import { Dynamic, render } from 'solid-js/web';
import { createSignal, createEffect } from 'solid-js';
import './index.css';
import './blog.css';

import TableOfContents from './components/TableOfContents';
import Footnote from './components/Footnote';

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
        return <pre class="code-block"><code>{props.children}</code></pre>;
      },
      Blockquote(props: any) {
        return <blockquote>{props.children}</blockquote>;
      },
      Footnote(props: any) {
        return <sup class="inline-footnote" id={`inline-footnote-${props.identifier}`}>
          <a href={`#footnote-${props.identifier}`}>{props.identifier}</a>
          <div class="inline-footnote__hover">
            <div class="blog-post__footnote">
              <a class="blog-post__footnote__link" href={`#inline-footnote-${props.identifier}`}>{props.identifier}</a>
              {article.footnotes[props.identifier][1]()}
            </div>
          </div>
        </sup>
      },
      Image(props: any) {
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
    return () => window.removeEventListener('resize', updateIsDesktop);
  });

  console.log(article) // TODO

  return <div class="blog-post">
    {isDesktop() ? <TableOfContents article={article} /> : <></> }
    <div class="blog-container">
      <section style="margin-bottom: 30px">
        <p class="blog-post__tags"><span class="blog-post__tags__tag">Tags</span></p>

        <section class="blog-post__title">
          <h1>My Experimental Blog Post</h1>
          <a href="/" class="blog-post__title__username">Bowserinator &nbsp; / &nbsp; Oct 1, 2022 </a>
        </section>
      </section>

      {!isDesktop() ? <TableOfContents article={article} /> : <></>}

      {article.content()}

      <section class="blog-post__footnote_container">
        {Object.keys(article.footnotes).map((footnoteID: any) => {
          const footnote = article.footnotes[footnoteID];
          return <div class="blog-post__footnote" id={`footnote-${footnoteID}`}>
            <a class="blog-post__footnote__link" href={`#inline-footnote-${footnoteID}`}>{footnoteID}</a>
            <span class="blog-post__footnote__content">{footnote[1]}</span>
          </div>;
        })}
      </section>
    </div>

  </div>
}

const root = document.getElementById('root')!;
render(() => <App />, root);
