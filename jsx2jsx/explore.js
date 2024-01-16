import repl from 'node:repl';
import util from 'node:util';
import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import babelParser from '@babel/parser';
import generator from '@babel/generator';
import parse, { mdxParseOptions } from './build/src/parse.js';
import estreeToBabel from 'estree-to-babel';

import { parse as mmParse, preprocess as mmPreprocess } from 'micromark';
import { subtokenize as mmSubtokenize } from 'micromark-util-subtokenize';

function micromarkTestTokenize(input, subtokenize = -1) {
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

let jsParser = Parser.extend(acornJsx());

let inspectOpts = {
  colors: true,
  depth: 10,
  showProxy: true,
}
let interact = repl.start({
  writer(obj) {
    return util.inspect(obj, inspectOpts);
  }
});
Object.assign(interact.context, {
  // out,
  parse,
  parsejs: input => babelParser.parse(input, { sourceType: 'module', plugins: ['jsx'] }),
  parsejs2: input => jsParser.parse(input, { ecmaVersion: 2024, sourceType: 'module', locations: true }),
  generate: generator.default,
  estreeToBabel,
  mmTokenize: micromarkTestTokenize,
  mmTokenizeShort: (...args) => {
    let out = micromarkTestTokenize(...args);
    console.log(out.map(v => `${v[0].padEnd(5)} ${v[1].type}`).join('\n'));
  },
  inspectOpts,
  parseOpts: mdxParseOptions,
  top: globalThis,
});
