import js from '@babel/types';
import {
  ContainerDirectiveInfo,
  ContainerDirectiveProcessor,
  NonContainerDirectiveInfo,
  NonContainerDirectiveProcessor,
  VisitorGenerator,
  copyLoc,
  makeContextComponentName,
  makeJsxElement,
  makeJsxFragment
} from './convert.js';

export function* toJsx(directive: NonContainerDirectiveInfo | ContainerDirectiveInfo): VisitorGenerator {
  let jsxName;
  let attributes = [
    js.jsxAttribute(js.jsxIdentifier('name'), js.stringLiteral(directive.name)),
  ];
  if (directive.type === 'text' || directive.type === 'leaf') {
    jsxName = makeContextComponentName('NonContainerDirective');
    attributes.push(
      js.jsxAttribute(js.jsxIdentifier('type'), js.stringLiteral(directive.type))
    );
  } else if (directive.type === 'container') {
    jsxName = makeContextComponentName('ContainerDirective');
    if (directive.label) {
      let label = makeJsxFragment(yield directive.label);
      attributes.push(
        js.jsxAttribute(js.jsxIdentifier('label'), js.jsxExpressionContainer(label))
      );
    }
  } else {
    throw new Error('unknown directive type');
  }

  let out = makeJsxElement(jsxName, attributes, yield directive.children);
  copyLoc(directive, out);
  return out;
}

export const nonContainerDirectives = new Map<string, NonContainerDirectiveProcessor>(Object.entries({
  test: toJsx,
}));

export const containerDirectives = new Map<string, ContainerDirectiveProcessor>(Object.entries({
  test: toJsx,
}));
