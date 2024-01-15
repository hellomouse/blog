import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import { directiveFromMarkdown } from 'mdast-util-directive';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter';
import { gfmFootnoteFromMarkdown } from 'mdast-util-gfm-footnote';
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { mathFromMarkdown } from 'mdast-util-math';
import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxJsxFromMarkdown } from 'mdast-util-mdx-jsx';
import { mdxjsEsmFromMarkdown } from 'mdast-util-mdxjs-esm';
import { directive } from 'micromark-extension-directive';
import { frontmatter } from 'micromark-extension-frontmatter';
import { gfmFootnote } from 'micromark-extension-gfm-footnote';
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough';
import { gfmTable } from 'micromark-extension-gfm-table';
import { math } from 'micromark-extension-math';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import { mdxJsx, mdastExtraJsxFlow } from '@hellomouse/micromark-extension-mdx-jsx';
import { mdxjsEsm } from 'micromark-extension-mdxjs-esm';

import type { Root as MarkdownRoot } from 'mdast';

export let options: any = {
  acorn: Parser.extend(acornJsx()),
  acornOptions: { ecmaVersion: 2024, sourceType: 'module' },
  addResult: true,
};

function disableFeatures() {
  return {
    disable: {
      null: ['codeIndented', 'htmlFlow', 'htmlText']
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
      directive(),
      frontmatter(),
    ],
    mdastExtensions: [
      mdxJsxFromMarkdown(),
      mdxExpressionFromMarkdown(),
      mdxjsEsmFromMarkdown(),
      gfmFootnoteFromMarkdown(),
      gfmStrikethroughFromMarkdown(),
      gfmTableFromMarkdown(),
      mathFromMarkdown(),
      directiveFromMarkdown(),
      mdastExtraJsxFlow(),
      frontmatterFromMarkdown(),
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
      directive(),
      frontmatter(),
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
