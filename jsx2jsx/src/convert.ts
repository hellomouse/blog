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
  JSXOpeningElement,
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
import { Definition, Nodes as MdastNode, Parents, PhrasingContent, TableRow } from 'mdast';
import { MdxJsxAttribute, MdxJsxExpressionAttribute } from 'mdast-util-mdx-jsx';
import assert from 'node:assert';
import { Node as UnistNode, Position as UnistPosition } from 'unist';
import { AbstractNodeTransformer, AbstractTransformGenerator, AbstractTransformer } from './tree-transformer.js';

export interface Context {
  current: MdastNode,
  identifiers: Set<string>,
  nextDisambiguationIndex: () => number,
  definitions: Map<string, Definition>,
  references: Map<string, ApplyDefinition[]>,
  addReference: (identifier: string, reference: ApplyDefinition) => void,
  handleFrontmatter: (data: string) => void,
}

export type ApplyDefinition = (definition: Definition) => void;

// of note: MDX does not support JSXSpreadChild syntax (<a>{...stuff}</a>)
export type JSXNode = JSXText | JSXExpressionContainer | JSXElement | JSXFragment;
export type VisitorGenerator = AbstractTransformGenerator<MdastNode, JSXNode>;
export type NodeVisitor = AbstractNodeTransformer<MdastNode, JSXNode, Context>;

export class JSXTransform extends AbstractTransformer<MdastNode, JSXNode, Context> {
  /** Set of currently existing identifiers */
  public identifiers: Set<string> = new Set();
  /** The disambiguation index is appended to identifiers if they are duplicate */
  public disambiguationIndex = 2;
  /** Resource definitions */
  public definitions: Map<string, Definition> = new Map();
  /** Nodes referencing definitions */
  public references: Map<string, ApplyDefinition[]> = new Map();
  /** Metadata preceding document */
  public frontmatter: string | null = null;

  constructor(public visitors: Map<MdastNode['type'], NodeVisitor>) {
    super();
  }

  makeContext(node: MdastNode): Context {
    let self = this;
    return {
      current: node,
      identifiers: self.identifiers,
      nextDisambiguationIndex() {
        return self.disambiguationIndex++;
      },
      definitions: self.definitions,
      references: self.references,
      addReference(identifier, reference) {
        let list = self.references.get(identifier);
        if (!list) {
          self.references.set(identifier, [reference]);
        } else {
          list.push(reference);
        }
      },
      handleFrontmatter(data) {
        self.frontmatter = data;
      }
    };
  }

  getTransform(node: MdastNode): NodeVisitor {
    let visitor = this.visitors.get(node.type);
    if (!visitor) {
      throw new Error('unhandled node type: ' + node.type);
    }
    return visitor;
  }

  transformTree(root: MdastNode): JSXNode {
    let out = super.transformTree(root);

    // resolve references
    for (let [identifier, definition] of this.definitions.entries()) {
      let matching = this.references.get(identifier);
      if (!matching) {
        console.error(`warning: found dangling definition ${identifier}`);
        continue;
      }

      for (let callback of matching) {
        callback(definition);
      }
    }
  
    return out;
  }
}

export const CONTEXT_VAR = '_$ctx';
export const CONTEXT_COMPONENTS = 'el';

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

export function makeContextComponentName(name: string): JSXMemberExpression {
  return js.jsxMemberExpression(
    js.jsxMemberExpression(
      js.jsxIdentifier(CONTEXT_VAR),
      js.jsxIdentifier(CONTEXT_COMPONENTS)
    ),
    js.jsxIdentifier(name)
  );
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
export function makeJsxElement(
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

export function* applySimpleElement(context: Context, nodeType: Parents['type'], elementType: string): VisitorGenerator {
  let node = context.current;
  assert(node.type === nodeType);
  let out = makeJsxElement(js.jsxIdentifier(elementType), [], yield node.children);
  copyLoc(node, out);
  return out;
}

/** Attempt to convert a subtree to a string */
export function contentToText(contents: PhrasingContent[]): string {
  let out = [];
  for (let content of contents) {
    let stack = [content];
    while (stack.length) {
      let next = stack.pop()!;
      if (next.type === 'text' || next.type === 'inlineCode') {
        out.push(next.value);
      } else if ('children' in next && Array.isArray(next.children)) {
        let children = next.children;
        for (let i = children.length - 1; i >= 0; i--) {
          stack.push(children[i]);
        }
      }
    }
  }
  return out.join('');
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

export function* convertList(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'list');

  let elementName;
  let attributes = [];
  if (node.ordered) {
    elementName = js.jsxIdentifier('ol');
    if (typeof node.start === 'number') {
      attributes.push(js.jsxAttribute(
        js.jsxIdentifier('start'),
        js.jsxExpressionContainer(js.numericLiteral(node.start))
      ));
    }
  } else {
    elementName = js.jsxIdentifier('ul');
  }

  let children: JSXElement[] = [];
  for (let listItem of node.children) {
    let itemChildren: MdastNode[];
    if (!node.spread) {
      // tight lists should not generate paragraphs, see <https://spec.commonmark.org/0.30/#loose>
      itemChildren = listItem.children.flatMap<MdastNode>(node => {
        if (node.type === 'paragraph') {
          return node.children;
        } else {
          return node;
        }
      });
    } else {
      itemChildren = listItem.children;
    }
    let liElement = makeJsxElement('li', [], yield itemChildren);
    copyLoc(listItem, liElement);
    children.push(liElement);
  }

  let out = makeJsxElement(elementName, attributes, children);
  copyLoc(node, out);
  return out;
}

export function* convertBlockquote(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'blockquote');
  let jsxName = makeContextComponentName('Blockquote');
  let out = makeJsxElement(jsxName, [], yield node.children);
  copyLoc(node, out);
  return out;
}

export function* convertTable(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'table');
  assert(node.children.length >= 2);
  assert(node.align, 'expected table node to have alignment information');
  let align = node.align;
  
  function* processRow(rowNode: TableRow, isHeading: boolean): Generator<MdastNode | MdastNode[], JSXNode, JSXNode[]> {
    let cells = [];
    for (let [index, cellNode] of rowNode.children.entries()) {
      let cellAttributes = [];
      if (align[index]) {
        cellAttributes.push(
          js.jsxAttribute(js.jsxIdentifier('style'), js.stringLiteral(`text-align: ${align[index]}`))
        );
      }
      let cell = makeJsxElement(isHeading ? 'th' : 'td', cellAttributes, yield cellNode.children);
      copyLoc(cellNode, cell);
      cells.push(cell);
    }
    let row = makeJsxElement('tr', [], cells);
    copyLoc(rowNode, row);
    return row;
  }

  let headRow = node.children[0];
  let thead = makeJsxElement('thead', [], yield* processRow(headRow, true));
  let bodyRows = node.children.slice(1);
  let body: JSXNode[] = [];
  for (let row of bodyRows) {
    body.push(yield* processRow(row, false));
  }
  let tbody = makeJsxElement('tbody', [], body);

  let out = makeJsxElement('table', [], [thead, tbody]);
  copyLoc(node, out);
  return out;
}

export function* convertCode(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'code');
  let jsxName = makeContextComponentName('Code');
  let attributes = [];
  if (node.lang) {
    attributes.push(js.jsxAttribute(js.jsxIdentifier('lang'), js.stringLiteral(node.lang)));
  }
  if (node.meta) {
    attributes.push(js.jsxAttribute(js.jsxIdentifier('meta'), js.stringLiteral(node.meta)));
  }
  let content = js.jsxExpressionContainer(js.stringLiteral(node.value));
  let out = makeJsxElement(jsxName, attributes, content);
  copyLoc(node, out);
  return out;
}

export function* convertBlockMath(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'math');
  let jsxName = makeContextComponentName('Math');
  let attributes = [
    js.jsxAttribute(js.jsxIdentifier('type'), js.stringLiteral('block'))
  ];
  if (node.meta) {
    attributes.push(
      js.jsxAttribute(js.jsxIdentifier('meta'), js.stringLiteral(node.meta))
    );
  }
  let content = js.jsxExpressionContainer(js.stringLiteral(node.value));
  let out = makeJsxElement(jsxName, attributes, content);
  copyLoc(node, out);
  return out;
}

export function* convertInlineMath(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'inlineMath');
  let jsxName = makeContextComponentName('Math');
  let attributes = [
    js.jsxAttribute(js.jsxIdentifier('type'), js.stringLiteral('inline'))
  ];
  let content = js.jsxExpressionContainer(js.stringLiteral(node.value));
  let out = makeJsxElement(jsxName, attributes, content);
  copyLoc(node, out);
  return out;
}

export function* convertHeading(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'heading');
  let jsxName = makeContextComponentName('Heading');
  let identifier;

  if (node.name) {
    if (context.identifiers.has(node.name)) {
      throw new Error('duplicate heading identifier name');
    } else {
      identifier = node.name;
    }
  } else {
    let baseIdentifier = 'heading-' + contentToText(node.children)
      .toLowerCase()
      .replace(/\s+/g, '-');
    identifier = baseIdentifier;

    while (context.identifiers.has(identifier)) {
      // disambiguate...
      identifier = `${baseIdentifier}-${context.nextDisambiguationIndex()}`;
    }
  }

  context.identifiers.add(identifier);

  let attributes = [
    js.jsxAttribute(
      js.jsxIdentifier('depth'),
      js.jsxExpressionContainer(js.numericLiteral(node.depth))
    ),
    js.jsxAttribute(js.jsxIdentifier('identifier'), js.stringLiteral(identifier))
  ];
  let out = makeJsxElement(jsxName, attributes, yield node.children);
  copyLoc(node, out);
  return out;
}

export function* convertInlineCode(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'inlineCode');
  let content = js.jsxExpressionContainer(js.stringLiteral(node.value));
  let out = makeJsxElement('code', [], content);
  copyLoc(node, out);
  return out;
}

export function* convertParagraph(context: Context): VisitorGenerator {
  return yield* applySimpleElement(context, 'paragraph', 'p');
}

export function* convertEmphasis(context: Context): VisitorGenerator {
  return yield* applySimpleElement(context, 'emphasis', 'em');
}

export function* convertStrong(context: Context): VisitorGenerator {
  return yield* applySimpleElement(context, 'strong', 'strong');
}

export function* convertStrikethrough(context: Context): VisitorGenerator {
  return yield* applySimpleElement(context, 'delete', 's');
}

export function* convertDefinition(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'definition');
  if (context.definitions.has(node.identifier)) {
    throw new Error('duplicate definition: ' + node.identifier);
  }
  context.definitions.set(node.identifier, node);

  // no value
  return [];
}

export function* convertLink(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'link');
  let attributes = [
    js.jsxAttribute(js.jsxIdentifier('href'), js.stringLiteral(node.url))
  ];
  if (node.title) {
    attributes.push(
      js.jsxAttribute(js.jsxIdentifier('title'), js.stringLiteral(node.title))
    );
  }
  let out = makeJsxElement('a', attributes, yield node.children);
  copyLoc(node, out);
  return out;
}

export function* convertImage(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'image');
  let attributes = [
    js.jsxAttribute(js.jsxIdentifier('src'), js.stringLiteral(node.url))
  ];
  if (node.title) {
    attributes.push(
      js.jsxAttribute(js.jsxIdentifier('title'), js.stringLiteral(node.title))
    );
  }
  if (node.alt) {
    attributes.push(
      js.jsxAttribute(js.jsxIdentifier('alt'), js.stringLiteral(node.alt))
    );
  }
  let out = makeJsxElement('img', attributes, null);
  copyLoc(node, out);
  return out;
}

export function* convertLinkReference(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'linkReference');
  let out = makeJsxElement('a', [], yield node.children);
  copyLoc(node, out);
  let attributes = out.openingElement.attributes;
  context.addReference(node.identifier, definition => {
    attributes.push(
      js.jsxAttribute(js.jsxIdentifier('href'), js.stringLiteral(definition.url))
    );
    if (definition.title) {
      attributes.push(
        js.jsxAttribute(js.jsxIdentifier('title'), js.stringLiteral(definition.title))
      );
    }
  });
  return out;
}

export function* convertImageReference(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'imageReference');
  let out = makeJsxElement('img', [], null);
  copyLoc(node, out);
  let attributes = out.openingElement.attributes;
  if (node.alt) {
    attributes.push(
      js.jsxAttribute(js.jsxIdentifier('alt'), js.stringLiteral(node.alt))
    );
  }
  context.addReference(node.identifier, definition => {
    attributes.push(
      js.jsxAttribute(js.jsxIdentifier('src'), js.stringLiteral(definition.url))
    );
    if (definition.title) {
      attributes.push(
        js.jsxAttribute(js.jsxIdentifier('title'), js.stringLiteral(definition.title))
      );
    }
  });
  return out;
}

export function* convertThematicBreak(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'thematicBreak');
  let out = makeJsxElement('hr', [], null);
  copyLoc(node, out);
  return out;
}

export function* convertText(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'text');

  if (node.value.match(/^[\w\s+\-/\.,?!@#$%():;'"]*$/)) {
    // "simple" text, emit JSXText to prevent clutter
    return js.jsxText(node.value);
  } else {
    // wrap in string literal
    return js.jsxExpressionContainer(js.stringLiteral(node.value));
  }
}

export function* convertBreak(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'break');
  let out = makeJsxElement('br', [], null);
  copyLoc(node, out);
  return out;
}

export function* convertRoot(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'root');
  let out = makeJsxFragment(yield node.children);
  copyLoc(node, out);
  return out;
}

export function* convertFrontmatter(context: Context): VisitorGenerator {
  let node = context.current;
  assert(node.type === 'yaml');
  context.handleFrontmatter(node.value);
  return [];
}

export function* badTree(_context: Context): VisitorGenerator {
  throw new Error('unexpected tree node');
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
    blockquote: convertBlockquote,
    list: convertList,
    listItem: badTree, // handled by convertList
    break: convertBreak,
    code: convertCode,
    inlineCode: convertInlineCode,
    emphasis: convertEmphasis,
    strong: convertStrong,
    delete: convertStrikethrough,
    heading: convertHeading,
    link: convertLink,
    image: convertImage,
    thematicBreak: convertThematicBreak,
    definition: convertDefinition,
    linkReference: convertLinkReference,
    imageReference: convertImageReference,
    math: convertBlockMath,
    inlineMath: convertInlineMath,
    table: convertTable,
    tableRow: badTree,
    tableCell: badTree,
    yaml: convertFrontmatter,
    // TODO: directives, footnotes
  };
  return new JSXTransform(new Map(Object.entries(visitorMap) as [MdastNode['type'], NodeVisitor][]));
}
