import js, {
  Expression as BabelExpression,
  Node as BabelNode,
  JSXAttribute,
  JSXElement,
  JSXExpressionContainer,
  JSXFragment,
  JSXIdentifier,
  JSXMemberExpression,
  JSXNamespacedName,
  JSXSpreadAttribute,
  JSXText,
  SourceLocation,
} from '@babel/types';
import {
  ExpressionStatement as EstreeExpressionStatement,
  Identifier as EstreeIdentifier,
  Node as EstreeNode,
  Program as EstreeProgram,
} from 'estree';
import _estreeToBabel from 'estree-to-babel';
import { Nodes as MdastNode } from 'mdast';
import { MdxJsxAttribute, MdxJsxExpressionAttribute } from 'mdast-util-mdx-jsx';
import assert from 'node:assert';
import { Node as UnistNode, Position as UnistPosition } from 'unist';
import { AbstractNodeTransformer, AbstractTransformGenerator, AbstractTransformer } from './tree-transformer.js';

export interface Context {
  current: MdastNode,
}

// of note: MDX does not support JSXSpreadChild syntax (<a>{...stuff}</a>)
export type JSXNode = JSXText | JSXExpressionContainer | JSXElement | JSXFragment;
export type VisitorGenerator = AbstractTransformGenerator<MdastNode, JSXNode>;
export type NodeVisitor = AbstractNodeTransformer<MdastNode, JSXNode, Context>;

export class JSXTransform extends AbstractTransformer<MdastNode, JSXNode, Context> {
  constructor(public visitors: Map<MdastNode['type'], NodeVisitor>) {
    super();
  }

  makeContext(node: MdastNode): Context {
    return {
      current: node 
    }
  }

  getTransform(node: MdastNode): NodeVisitor {
    let visitor = this.visitors.get(node.type);
    if (!visitor) {
      throw new Error('unhandled node type: ' + node.type);
    }
    return visitor;
  }
}

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

/** Create one of the JSX name nodes from a string name */
export function makeJsxName(name: string, allowMember?: true): JSXIdentifier | JSXMemberExpression | JSXNamespacedName
export function makeJsxName(name: string, allowMember: false): JSXIdentifier | JSXNamespacedName
export function makeJsxName(name: string, allowMember = true): JSXIdentifier | JSXMemberExpression | JSXNamespacedName {
  if (name.includes('.')) {
    if (!allowMember) {
      throw new Error('JSX member expression cannot occur in the current position');
    }
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

export function makeJsxFragment(children: JSXNode | JSXNode[]): JSXFragment {
  if (!Array.isArray(children)) {
    children = [children];
  }
  return js.jsxFragment(
    js.jsxOpeningFragment(),
    js.jsxClosingFragment(),
    children,
  );
}

/**
 * Create a JSX tag
 * @param name Name of tag, either a string or a JSX name
 * @param attributes JSX attributes
 * @param children Children, or null for a self-closing tag
 * @returns Created tag
 */
export function makeJsxTag(
  name: JSXIdentifier | JSXMemberExpression | JSXNamespacedName | string,
  attributes: (JSXAttribute | JSXSpreadAttribute)[],
  children: JSXNode | JSXNode[] | null
): JSXElement {
  let jsxName;
  if (typeof name === 'string') {
    jsxName = makeJsxName(name);
  } else {
    jsxName = name;
  }
  let selfClosing = children === null;
  let openingElement = js.jsxOpeningElement(jsxName, attributes, selfClosing);
  if (selfClosing) {
    return js.jsxElement(openingElement, null, [], true);
  } else {
    let closingElement = js.jsxClosingElement(jsxName);
    if (!Array.isArray(children)) {
      children = [children!];
    }
    return js.jsxElement(openingElement, closingElement, children, false);
  }
}

export function convertMdxJsxAttribute(node: MdxJsxAttribute | MdxJsxExpressionAttribute): JSXAttribute | JSXSpreadAttribute {
  if (node.type === 'mdxJsxAttribute') {
    let jsxName = makeJsxName(node.name, false);
    if (typeof node.value === 'undefined' || node.value === null) {
      let out = js.jsxAttribute(jsxName, null);
      copyLoc(node, out);
      return out;
    } else if (typeof node.value === 'string') {
      let out = js.jsxAttribute(jsxName, js.stringLiteral(node.value));
      copyLoc(node, out);
      return out;
    } else if (node.value.type === 'mdxJsxAttributeValueExpression') {
      let expression = convertJsxExpressionBody(node.value.data!.estree!);
      let out = js.jsxAttribute(jsxName, expression);
      copyLoc(node, out);
      return out;
    } else {
      throw new Error('unreachable');
    }
  } else if (node.type === 'mdxJsxExpressionAttribute') {
    // spread expressions only
    let expression = (node.data?.estree?.body?.[0] as EstreeExpressionStatement)?.expression;
    assert(expression?.type === 'ObjectExpression');
    let spreadElement = expression.properties[0];
    assert(spreadElement.type === 'SpreadElement');
    let spreadExpr = estreeToBabel(spreadElement.argument);
    let out = js.jsxSpreadAttribute(spreadExpr as BabelExpression);
    copyLoc(node, out);
    return out;
  } else {
    throw new Error('bad node type');
  }
}

export function* convertMdxExpression(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression');
  let out = convertJsxExpressionBody(node.data!.estree!);
  copyLoc(node, out);
  return out;
}

export function* convertJsxElement(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement');

  if (!node.name) {
    // handle fragment
    let fragment = makeJsxFragment(yield node.children);
    copyLoc(node, fragment);
    return fragment;
  }

  let jsxName = makeJsxName(node.name);
  // assume self-closing if no children
  let selfClosing = node.children.length === 0;
  let attributes = node.attributes.map(convertMdxJsxAttribute);
  let openingElement = js.jsxOpeningElement(jsxName, attributes, selfClosing);

  if (selfClosing) {
    let out = js.jsxElement(openingElement, null, [], true);
    copyLoc(node, out);
    return out;
  } else {
    let closingElement = js.jsxClosingElement(jsxName);
    let children = yield node.children;
    assert(Array.isArray(children));
    let out = js.jsxElement(openingElement, closingElement, children, false);
    copyLoc(node, out);
    return out;
  }
}

export function* convertParagraph(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'paragraph');
  let out = makeJsxTag('p', [], yield node.children);
  copyLoc(node, out);
  return out;
}

export function* convertText(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'text');

  if (node.value.match(/^\s+$/)) {
    // whitespace only, emit JSXText directly to prevent clutter
    return js.jsxText(node.value);
  } else {
    // wrap in string literal
    return js.jsxExpressionContainer(js.stringLiteral(node.value));
  }
}

export function* convertRoot(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'root');
  let out = makeJsxFragment(yield node.children);
  copyLoc(node, out);
  return out;
}

export function makeTransformer() {
  let visitorMap: Partial<Record<MdastNode['type'], NodeVisitor>> = {
    root: convertRoot,
    mdxFlowExpression: convertMdxExpression,
    mdxTextExpression: convertMdxExpression,
    mdxJsxFlowElement: convertJsxElement,
    mdxJsxTextElement: convertJsxElement,
    paragraph: convertParagraph,
    text: convertText,
  };
  return new JSXTransform(new Map(Object.entries(visitorMap) as [MdastNode['type'], NodeVisitor][]));
}
