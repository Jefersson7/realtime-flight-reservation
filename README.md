# Sistema de Reserva de Asientos en Tiempo Real — Aerolínea

Prueba técnica: sistema que permite buscar vuelos, visualizar mapas de asientos en tiempo real, bloquear/reservar asientos temporalmente y confirmar la compra, evitando *double booking* mediante actualizaciones en tiempo real entre todos los usuarios conectados.

## Historias de usuario

1. **Búsqueda y filtro de vuelos** — buscar por origen, destino y fecha; la lista se actualiza en tiempo real si cambia el estado de un vuelo (cancelado, retrasado, agotado).
2. **Selección y bloqueo temporal de asientos** — al seleccionar un asiento, se bloquea temporalmente (10 minutos) y se notifica en tiempo real a los demás usuarios conectados al mismo vuelo.
3. **Confirmación y procesamiento de la reserva** — al confirmar, el asiento pasa a estado `OCCUPIED` de forma permanente y se emite un evento global que lo deshabilita para todos.
4. **Dashboard / estado del vuelo** — vista en tiempo real de asientos disponibles, bloqueados y ocupados.

## Stack

- **Backend**: NestJS + TypeScript, PostgreSQL (TypeORM), Redis (locks con `SET NX EX`), Socket.io.
- **Frontend**: React + TypeScript (Vite).
- **Arquitectura**: Monolito Modular con Hexagonal-lite por módulo de dominio. Ver [`docs/architecture.md`](docs/architecture.md) para el detalle y las decisiones (ADRs).

## Ejecución con Docker (recomendado)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker compose up --build
```

- Backend: http://localhost:3000/api
- Frontend: http://localhost:5173

## Ejecución sin Docker

Requiere PostgreSQL y Redis corriendo localmente (o ajustar los `.env` a instancias remotas).

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run start:dev

# Frontend (en otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Documentación

- [`docs/architecture.md`](docs/architecture.md) — diseño, ADRs, diagrama de arquitectura, manejo de concurrencia.
- [`docs/ia.md`](docs/ia.md) — uso transparente de IA durante el desarrollo.