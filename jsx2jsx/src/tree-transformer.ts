export type AbstractNodeTransformer<From, To, Context> =
  (context: Context) => AbstractTransformGenerator<From, To>;

export type AbstractTransformGenerator<From, To> =
  Generator<From[], To[], To[]>;

export class AbstractTransformer<From, To, Context> {
  getTransform(_node: From): AbstractNodeTransformer<From, To, Context> {
    throw new Error('not implemented');
  }

  makeContext(_node: From): Context {
    throw new Error('not implemented');
  }

  transformTree(root: From): To {
    let initialGenerator = this.getTransform(root);
    let initialContext = this.makeContext(root);
    let initial = initialGenerator(initialContext);

    let stack = [initial];
    let resume = initial.next();
    while (true) {
      if (resume.done) {
        // generator done, return to higher level
        let up = resume.value;
        stack.pop();

        if (!stack.length) {
          // return new root
          if (up.length !== 1) {
            throw new Error('root must return only one element');
          }
          return up[0];
        }

        // send to parent
        let top = stack[stack.length - 1];
        resume = top.next(up);
      } else {
        // process children
        let child = resume.value;
        if (child.length === 1) {
          let genFn = this.getTransform(child[0]);
          let context = this.makeContext(child[0]);
          let gen = genFn(context);
          resume = gen.next();
          stack.push(gen);
        } else {
          // push adapter
          let gen: AbstractTransformGenerator<From, To> = flatMapGenerator(child);
          resume = gen.next();
          stack.push(gen);
        }
      }
    }
  }
}

/**
 * Given an array, yield each value from the array and gather values passed to
 * `next()` into the output array. If an array is passed to `next()`, merge its
 * contents into the output array. Return the output array when complete.
 */
export function* flatMapGenerator<T, U>(input: T[]): Generator<T[], U[], U[]> {
  let output = [];
  for (let val of input) {
    let next = yield [val];
    output.push(...next);
  }
  return output;
}
