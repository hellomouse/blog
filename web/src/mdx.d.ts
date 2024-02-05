declare module '*.mdx' {
  import type { Context, Article } from 'jsx2jsx';
  export default function createArticle(context: Context): Article;
}
