# Setup en tu Mac — paso a paso

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
2. Cuando esté listo, andá a **SQL Editor** → Corré en orden los scripts de migraciones completos:
   - `supabase/migrations/0001_init_schema.sql`
   - `supabase/migrations/0002_settlements_and_phone.sql`
   - `supabase/migrations/0003_user_settings.sql`
   - `supabase/migrations/0004_active_flags.sql`
   - `supabase/migrations/0005_prevent_hard_delete.sql`
   - `supabase/migrations/0006_people_is_active.sql`
   - `supabase/migrations/0007_whatsapp_template.sql`
   - `supabase/migrations/0008_ledger_sync_and_snapshot.sql`
3. Andá a **Authentication → Users → Add user** y creá tu propio usuario
   (email + password). Copiá el UUID que te muestra la tabla.
4. Abrí `supabase/seed.sql`, reemplazá `TU_USER_ID_ACA` por ese UUID, y
   corré el script completo en el SQL Editor. Esto te deja bancos, cuentas,
   personas y categorías básicas para poder probar la app ya mismo.
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
npm test          # corre la suite de 28 pruebas unitarias en Vitest
npm run dev
```

Abrí `http://localhost:3000/dashboard` — deberías ver la card de "Patrimonio
neto" con los tokens de color aplicados.

## 7. Deploy a Vercel (gratis)

1. Andá a vercel.com → **Add New Project** → importá el repo de GitHub.
2. En **Root Directory**, elegí `apps/web` (el monorepo tiene el código ahí).
3. Agregá las mismas dos variables de entorno del paso 5 en la configuración
   del proyecto en Vercel.
4. Deploy. Cada push a `main` va a redeployar automático.

## 8. Próximo paso de contenido (no de setup)

Con esto instalado, podés avanzar en la implementación de las siguientes fases
(ver `docs/agents-and-skills.md` y `docs/prd-gap-analysis.md` para el estado actual).

## 9. Empaquetado móvil (Capacitor / Android)

Las dependencias de `@capacitor/core`, `@capacitor/cli` y `@capacitor/android` ya
están incluidas en `package.json`. Cuando vayas a generar la versión Android nativa:

```bash
npx cap init "Finance Nomad" "com.gustavo.financenomad"
npx cap add android
```

Requiere Android Studio instalado (Android SDK + un emulador o tu teléfono
en modo desarrollador conectado por USB para probar el `.apk` real).

