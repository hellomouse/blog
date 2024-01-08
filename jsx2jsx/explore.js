import repl from 'node:repl';
import util from 'node:util';
import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import babelParser from '@babel/parser';
import generator from '@babel/generator';
import parse, { micromarkTestTokenize, options } from './build/src/parse.js';
import estreeToBabel from 'estree-to-babel';

/*
const input = `\
test {3} <>{3}</> <span class="test">four</span>
`;
let out = parse(input);
*/

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
  parseOpts: options,
  top: globalThis,
});
