import { codes } from 'micromark-util-symbol';
import type { Extension } from 'micromark-util-types';

import { headingAtxExt as headingConstruct } from './micromark.js';

export function headingAtxExt(): Extension {
  return {
    disable: {
      null: ['headingAtx']
    },
    flow: {
      [codes.numberSign]: headingConstruct
    }
  }
}
