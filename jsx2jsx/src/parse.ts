import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFootnoteFromMarkdown } from 'mdast-util-gfm-footnote';
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { mathFromMarkdown } from 'mdast-util-math';
import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxJsxFromMarkdown } from 'mdast-util-mdx-jsx';
import { mdxjsEsmFromMarkdown } from 'mdast-util-mdxjs-esm';
import { gfmFootnote } from 'micromark-extension-gfm-footnote';
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough';
import { gfmTable } from 'micromark-extension-gfm-table';
import { math } from 'micromark-extension-math';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import { mdxJsx } from 'micromark-extension-mdx-jsx';
import { mdxjsEsm } from 'micromark-extension-mdxjs-esm';

import type { Root as MarkdownRoot } from 'mdast';

export let options: any = {
  acorn: Parser.extend(acornJsx()),
  acornOptions: { ecmaVersion: 2024, sourceType: 'module' },
  addResult: true,
  preferInline: true,
};

function disableFeatures() {
  return {
    disable: {
      null: ['autolink', 'codeIndented', 'htmlFlow', 'htmlText']
    }
  };
}

export default function parse(input: string): MarkdownRoot {
  return fromMarkdown(input, {
    extensions: [
      disableFeatures(),
      mdxJsx(options),
      mdxExpression(options),
      mdxjsEsm(options),
      gfmFootnote(),
      gfmStrikethrough(),
      gfmTable(),
      math(),
    ],
    mdastExtensions: [
      mdxJsxFromMarkdown(),
      mdxExpressionFromMarkdown(),
      mdxjsEsmFromMarkdown(),
      gfmFootnoteFromMarkdown(),
      gfmStrikethroughFromMarkdown(),
      gfmTableFromMarkdown(),
      mathFromMarkdown(),
    ],
  });
}

import { parse as mmParse, preprocess as mmPreprocess } from 'micromark';
import { subtokenize as mmSubtokenize } from 'micromark-util-subtokenize';

export function micromarkTestTokenize(input: string, subtokenize = -1) {
  let events = mmParse({
    extensions: [
      disableFeatures(),
      mdxJsx(options),
      mdxExpression(options),
      mdxjsEsm(options),
      gfmFootnote(),
      gfmStrikethrough(),
      gfmTable(),
      math(),
    ],
  })
    .document()
    .write(mmPreprocess()(input, null, true));
  
  if (subtokenize < 0) {
    while (!mmSubtokenize(events));
  } else {
    for (let i = 0; i < subtokenize; i++) {
      if (mmSubtokenize(events)) break;
    }
  }
  return events;
}
