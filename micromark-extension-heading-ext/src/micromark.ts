import { factorySpace } from 'micromark-factory-space';
import { asciiAlphanumeric, markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { splice } from 'micromark-util-chunked';
import { codes, constants, types } from 'micromark-util-symbol';
import type { Code, Construct, Effects, Event, State, Token, TokenizeContext } from 'micromark-util-types';
import assert from 'node:assert/strict';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    atxHeadingExt: 'atxHeadingExt';
    atxHeadingExtStartSequence: 'atxHeadingExtStartSequence';
    atxHeadingExtText: 'atxHeadingExtText';
    atxHeadingExtEndSequence: 'atxHeadingExtEndSequence';
    atxHeadingExtIdentifier: 'atxHeadingExtIdentifier';
    atxHeadingExtIdentifierMarker: 'atxHeadingExtIdentifierMarker';
  }
}

// partially derived from https://github.com/micromark/micromark/blob/main/packages/micromark-core-commonmark/dev/lib/heading-atx.js

export const headingAtxExt: Construct = {
  tokenize: tokenizeHeading,
  resolve: resolveHeading,
};

export function tokenizeHeading(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let depth = 0;
  return start;

  /**
   * Before heading
   * 
   * ```markdown
   * > | ## Hello
   *     ^
   * ```
   */
  function start(code: Code): State | undefined {
    assert(code === codes.numberSign);
    effects.enter('atxHeadingExt');
    effects.enter('atxHeadingExtStartSequence');

    return startSequence;
  }

  /**
   * In start sequence
   * 
   * ```markdown
   * > | ## Hello
   *     ^^
   * ```
   */
  function startSequence(code: Code): State | undefined {
    if (code === codes.numberSign && depth < constants.atxHeadingOpeningFenceSizeMax) {
      depth++;
      effects.consume(code);
      return startSequence;
    } else if (markdownSpace(code)) {
      effects.exit('atxHeadingExtStartSequence');
      return factorySpace(effects, dataBegin, types.whitespace)(code);
    } else {
      // not acceptable
      return nok(code);
    }
  }

  /**
   * Before heading data
   * 
   * ```markdown
   * > | ## Hello
   *        ^
   * ```
   */
  function dataBegin(code: Code): State | undefined {
    effects.enter('atxHeadingExtText');
    return data;
  }

  /**
   * Heading data
   * 
   * ```markdown
   * > | ## Hello
   *        ^^^^^
   * ```
   */
  function data(code: Code): State | undefined {
    if (code === codes.eof || markdownLineEnding(code)) {
      effects.exit('atxHeadingExtText');
      return end;
    } else if (markdownSpace(code)) {
      effects.exit('atxHeadingExtText');
      return factorySpace(effects, afterBreak, types.whitespace)(code);
    } else {
      effects.consume(code);
      return data;
    }
  }

  /**
   * After break in heading
   * 
   * ```markdown
   * > | ## Test 4
   *            ^
   * > | ## With id {#with-id}
   *                ^
   * > | ## With end ##
   *                 ^
   * ```
   */
  function afterBreak(code: Code): State | undefined {
    if (code === codes.eof || markdownLineEnding(code)) {
      return end(code);
    } else if (code === codes.leftCurlyBrace) {
      return effects.attempt({ tokenize: endWithId }, end, dataBegin)(code);
    } else if (code === codes.numberSign) {
      return effects.attempt({ tokenize: endSequence }, end, dataBegin)(code);
    } else {
      return dataBegin(code);
    }
  }

  /**
   * Tokenizer for identifier
   * 
   * ```markdown
   * ## With id {#with-id}
   *            ^^^^^^^^^^
   * ## With id and end sequence {#with-id-and-end-sequence} ##
   *                             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   * ```
   */
  function endWithId(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
    const self = this;
    return identifierStart;

    /** Start of identifier block */
    function identifierStart(code: Code): State | undefined {
      assert(code === codes.leftCurlyBrace);
      effects.enter('atxHeadingExtIdentifierMarker');
      effects.consume(code);

      return identifierHash;
    }

    /** Hash in identifier block */
    function identifierHash(code: Code): State | undefined {
      if (code === codes.numberSign) {
        effects.consume(code);
        effects.exit('atxHeadingExtIdentifierMarker');
        effects.enter('atxHeadingExtIdentifier');
        return identifierData;
      } else {
        return nok(code);
      }
    }

    /**
     * Identifier name
     * 
     * HTML5 apparently states identifiers can have anything, but it's more sane
     * to just allow alphanumeric, dash, and underscore
     */
    function identifierData(code: Code): State | undefined {
      if (asciiAlphanumeric(code) || code === codes.dash || code === codes.underscore) {
        effects.consume(code);
        return identifierData;
      } else if (code === codes.rightCurlyBrace) {
        if (self.previous === codes.numberSign) {
          // empty id not allowed
          return nok(code);
        } else {
          effects.exit('atxHeadingExtIdentifier');
          return identifierEnd(code);
        }
      } else {
        return nok(code);
      }
    }

    /** End of identifier block */
    function identifierEnd(code: Code): State | undefined {
      effects.enter('atxHeadingExtIdentifierMarker');
      effects.consume(code);
      effects.exit('atxHeadingExtIdentifierMarker');
      return afterBlock;
    }

    /**
     * After identifier block
     * 
     * ```markdown
     * > | ## Test {#test}
     *                    ^
     * ```
     */
    function afterBlock(code: Code): State | undefined {
      if (code === codes.eof || markdownLineEnding(code)) {
        return ok(code);
      } else if (markdownSpace(code)) {
        return effects.attempt({ tokenize: endLine }, ok, maybeEndSequence);
      } else {
        // note: a space is needed between the identifier and end sequence
        return nok(code);
      }
    }

    /**
     * Handle what might be an end sequence
     * 
     * ```markdown
     * > | ## Test {#test} ##
     *                    ^^^
     * ```
     */
    function maybeEndSequence(code: Code): State | undefined {
      if (markdownSpace(code)) {
        return factorySpace(effects, maybeEndSequence, types.whitespace);
      } else if (code === codes.numberSign) {
        return effects.attempt({ tokenize: endSequence }, ok, nok)(code);
      } else {
        // afterBlock handled trailing spaces already
        return nok(code);
      }
    }
  }

  /**
   * Tokenizer for ending sequence
   * 
   * ```markdown
   * > | ## Heading ##
   *                ^^
   * ```
   */
  function endSequence(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
    return start;

    function start(code: Code): State | undefined {
      assert(code === codes.numberSign);
      effects.enter('atxHeadingExtEndSequence');
      effects.consume(code);
      return within;
    }

    function within(code: Code): State | undefined {
      if (code === codes.numberSign) {
        effects.consume(code);
        return within;
      } else {
        effects.exit('atxHeadingExtEndSequence');
        return effects.attempt({ tokenize: endLine }, ok, nok);
      }
    }
  }

  /**
   * Tokenizer for optional spaces before end of line
   * 
   * ```markdown
   * > | ## Heading
   *                ^^
   * ```
   */
  function endLine(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
    return tryLine;

    function tryLine(code: Code): State | undefined {
      if (markdownSpace(code)) {
        return factorySpace(effects, tryLine, types.lineSuffix);
      } else if (code === codes.eof || markdownLineEnding(code)) {
        return ok(code);
      } else {
        return nok(code);
      }
    }
  }

  /** End of heading */
  function end(code: Code): State | undefined {
    effects.exit('atxHeadingExt');
    return ok(code);
  }
};

export function resolveHeading(events: Event[], context: TokenizeContext): Event[] {
  // TODO: resolve to something like:
  // +atxHeadingExt +-atxHeadingExtStartSequence +-whitespace +chunkText ... -chunkText
  // [+-atxHeadingExtIdentifierMarker +-atxHeadingExtIdentifier +-atxHeadingExtIdentifierMarker]
  // [+-atxHeadingExtEndSequence] -atxHeadingExt

  let index = 0;
  function assertEvent(eventType: Event[0], tokenType: Event[1]['type']) {
    assert(events[index][0] === eventType && events[index][1].type === tokenType);
  }

  // TODO: probably do not need to be absolutely paranoid
  assertEvent('enter', 'atxHeadingExt');
  index += 1;
  assertEvent('enter', 'atxHeadingExtStartSequence');
  index += 1;
  assertEvent('exit', 'atxHeadingExtStartSequence');
  index += 1;
  assertEvent('enter', types.whitespace);
  index += 1;
  assertEvent('exit', types.whitespace);
  index += 1;
  assertEvent('enter', 'atxHeadingExtText');
  let firstTextIndex = index;
  let replaceTo: number | null = null;

  index = events.length - 1;
  assertEvent('exit', 'atxHeadingExt');
  index -= 1;

  if (events[index][1].type === types.lineSuffix) {
    assertEvent('exit', types.lineSuffix);
    index -= 1;
    assertEvent('enter', types.lineSuffix);
    index -= 1;
  }

  if (events[index][1].type === 'atxHeadingExtEndSequence') {
    assertEvent('exit', 'atxHeadingExtEndSequence');
    index -= 1;
    assertEvent('enter', 'atxHeadingExtEndSequence');
    index -= 1;
    assertEvent('exit', types.whitespace);
    index -= 1;
    assertEvent('enter', types.whitespace);
    index -= 1;
  }

  if (events[index][1].type === 'atxHeadingExtIdentifierMarker') {
    assertEvent('exit', 'atxHeadingExtIdentifierMarker');
    index -= 1;
    assertEvent('enter', 'atxHeadingExtIdentifierMarker');
    index -= 1;
    assertEvent('exit', 'atxHeadingExtIdentifier');
    index -= 1;
    assertEvent('enter', 'atxHeadingExtIdentifier');
    index -= 1;
    assertEvent('exit', 'atxHeadingExtIdentifierMarker');
    index -= 1;
    assertEvent('enter', 'atxHeadingExtIdentifierMarker');
    index -= 1;
    assertEvent('exit', types.whitespace);
    index -= 1;
    assertEvent('enter', types.whitespace);
    index -= 1;
  }

  if (events[index][1].type === types.whitespace) {
    assertEvent('exit', types.whitespace);
    replaceTo = index + 1;
    index -= 1;
    assertEvent('enter', types.whitespace);
    index -= 1;
  }

  assertEvent('exit', 'atxHeadingExtText');
  let lastTextIndex = index;
  if (replaceTo === null) {
    replaceTo = lastTextIndex + 1;
  }

  let chunkText: Token = {
    type: types.chunkText,
    contentType: constants.contentTypeText,
    start: events[firstTextIndex][1].start,
    end: events[lastTextIndex][1].end,
  };

  splice(events, firstTextIndex, replaceTo - firstTextIndex, [
    ['enter', chunkText, context],
    ['exit', chunkText, context],
  ]);

  return events;
}
