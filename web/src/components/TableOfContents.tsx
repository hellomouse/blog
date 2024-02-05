import { Article, HeadingInfo } from 'jsx2jsx';
import { Show, createSignal } from 'solid-js';

function headerToTOS(article: Article, header: HeadingInfo): any {
  let children = <></>;
  if (header.children) {
    children = header.children.map((hchild: any) => headerToTOS(article, hchild));
    if (!header.identifier) return children;
  }
  return <div>
    <a href={`#${header.identifier}`} class="blog-tos__link">{article.headings[header.identifier!]()}</a>
    <div class="blog-tos__sub_link_container">{children}</div>
  </div>;
}

export default function TableOfContents(props: { article: Article }) {
  const [tocVisible, setTocVisible] = createSignal(true);

  return <div class="blog-tos__container">
    <div class="blog-tos">
      <h2 class="blog-tos__header">
        Contents &nbsp;
        <a onclick={() => setTocVisible(!tocVisible())}>
          [{tocVisible() ? 'Hide' : 'Show'}]
        </a>
      </h2>

      <Show when={tocVisible()}>
        <hr />
        {props.article.headingTree.map(header => headerToTOS(props.article, header))}
      </Show>
    </div>
  </div>;
}
