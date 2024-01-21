import { mdastExtraJsxFlow, mdxJsx, Options as MdxJsxOptions } from '@hellomouse/micromark-extension-mdx-jsx';
import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import { directiveFromMarkdown } from 'mdast-util-directive';
import { fromMarkdown, Options as FromMarkdownOptions } from 'mdast-util-from-markdown';
import { frontmatterFromMarkdown } from 'mdast-util-frontmatter';
import { gfmFootnoteFromMarkdown } from 'mdast-util-gfm-footnote';
import { gfmStrikethroughFromMarkdown } from 'mdast-util-gfm-strikethrough';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { mathFromMarkdown } from 'mdast-util-math';
import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxJsxFromMarkdown } from 'mdast-util-mdx-jsx';
import { mdxjsEsmFromMarkdown } from 'mdast-util-mdxjs-esm';
import { parse as mmParse, preprocess as mmPreprocess } from 'micromark';
import { directive } from 'micromark-extension-directive';
import { frontmatter } from 'micromark-extension-frontmatter';
import { gfmFootnote } from 'micromark-extension-gfm-footnote';
import { gfmStrikethrough } from 'micromark-extension-gfm-strikethrough';
import { gfmTable } from 'micromark-extension-gfm-table';
import { headingAtxExt } from '@hellomouse/micromark-extension-heading-ext';
import { math } from 'micromark-extension-math';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import { mdxjsEsm } from 'micromark-extension-mdxjs-esm';
import { subtokenize as mmSubtokenize } from 'micromark-util-subtokenize';

import type { Root as MarkdownRoot } from 'mdast';

export const mdxParseOptions: MdxJsxOptions = {
  acorn: Parser.extend(acornJsx()),
  acornOptions: { ecmaVersion: 2024, sourceType: 'module' },
  addResult: true,
};

function disableConstructs(constructs: string[]) {
  return {
    disable: {
      null: constructs
    }
  };
}

export const fromMarkdownOptions: FromMarkdownOptions = {
  extensions: [
    disableConstructs(['codeIndented', 'htmlFlow', 'htmlText']),
    mdxJsx(mdxParseOptions),
    mdxExpression(mdxParseOptions as any),
    mdxjsEsm(mdxParseOptions as any),
    gfmFootnote(),
    gfmStrikethrough({ singleTilde: false }),
    gfmTable(),
    math(),
    directive(),
    frontmatter('yaml'),
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
    frontmatterFromMarkdown('yaml'),
  ],
};

export default function parse(input: string): MarkdownRoot {
  return fromMarkdown(input, fromMarkdownOptions);
}

export function micromarkTestTokenize(input: string, subtokenize = -1) {
  let events = mmParse({
    extensions: [
      disableConstructs(['codeIndented', 'htmlFlow', 'htmlText']),
      mdxJsx(mdxParseOptions),
      mdxExpression(mdxParseOptions as any),
      mdxjsEsm(mdxParseOptions as any),
      gfmFootnote(),
      gfmStrikethrough(),
      gfmTable(),
      math(),
      directive(),
      frontmatter(),
      headingAtxExt(),
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
