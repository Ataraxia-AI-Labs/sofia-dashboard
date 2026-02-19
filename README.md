# SofIA Dashboard — Ataraxia IA Labs

Panel de control profesional para clínicas que usan SofIA.  
Cada clínica ve SU data: métricas, pacientes, citas, oportunidades.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Auth + DB, mismo proyecto que el backend)
- **Tailwind CSS** (dark theme, custom brand)
- **Recharts** (gráficas)
- **Lucide** (iconos)

## Arquitectura

```
app/
├── layout.tsx              ← Root layout (fonts, metadata)
├── page.tsx                ← Redirect to /dashboard or /login
├── globals.css             ← Tailwind + custom styles
├── login/page.tsx          ← Auth screen
└── dashboard/
    ├── layout.tsx          ← Sidebar + topbar + auth guard
    ├── page.tsx            ← Overview (métricas principales)
    ├── pacientes/page.tsx  ← [PRÓXIMO] Lista + filtros
    ├── calendario/page.tsx ← [PRÓXIMO] Calendario de citas
    └── oportunidades/     ← [PRÓXIMO] Oportunidades detectadas
lib/
├── supabase.ts            ← Cliente Supabase + API URL
└── api.ts                 ← Funciones fetch (analytics, pacientes, citas)
types/
└── index.ts               ← TypeScript interfaces
```

## Setup Local

### 1. Clonar e instalar

```bash
git clone [tu-repo]
cd sofia-dashboard
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://cvfzdxhkiyrbkptvpuja.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
NEXT_PUBLIC_API_URL=https://ataraxia-api-core.onrender.com
```

### 3. Setup Supabase Auth

1. Ve a Supabase → SQL Editor
2. Ejecuta `setup_dashboard_auth.sql`
3. Ve a Authentication → Users → Add User (crea tu login)
4. Copia el UUID del user creado
5. Ejecuta el INSERT de org_users (ver SQL file)

### 4. Ejecutar

```bash
npm run dev
```

Abre http://localhost:3000

## Deploy en Vercel

### Opción A: Desde GitHub (recomendado)

1. Crea un repo nuevo en GitHub (privado)
2. Push el código:
   ```bash
   git init
   git add .
   git commit -m "SofIA Dashboard v1.0"
   git remote add origin https://github.com/TU_USER/sofia-dashboard.git
   git push -u origin main
   ```
3. Ve a [vercel.com](https://vercel.com) → New Project → Import tu repo
4. En Environment Variables agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL`
5. Deploy 🚀

### Opción B: Vercel CLI

```bash
npm i -g vercel
vercel
# Sigue los prompts, agrega env vars cuando pregunte
```

### Dominio personalizado (opcional)

En Vercel → Settings → Domains → agrega `dashboard.ataraxiaialabs.ai`  
Luego en Cloudflare agrega un CNAME `dashboard` → `cname.vercel-dns.com`

## CORS del Backend

Tu FastAPI ya tiene CORS con `allow_origins=["*"]`, así que el dashboard puede hacer fetch directamente. En producción, restringe a:

```python
allow_origins=["https://dashboard.ataraxiaialabs.ai", "http://localhost:3000"]
```

## Vistas Próximas

| Vista | Status | Descripción |
|-------|--------|-------------|
| Overview | ✅ LISTO | Métricas, funnel, revenue, bots |
| Pacientes | 🔜 Próximo | Lista, búsqueda, detalle, ML features |
| Calendario | 🔜 Próximo | Vista semanal/mensual, estados |
| Oportunidades | 🔜 Próximo | Detectadas, valor, acciones |
| Ajustes | 🔜 Futuro | System prompt, horarios, catálogo |
