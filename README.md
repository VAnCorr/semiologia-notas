# Semiología Notas (GitHub Pages)

Proyecto React + Vite preparado para publicar en GitHub Pages.

## Ejecutar local

```bash
npm install
npm run dev
```

## Build producción

```bash
npm run build
```

## Publicar en GitHub Pages (rama `gh-pages`)

1. Crea un repositorio vacío en GitHub (por ejemplo: `semiologia-notas`).
2. Inicializa git y conecta remoto:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

3. Publica:

```bash
npm run deploy
```

4. En GitHub, verifica en:
   - `Settings -> Pages`
   - Source: `Deploy from a branch`
   - Branch: `gh-pages` / root

Tu sitio quedará en:

`https://TU_USUARIO.github.io/TU_REPO/`

## Notas

- Se usa `base: './'` en `vite.config.js` para evitar problemas de rutas estáticas en GitHub Pages.
- Script de deploy ya configurado en `package.json`.
