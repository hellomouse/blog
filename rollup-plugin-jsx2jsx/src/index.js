import { parse, JSXTransform, visitors, containerDirectives, nonContainerDirectives, createModule } from 'jsx2jsx';
/** @type {any} */ // @ts-ignore extremely bad types
import babelGenerator from '@babel/generator';
const generate = babelGenerator.default;

function makeTransformer() {
  return new JSXTransform(visitors, nonContainerDirectives, containerDirectives);
}

/**
 * @returns {import('vite').Plugin}
 */
export default function jsx2jsxPlugin() {
  return {
    name: 'jsx2jsx',
    enforce: 'pre',
    transform(source, id) {
      if (!id.endsWith('.mdx')) return;
      let parsed = parse(source);
      let transform = makeTransformer();
      /** @type {any} */ // TODO:
      let contentTree = transform.transformTree(parsed);
      let ast = createModule(transform, contentTree);
      let { code, map} = generate(ast, { sourceMaps: true, sourceFileName: id }, source);
      return { code, map };
    }
  }
}
