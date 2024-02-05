import type { JSX } from 'solid-js/jsx-runtime';

export type ContextElements = 'Heading' | 'Math' | 'Code' | 'Blockquote' | 'Footnote' | 'Image';

export interface HeadingProps {
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  identifier: string;
}

export interface MathProps {
  type: 'block' | 'inline';
  children: string;
}

export interface CodeProps {
  lang?: string;
  meta?: string;
  children: string;
}

export interface BlockquoteProps {
  children: JSX.Element;
}

export interface FootnoteProps {
  identifier: string;
  index: number;
}

export interface ImageProps {
  src: string;
  title?: string;
  alt?: string;
}

export interface ContextElementsMap {
  Heading: (props: HeadingProps) => JSX.Element;
  Math: (props: MathProps) => JSX.Element;
  Code: (props: CodeProps) => JSX.Element;
  Blockquote: (props: BlockquoteProps) => JSX.Element;
  Footnote: (props: FootnoteProps) => JSX.Element;
  Image: (props: ImageProps) => JSX.Element;
}

export interface Context {
  el: ContextElementsMap;
}

export interface HeadingInfo {
  identifier: string | null;
  counters: number[];
  children?: HeadingInfo[];
}

export interface Article {
  exports: Record<string, any>;
  headings: Record<string, () => JSX.Element>;
  headingTree: HeadingInfo[];
  footnotes: Record<string, [number, () => JSX.Element]>;
  content: () => JSX.Element;
}
