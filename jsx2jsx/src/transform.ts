import js, {
  Expression as BabelExpression,
  Node as BabelNode,
  JSXElement,
  JSXExpressionContainer,
  JSXIdentifier,
  JSXMemberExpression,
  JSXNamespacedName,
  SourceLocation,
} from '@babel/types';
import {
  ExpressionStatement as EstreeExpressionStatement,
  Node as EstreeNode,
  Program as EstreeProgram
} from 'estree';
import _estreeToBabel from 'estree-to-babel';
import { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx-expression';
import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import assert from 'node:assert';
import { Node as UnistNode, Position as UnistPosition } from 'unist';

export function estreeToBabel(input: EstreeNode): BabelNode {
  // estree-to-babel expects a File
  // node module typing weirdness
  return (_estreeToBabel as any)({
    type: 'File',
    program: input
  }).program;
}

export function convertLocation(position: UnistPosition): SourceLocation {
  /* note: might not be necessary, doesn't look like babel uses the absolute offset
  return {
    start: { line: position.start.line, column: position.start.column, index: position.start.offset! },
    end: { line: position.end.line, column: position.end.column, index: position.end.offset! },
  } as SourceLocation;
  */
 return position as SourceLocation;
}

export function copyLoc(from: UnistNode, to: BabelNode) {
  if (from.position) to.loc = convertLocation(from.position);
}

export function convertJsxExpressionBody(estree: EstreeProgram): JSXExpressionContainer {
  assert.equal(estree.type, 'Program');
  assert.equal(estree.body.length, 1);
  assert.equal(estree.body[0].type, 'ExpressionStatement');
  // types don't expect expression parse mode
  let expr = (estree.body[0] as EstreeExpressionStatement).expression;
  return js.jsxExpressionContainer(estreeToBabel(expr) as BabelExpression);
}

export function convertMdxExpression(node: MdxFlowExpression | MdxTextExpression): JSXExpressionContainer {
  let out = convertJsxExpressionBody(node.data!.estree!);
  copyLoc(node, out);
  return out;
}

/** Create one of the JSX name nodes from a string name */
export function makeJsxName(name: string): JSXIdentifier | JSXMemberExpression | JSXNamespacedName {
  if (name.includes('.')) {
    let components = name.split('.');
    assert(components.length >= 2);
    let obj = js.jsxMemberExpression(
      js.jsxIdentifier(components.shift()!),
      js.jsxIdentifier(components.shift()!),
    );
    while (components.length) {
      obj = js.jsxMemberExpression(obj, js.jsxIdentifier(components.shift()!));
    }
    return obj;
  } else if (name.includes(':')) {
    let components = name.split(':');
    assert.equal(components.length, 2);
    return js.jsxNamespacedName(
      js.jsxIdentifier(components[0]),
      js.jsxIdentifier(components[1]),
    );
  } else {
    return js.jsxIdentifier(name);
  }
}

export function convertJsxElement(node: MdxJsxFlowElement | MdxJsxTextElement): JSXElement {
  // assume self-closing if no children
  let selfClosing = node.children.length === 0;
  let openingElement;
}
