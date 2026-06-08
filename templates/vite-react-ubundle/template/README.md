# __REPLACE__

A React component library built with **Vite**, **TypeScript** and **MUI**.
Components are developed and documented in **Storybook**.

## Getting started

```bash
npm install
npm run storybook   # http://localhost:6006
```

## Scripts

| Script                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `npm run storybook`    | Start Storybook (dev environment)            |
| `npm run build`        | Build the library (ESM + CJS + types) to `dist/` |
| `npm run build-storybook` | Build a static Storybook site             |
| `npm test`             | Run the Vitest unit tests                    |
| `npm run typecheck`    | Type-check without emitting                  |

## Usage

```tsx
import { Card } from '__REPLACE__';

<Card actions={<button>Edit</button>}>Hello</Card>;
```

`react`, `react-dom`, `@mui/material` and `@emotion/*` are peer dependencies.
