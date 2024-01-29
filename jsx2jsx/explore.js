import repl from 'node:repl';
import util from 'node:util';
import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import babelParser from '@babel/parser';
import js from '@babel/types';
import generator from '@babel/generator';
import { transformFromAstSync } from '@babel/core';
import presetSolid from 'babel-preset-solid';
import parse, { mdxParseOptions, micromarkTestTokenize } from './build/src/parse.js';
import * as convert from './build/src/convert.js';
import { estreeToBabel } from './build/src/convert.js';
import objectToAST, { IS_AST } from './build/src/object-to-ast.js';
import { nonContainerDirectives, containerDirectives } from './build/src/directives.js';
import { createModule } from './build/src/output.js';

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
function makeTransformer() {
  return new convert.JSXTransform(convert.visitors, nonContainerDirectives, containerDirectives);
}
Object.assign(interact.context, {
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
  tr: makeTransformer(),
  transform: (input, solid = true) => {
    let parsed = parse(input);
    let transformer = makeTransformer();
    let contentTree = transformer.transformTree(parsed);
    let generated = createModule(transformer, contentTree);
    let output = transformFromAstSync(generated, input, {
      filename: 'input.mdx',
      babelrc: false,
      configFile: false,
      code: true,
      ast: true,
      sourceMaps: 'both',
      presets: solid ? [[presetSolid, { generate: 'dom', hydratable: true }]] : [],
      plugins: [],
    });
    interact.context.output = output;
    console.log(output.code);
  },
  objectToAST,
  IS_AST,
});
