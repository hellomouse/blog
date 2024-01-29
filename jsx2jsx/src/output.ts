import js, { JSXFragment, Program, Statement } from '@babel/types';
import { CONTEXT_VAR, JSXNode, JSXTransform } from './convert.js';
import objectToAST, { astNode } from './object-to-ast.js';

/* TODO:
import { createSignal } from 'solid-js';

export default function createDocument(_$ctx) {
  const [someSignal, setSomeSignal] = createSignal(0);

  return {
    exports: {
      someSignal,
      setSomeSignal,
    },
    headings: {
      'heading-id': () => <>Heading name</>
    },
    headingTree: [
      {
        identifier: 'heading-id',
        counters: [1]
      }
    ],
    footnotes: {
      'footnote-1': [1, () => <>Footnote content</>]
    },
    content: <><_$ctx.el.Heading depth={1} identifier="heading-id" /><p>Content.<_$ctx.el.Footnote identifier="footnote-1" index={1} /></p></>,
  };
}
*/

export function createModule(context: JSXTransform, contentTree: JSXFragment): Program {
  let headings = Object.fromEntries(
    Object.entries(context.headingComponents).map(([id, expr]) => [id, astNode(expr)])
  );
  let footnotes = Object.fromEntries(
    Object.entries(context.footnoteComponents).map(([id, [index, expr]]) => [id, [index, astNode(expr)]])
  );
  let fnBody: Statement[] = [
    ...context.exportDeclarations,
    js.returnStatement(
      objectToAST({
        exports: astNode(js.objectExpression(context.exports)),
        headings,
        headingTree: context.headingTree,
        footnotes,
        content: astNode(contentTree),
      })
    )
  ];

  let out = js.program([
    ...context.imports,
    js.exportDefaultDeclaration(
      js.functionDeclaration(
        js.identifier('createArticle'),
        [js.identifier(CONTEXT_VAR)],
        js.blockStatement(fnBody)
      )
    )
  ]);
  out.loc = contentTree.loc;
  return out;
}
