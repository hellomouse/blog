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
  - `position` has `start`, `end`, each with `line`, `column`, `offset`
  - `loc` has `start`, `end`, each with `line`, `column`, and `index` (same as `offset`)
  - note: apparently babel-generator does not use the offset
- remove extra packages: `micromark`, `micromark-util-subtokenize`

## Generating sourcemaps

`@babel/generator` can emit sourcemaps.

```js
generate(ast, { sourceMaps: true, sourceFileName: 'doc.mdx' }, sourceString);
```

`sourceString` can be an object of `{ [filename: string]: string }` if multiple
input files exist.
