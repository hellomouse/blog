import { Parser } from 'acorn';
import acornJsx from 'acorn-jsx';
import { mdxJsx, mdastExtraJsxFlow } from '@hellomouse/micromark-extension-mdx-jsx';

const LEFT_ANGLE_BRACKET = '<'.charCodeAt(0);
export default function mdxHackPlugin() {
  let data = this.data();
  data.fromMarkdownExtensions.push(mdastExtraJsxFlow());
  let ext = mdxJsx({
    acorn: Parser.extend(acornJsx()),
    acornOptions: { ecmaVersion: 2024, sourceType: 'module' },
    addResult: true,
  });
  // "strategically" replace the original micromark-extension-mdx-jsx with ours
  let found = false;
  for (let entry of data.micromarkExtensions) {
    if (Array.isArray(entry?.disable?.null)) {
      // re-enable autolinks
      entry.disable.null = entry.disable.null.filter(v => v !== 'autolink');
    }
    let flowEntry = entry.flow[LEFT_ANGLE_BRACKET];
    for (let i = 0; i < flowEntry.length; i++) {
      if (flowEntry[i].name === 'mdxJsxFlowTag') {
        flowEntry[i] = ext.flow[LEFT_ANGLE_BRACKET];
        found = true;
        break;
      }
    }
    let textEntry = entry.text[LEFT_ANGLE_BRACKET];
    for (let i = 0; i < textEntry.length; i++) {
      if (textEntry[i].name === 'mdxJsxTextTag') {
        textEntry[i] = ext.text[LEFT_ANGLE_BRACKET];
        found = true;
        break;
      }
    }

    if (found) break;
  }

  if (!found) throw new Error('cannot locate mdx-jsx');
}
