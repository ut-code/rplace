# MAYFEST/RPLACE

## IMPORTANT

this is only intended to be run on Linux.
do NOT clone this in Windows, or it will probably not work.

it sometimes does not seem to connect to backend due to "CORS Request Blocked."
this is probably because VS Code Terminal opened 127.0.0.1 when it's supposed to open localhost, making the cors package think the origin is not allowed.
solution: open `http://localhost:5173` manually, or use command prompt to launch Vite then ctrl+click on that link.

## how to setup

```shell
npm run setup
```

## how to run

```shell
npm start
```

---

alternatively you can also:
```shell
npm run frontend:dev
```
and
```shell
npm run backend:dev
```
in two separate process

## how to run (production mode)

```shell for frontend
npm run frontend:build
echo "frontend build is done. now use static file hosting service to serve `./vite-dist`."
```
```shell for backend
npm run backend:build
npm run backend:serve:release
```

things that change on release mode:
- environment variables (WEB_ORIGIN and VITE_API_ENDPOINT)
  - dotenv uses .env.production instead of .env
- vite is built into static files (it's hot-reloaded in dev mode)

## Generated files

do NOT touch files inside these 3 directories. they will be overwritten.
./node_modules/
./tsc-dist/
./vite-dist/

## Hot Reload

Vite (frontend) ... supports hot reload.
tsc + express (backend) ... does NOT support hot reload. reload manually.

## TODO

- write .env.production for prod env
- fix vite build not working

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.node.json"],
    tsconfigRootDir: __dirname,
  },
};
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
