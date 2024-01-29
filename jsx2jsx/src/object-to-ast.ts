import js, { Expression, ObjectProperty, isValidIdentifier } from '@babel/types';
import { AbstractNodeTransformer, AbstractTransformer } from './tree-transformer.js';
import assert from 'node:assert/strict';

export const IS_AST = Symbol('IS_AST');

export class ObjectToAST extends AbstractTransformer<any, Expression, any> {
  makeContext(value: any): any {
    return value;
  }

  getTransform(node: any): AbstractNodeTransformer<any, Expression, any> {
    switch (typeof node) {
      case 'object': {
        if (Array.isArray(node)) {
          return function* convertArray(value) {
            if (value.length === 2 && Object.is(value[0], IS_AST)) {
              // handle raw AST
              return [value[1]];
            } else {
              let children = yield value;
              return [js.arrayExpression(children)];
            }
          }
        } else if (Object.is(node, null)) {
          return function* convertNull() {
            return [js.nullLiteral()];
          }
        } else {
          return function* convertObject(value) {
            let properties: ObjectProperty[] = [];
            let descriptors = Object.getOwnPropertyDescriptors(value);
  
            // cannot convert symbols, so don't
            for (let key of Object.getOwnPropertyNames(descriptors)) {
              let desc = descriptors[key];
              if (!desc.enumerable) continue;
              // should probably not invoke getters
              if (!Object.getOwnPropertyNames(desc).includes('value')) continue;
  
              let value = yield [desc.value];
              assert(value.length === 1, 'object serializer requires single value');
  
              let propKey;
              if (isValidIdentifier(key)) {
                propKey = js.identifier(key);
              } else {
                propKey = js.stringLiteral(key);
              }
  
              properties.push(js.objectProperty(propKey, value[0]));
            }
  
            return [js.objectExpression(properties)];
          }
        }
      }
      case 'string': {
        return function* convertString(value) {
          return [js.stringLiteral(value)];
        }
      }
      case 'number': {
        return function* convertNumber(value) {
          return [js.numericLiteral(value)];
        }
      }
      case 'boolean': {
        return function* convertBoolean(value) {
          return [js.booleanLiteral(value)];
        }
      }
      case 'bigint': {
        return function* convertBigint(value) {
          return [js.bigIntLiteral(value.toString())];
        }
      }
      case 'function': {
        throw new Error('cannot convert type "function"');
      }
      case 'symbol': {
        throw new Error('cannot convert type "symbol"');
      }
      case 'undefined': {
        return function* convertUndefined() {
          return [js.buildUndefinedNode()];
        }
      }
    }
  }
}

export function astNode(node: Expression): [symbol, Expression] {
  return [IS_AST, node];
}

export default function objectToAST(value: any): Expression {
  let transform = new ObjectToAST();
  return transform.transformTree(value);
}
