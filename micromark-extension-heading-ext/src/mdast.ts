import type { Heading } from 'mdast';
import type { CompileContext, Extension } from 'mdast-util-from-markdown';
import type { Token } from 'micromark-util-types';
import assert from 'node:assert/strict';

declare module 'mdast' {
  interface Heading {
    name?: string | null;
  }
}

export function headingAtxExtFromMarkdown(): Extension {
  return {
    enter: {
      atxHeadingExt: enterHeading,
    },
    exit: {
      atxHeadingExt: exitHeading,
      atxHeadingExtStartSequence: exitHeadingSequence,
      atxHeadingExtIdentifier: exitHeadingIdentifier,
    }
  };

  function enterHeading(this: CompileContext, token: Token) {
    this.enter(
      {
        type: 'heading',
        depth: null as any, // will be set later
        name: null,
        children: [],
      } as Heading,
      token,
    );
  }

  function exitHeadingSequence(this: CompileContext, token: Token) {
    let top = this.stack[this.stack.length - 1] as Heading;
    let depth = this.sliceSerialize(token).length;
    assert(depth >= 1 && depth <= 6);
    top.depth = depth as any; // checked above
  }

  function exitHeadingIdentifier(this: CompileContext, token: Token) {
    let top = this.stack[this.stack.length - 1] as Heading;
    let identifer = this.sliceSerialize(token);
    top.name = identifer;
  }

  function exitHeading(this: CompileContext, token: Token) {
    let top = this.stack[this.stack.length - 1] as Heading;
    assert(top.depth);
    this.exit(token);
  }
}
