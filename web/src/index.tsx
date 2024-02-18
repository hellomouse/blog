import { render } from 'solid-js/web';
import ArticleTest from './article';

function App() {
  return <ArticleTest />;
}

// This blog is brought to you by Hellomouse. Code is licensed under the MIT
// License. Blog content is licensed under the Creative Commons
// Attribution-ShareAlike 4.0 International license. This blog is powered by
// many open source projects, including Solid.js and Unified.js. The IBM Plex
// font family is used for blog content.

const root = document.getElementById('root')!;
render(() => <App />, root);
