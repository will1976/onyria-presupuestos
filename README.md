# Onyria Studio — Sistema de Presupuestos

Aplicación web para automatizar y profesionalizar el proceso de cotización de **Onyria Studio**, estudio tecnocreativo de audio inmersivo.

---

## 🚀 Inicio Rápido

### Requisitos previos
- Node.js 18+
- PostgreSQL 14+
- Cuenta en [Google AI Studio](https://aistudio.google.com/) para obtener la API Key de Gemini

### 1. Clonar y configurar entorno

```bash
# Instalar dependencias raíz, client y server
npm run install:all

# Copiar variables de entorno
cp .env.example server/.env
```

Edita `server/.env` con tus credenciales reales.

### 2. Crear la base de datos

```bash
# En psql o pgAdmin, crear la DB:
createdb onyria_presupuestos

# Ejecutar migraciones
npm run db:migrate

# (Opcional) Cargar datos de ejemplo
npm run db:seed
```

### 3. Lanzar en desarrollo

```bash
npm run dev
```

Esto inicia en paralelo:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

---

## 🗂️ Estructura del Proyecto

```
onyria-presupuestos/
├── client/                        # React + Tailwind (Vite)
│   ├── src/
│   │   ├── components/            # Componentes reutilizables
│   │   │   ├── ui/                # Badge, Button, Input, Modal, Toast...
│   │   │   ├── layout/            # Sidebar, Header
│   │   │   └── pdf/               # PDFPreview
│   │   ├── pages/                 # Vistas principales
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── AnalisisIA.jsx
│   │   │   ├── NuevoPresupuesto.jsx
│   │   │   ├── Presupuestos.jsx
│   │   │   └── Servicios.jsx
│   │   ├── services/              # Llamadas HTTP al backend
│   │   │   ├── api.js             # Instancia axios base
│   │   │   ├── auth.service.js
│   │   │   ├── presupuestos.service.js
│   │   │   ├── servicios.service.js
│   │   │   ├── clientes.service.js
│   │   │   └── ia.service.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # JWT + estado de sesión
│   │   ├── hooks/
│   │   │   ├── usePresupuestos.js
│   │   │   └── useToast.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                        # Node.js + Express
│   ├── src/
│   │   ├── routes/                # Definición de rutas
│   │   │   ├── auth.routes.js
│   │   │   ├── presupuestos.routes.js
│   │   │   ├── servicios.routes.js
│   │   │   ├── clientes.routes.js
│   │   │   └── ia.routes.js
│   │   ├── controllers/           # Lógica de negocio
│   │   │   ├── auth.controller.js
│   │   │   ├── presupuestos.controller.js
│   │   │   ├── servicios.controller.js
│   │   │   ├── clientes.controller.js
│   │   │   └── ia.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js  # Verifica JWT
│   │   │   ├── errorHandler.js
│   │   │   └── rateLimiter.js
│   │   ├── db/
│   │   │   ├── index.js            # Pool pg
│   │   │   ├── migrations/
│   │   │   │   └── 001_init.sql
│   │   │   └── seeds/
│   │   │       └── seed.js
│   │   ├── utils/
│   │   │   ├── geminiClient.js
│   │   │   └── pdfGenerator.js
│   │   ├── config/
│   │   │   └── index.js
│   │   └── index.js               # Entry point Express
│   ├── .env                       # (crear desde .env.example)
│   └── package.json
│
├── .env.example
├── .gitignore
├── package.json                   # Workspaces raíz
└── README.md
```

---

## 🔑 Credenciales por defecto (seed)

| Campo    | Valor               |
|----------|---------------------|
| Email    | admin@onyria.cl     |
| Password | onyria2025          |

> ⚠️ Cambiar en producción.

---

## 📡 API Endpoints

### Auth
| Método | Ruta               | Descripción         |
|--------|--------------------|---------------------|
| POST   | /api/auth/login    | Iniciar sesión      |
| POST   | /api/auth/logout   | Cerrar sesión       |
| GET    | /api/auth/me       | Usuario actual      |

### Presupuestos
| Método | Ruta                          | Descripción              |
|--------|-------------------------------|--------------------------|
| GET    | /api/presupuestos             | Listar (filtros)         |
| GET    | /api/presupuestos/:id         | Detalle                  |
| POST   | /api/presupuestos             | Crear                    |
| PUT    | /api/presupuestos/:id         | Actualizar               |
| PATCH  | /api/presupuestos/:id/estado  | Cambiar estado           |
| DELETE | /api/presupuestos/:id         | Eliminar                 |
| GET    | /api/presupuestos/:id/pdf     | Descargar PDF            |
| POST   | /api/presupuestos/:id/duplicar| Duplicar                 |

### Servicios
| Método | Ruta                  | Descripción       |
|--------|-----------------------|-------------------|
| GET    | /api/servicios        | Listar catálogo   |
| POST   | /api/servicios        | Crear             |
| PUT    | /api/servicios/:id    | Actualizar        |
| DELETE | /api/servicios/:id    | Eliminar          |

### Clientes
| Método | Ruta                  | Descripción       |
|--------|-----------------------|-------------------|
| GET    | /api/clientes         | Listar            |
| POST   | /api/clientes         | Crear             |
| PUT    | /api/clientes/:id     | Actualizar        |

### IA
| Método | Ruta               | Descripción                      |
|--------|--------------------|----------------------------------|
| POST   | /api/ia/analizar   | Analizar email con Gemini        |

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js 18 + Express 4 |
| Base de datos | PostgreSQL 14 + pg (node-postgres) |
| IA | Google Gemini API (gemini-1.5-flash) |
| PDF | Puppeteer |
| Auth | JWT + bcrypt |
| Dev tools | Concurrently, Nodemon |

---

## 📋 Flujo de Uso

1. **Login** → el equipo accede con email y contraseña
2. **Análisis IA** → pegar email del cliente → Gemini extrae servicios en JSON
3. **Crear Presupuesto** → desde el análisis o desde cero, editar ítems y precios
4. **PDF** → previsualizar y descargar con branding Onyria
5. **Seguimiento** → dashboard con métricas y cambio de estados
