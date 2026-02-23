# Halftone

A browser-based tool for composing layered halftone patterns using geometric shapes.

## Development

Install dependencies:

```
npm install
```

Start the dev server with live reload:

```
npm run dev
```

This runs [browser-sync](https://browsersync.io/) and opens the app at `http://localhost:3000`. The browser reloads automatically whenever you save a file.

## Usage

Click the **i** button in the panel for a full guide. In short:

- **Add shapes** — circle, square, or triangle buttons in the panel
- **Move** — drag the interior of a shape
- **Resize** — drag near the edge; squares can be resized independently per axis (width / height)
- **Rotate** — hover to reveal the handle, then drag it
- **Density & pattern** — double-click the handle to open the property box
- **Layers** — reorder, show/hide, or delete shapes in the Layers list
- **Save** — export as PNG (white transparent) or SVG
