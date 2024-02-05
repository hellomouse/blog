import { createSignal } from 'solid-js';

function headerToTOS(article: any, header: any): any {
  let children = <></>;
  if (header.children) {
    children = header.children.map((hchild: any) => headerToTOS(article, hchild));
    if (!header.identifier) return children;
  }
  return <div>
    <a href={`#${header.identifier}`} class="blog-tos__link">{article.headings[header.identifier]}</a>
    <div class="blog-tos__sub_link_container">{children}</div>
  </div>;
}

export default function TableOfContents(props: any) {
  const [TOCVisible, setTOCVisible] = createSignal(true);

  return <div class="blog-tos__container">
    <div class="blog-tos">
      <h2 class="blog-tos__header">
        Contents &nbsp;
        <a onclick={() => setTOCVisible(!TOCVisible())}>
          [{TOCVisible() ? 'Hide' : 'Show'}]
        </a>
      </h2>

      {TOCVisible() ?
        <>
          <hr />
          {props.article.headingTree.map((header: any) => headerToTOS(props.article, header))}
        </> :
        <></>}
    </div>
  </div>;
}
