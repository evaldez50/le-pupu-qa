# Le Pupu Le Guagua — QA

Repo de deploy para el ambiente QA de [Le Pupu Le Guagua](https://github.com/evaldez50/le-pupu-le-guagua). Este repo se actualiza automáticamente via GitHub Actions cuando se pushea a la rama `dev` del repo principal.

**No editar este repo directamente** — los cambios se hacen en el repo principal y se despliegan automáticamente.

## Relación con el repo principal

- **Repo principal:** `evaldez50/le-pupu-le-guagua` (rama `dev`)
- **Este repo:** `evaldez50/le-pupu-qa` (rama `gh-pages`)
- **Deploy automático:** GitHub Actions en el repo principal pushea aquí al hacer push a `dev`
- **URL QA:** GitHub Pages de este repo

## Ambiente QA

| Config | Valor |
|---|---|
| Supabase project | `ruasctrwyktlumtiyuzo` (QA) |
| Stripe | Test mode (no cobra dinero real) |
| Deploy | GitHub Pages desde rama `gh-pages` |

## Estructura de archivos

```
le-pupu-qa/
├── index.html                              # App (copia deployada desde dev branch)
├── .nojekyll                               # Evita procesamiento Jekyll en GitHub Pages
├── supabase/
│   ├── config.toml                         # Config del proyecto Supabase
│   └── functions/stripe-webhook/index.ts   # Edge function (misma que prod)
└── .claude/launch.json                     # Config de launch para dev local
```

## Cómo correr localmente

```bash
npx serve -l 3000 .
# http://localhost:3000
```

## Notas para Claude Code

- **No hacer cambios aquí** — este repo es solo un target de deploy
- Los cambios se hacen en `le-pupu-le-guagua` rama `dev` y se despliegan automáticamente
- Las credenciales apuntan al proyecto Supabase QA, no al de producción
- El Stripe payment link es de test mode
