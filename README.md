# Semiología Notas (GitHub Pages + Google Sheets)

Proyecto React + Vite conectado con Google Sheets vía Google Apps Script.

## Ejecutar local

```bash
npm install
npm run dev
```

## Build producción

```bash
npm run build
```

## Integración con Google Sheets

### 1) Estructura de la hoja

En Google Sheets crea una pestaña llamada `Notas` con encabezados en la fila 1:

`id | nombre | S1 | S2 | ... | S16 | promedio`

En filas 2+ coloca estudiantes con `id` numérico (1..9) y `nombre`.

Además crea una pestaña llamada `Rubrica` con encabezados:

`criterio | peso | descripcion`

Ejemplo:

- `Entrevista con el paciente | 25 | Realiza anamnesis dirigida, clara y ordenada.`
- `Ejecutó técnicas de examen físico | 25 | Aplica correctamente inspección, palpación, percusión y auscultación.`
- `Razonamiento clínico | 20 | Integra hallazgos y plantea diagnósticos diferenciales pertinentes.`
- `Hoja de historia clínica elaborada | 20 | Documenta de forma completa, legible y estructurada.`
- `Asistencia en la semana | 10 | Cumple asistencia y participación durante la semana.`

> La pestaña `Evaluaciones` se crea automáticamente la primera vez que guardas una evaluación diaria desde la app.

### 2) Apps Script

1. Abre `Extensiones -> Apps Script` desde tu hoja.
2. Copia el contenido de [google-apps-script/Code.gs](google-apps-script/Code.gs).
3. `Deploy -> New deployment -> Web app`.
4. Ejecutar como: `Me`.
5. Acceso: `Anyone with the link`.
6. Copia la URL terminada en `/exec`.

### 3) Variable de entorno

1. Copia `.env.example` a `.env`.
2. Configura:

```bash
VITE_GAS_URL=https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec
```

### 4) Ejecutar y probar

```bash
npm install
npm run dev
```

La app ahora:
- Carga notas desde Google Sheets al abrir.
- Carga la rúbrica desde la pestaña `Rubrica` (si existe).
- Permite evaluar diariamente por fecha y semana para todos los estudiantes.
- Guarda cada evaluación diaria en la hoja `Evaluaciones` (una fila por estudiante y por fecha).
- Actualiza automáticamente la nota semanal correspondiente (`S1...S16`) con el promedio acumulado de esa semana.
- Muestra estado de sincronización en el encabezado.
- Permite descargar CSV solo como respaldo local.

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
- Si `VITE_GAS_URL` está vacío o falla la conexión, funciona en modo local sin sincronizar.
