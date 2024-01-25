import repl from 'node:repl';
import util from 'node:util';
import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import babelParser from '@babel/parser';
import js from '@babel/types';
import generator from '@babel/generator';
import parse, { mdxParseOptions, micromarkTestTokenize } from './build/src/parse.js';
import * as convert from './build/src/convert.js';
import { estreeToBabel } from './build/src/convert.js';

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
  js,
  convert,
  tr: convert.makeTransformer(),
  transform: input => {
    let out = generator.default(convert.makeTransformer().transformTree(parse(input)));
    console.log(out.code);
    return out;
  }
});
