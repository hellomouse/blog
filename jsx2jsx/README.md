# jsx2jsx

> What if you could take Markdown and feed it directly to Babel?
>
> &mdash; <cite>nobody ever, probably because it is a terrible idea</cite>

This project aims to feed a Markdown flavor similar to MDX directly to the
[`dom-expressions` compiler](https://github.com/ryansolid/dom-expressions/tree/main/packages/babel-plugin-jsx-dom-expressions)
for use with [Solid.js](https://solidjs.com/). It is not fully compatible with
MDX.

## Things to do

- convert markdown `position` attributes to `loc` and add `filename` entry
- remove extra packages: `micromark`, `micromark-util-subtokenize`
