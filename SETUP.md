npm# Setup en tu Mac — paso a paso

Hacé esto en orden. Cada paso asume que terminaste el anterior.

## 1. Herramientas base

```bash
# Node.js (via nvm, para poder cambiar de versión si hace falta)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 20
nvm use 20

# Git (si no lo tenés)
xcode-select --install

# Claude Code
npm install -g @anthropic-ai/claude-code
```

## 2. Descomprimir y versionar el proyecto

```bash
cd ~/Developer   # o donde prefieras
unzip finance-nomad.zip
cd finance-nomad
git init
git add .
git commit -m "Scaffold inicial: PRD, design system, agentes, schema"
```

Creá un repo vacío en GitHub y conectalo:

```bash
git remote add origin https://github.com/TU_USUARIO/finance-nomad.git
git branch -M main
git push -u origin main
```

## 3. Verificar que Claude Code detecta los agentes

```bash
claude
```

Dentro de la sesión, escribí `/agents` — deberías ver listados `db-architect`,
`ui-builder`, `ledger-logic` y `qa-reviewer`. Si no aparecen, confirmá que
estás parado en la raíz del proyecto (donde está la carpeta `.claude/`).

## 4. Crear el proyecto en Supabase (gratis)

1. Andá a supabase.com → New project. Elegí una región cercana.
2. Cuando esté listo, andá a **SQL Editor** → pegá el contenido completo de
   `supabase/migrations/0001_init_schema.sql` → Run.
3. Andá a **Authentication → Users → Add user** y creá tu propio usuario
   (email + password). Copiá el UUID que te muestra la tabla.
4. Abrí `supabase/seed.sql`, reemplazá `TU_USER_ID_ACA` por ese UUID, y
   corré el script completo en el SQL Editor. Esto reemplaza el import del
   Excel por ahora — te deja bancos, cuentas, personas y categorías básicas
   para poder probar la app ya mismo. El import real del historial completo
   queda pendiente como tarea separada de `db-architect`.
5. Andá a **Project Settings → API** y copiá `Project URL` y `anon public key`.
6. En **Authentication → URL Configuration**, agregá estos Redirect URLs (además de Site URL):
   - `http://localhost:3000/auth/confirm`
   - `http://localhost:3000/auth/update-password`
   En producción, las mismas rutas con el dominio de Vercel. Sin esto, el mail de restablecer contraseña no vuelve a la app.

## 5. Configurar variables de entorno

```bash
cd apps/web
cp .env.example .env.local
```

Pegá ahí la URL y la key del paso anterior:

```
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

`.env.local` ya está en `.gitignore` de Next.js por defecto — nunca se sube a git.

## 6. Instalar dependencias y correr local

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000/dashboard` — deberías ver la card de "Patrimonio
neto" en `€ 0.00` con los tokens de color aplicados.

## 7. Deploy a Vercel (gratis)

1. Andá a vercel.com → **Add New Project** → importá el repo de GitHub.
2. En **Root Directory**, elegí `apps/web` (el monorepo tiene el código ahí).
3. Agregá las mismas dos variables de entorno del paso 5 en la configuración
   del proyecto en Vercel.
4. Deploy. Cada push a `main` va a redeployar automático.

## 8. Próximo paso de contenido (no de setup)

Con esto instalado, el siguiente mensaje que le mandes a Claude Code puede
ser directamente:

> Usá el agente db-architect para escribir el script que lea
> Finances_2026.xlsx y lo cargue en las tablas de Supabase respetando el
> schema de 0001_init_schema.sql

Eso arranca la Fase 0 del plan (`docs/agents-and-skills.md`).

## 9. Recién en la fase 5 — Android

No hace falta ahora. Cuando llegues ahí:

```bash
npm install -D @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Finance Nomad" "com.gustavo.financenomad"
npx cap add android
```

Requiere Android Studio instalado (Android SDK + un emulador o tu teléfono
en modo desarrollador conectado por USB para probar el `.apk` real).
