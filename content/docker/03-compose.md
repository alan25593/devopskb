---
title: "Docker Compose: Servicios, Redes, Volúmenes y Profiles"
category: "docker"
tags: ["compose", "multi-container", "servicios", "redes", "volumenes"]
keywords: ["docker compose", "levantar servicios", "bajar servicios", "compose yml", "depends on", "healthcheck", "volumes compose", "networks compose", "profiles compose", "override compose", "environment variables compose", "escalar servicios", "compose watch"]
description: "Orquestación de múltiples contenedores con Docker Compose: definición de servicios, redes internas, volúmenes persistentes, profiles por entorno y override files."
---

# Docker Compose

## Contenido

- [Estructura básica de compose.yml](#estructura-básica-de-composeyml)
- [Comandos esenciales](#comandos-esenciales)
- [Override files por entorno](#override-files-por-entorno)
- [Profiles — servicios opcionales](#profiles-—-servicios-opcionales)
- [Healthchecks y dependencias](#healthchecks-y-dependencias)
- [Volúmenes](#volúmenes)
- [Escalar servicios](#escalar-servicios)
- [Compose Watch (hot reload en desarrollo)](#compose-watch-hot-reload-en-desarrollo)
- [Variables de entorno y precedencia](#variables-de-entorno-y-precedencia)

---

## Estructura básica de compose.yml

```yaml
# compose.yml (nombre moderno, antes docker-compose.yml)
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
    image: mi-api:latest
    container_name: api
    ports:
      - "3000:3000"
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - backend

  postgres:
    image: postgres:16-alpine
    container_name: postgres
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d mydb"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - backend

volumes:
  postgres_data:

networks:
  backend:
    driver: bridge
```

---

## Comandos esenciales

```bash
# Levantar todos los servicios (build si es necesario)
docker compose up

# Levantar en background
docker compose up -d

# Levantar y forzar rebuild de imágenes
docker compose up -d --build

# Levantar solo servicios específicos
docker compose up -d api redis

# Parar y borrar contenedores (mantiene volúmenes)
docker compose down

# Parar, borrar contenedores Y volúmenes
docker compose down -v

# Parar sin borrar contenedores
docker compose stop

# Reiniciar un servicio
docker compose restart api

# Ver estado de los servicios
docker compose ps

# Ver logs de todos los servicios
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f api --tail 50
```

---

## Override files por entorno

En lugar de tener un compose diferente por entorno, usás override files que se mergean:

```bash
# Base (compose.yml) — configuración común
# compose.override.yml — se aplica automáticamente en desarrollo
# compose.prod.yml     — se aplica manualmente en producción
```

```yaml
# compose.yml — base
services:
  api:
    image: mi-api:latest
    environment:
      NODE_ENV: production

  postgres:
    image: postgres:16-alpine
```

```yaml
# compose.override.yml — desarrollo (se aplica automático)
services:
  api:
    build: .
    volumes:
      - .:/app               # hot reload del código
    environment:
      NODE_ENV: development
    ports:
      - "9229:9229"          # puerto de debug de Node

  postgres:
    ports:
      - "5432:5432"          # exponer postgres al host para DBeaver/TablePlus
```

```yaml
# compose.prod.yml — producción
services:
  api:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    restart: always
```

```bash
# Desarrollo (usa compose.yml + compose.override.yml automáticamente)
docker compose up -d

# Producción
docker compose -f compose.yml -f compose.prod.yml up -d
```

---

## Profiles — servicios opcionales

```yaml
services:
  api:
    image: mi-api:latest
    # Sin profile = siempre se levanta

  redis:
    image: redis:7-alpine
    profiles: ["cache"]           # Solo si se activa el profile

  adminer:
    image: adminer
    ports:
      - "8080:8080"
    profiles: ["tools"]           # Solo en desarrollo/debug

  prometheus:
    image: prom/prometheus
    profiles: ["monitoring"]
```

```bash
# Levantar solo servicios sin profile
docker compose up -d

# Levantar con profile específico
docker compose --profile cache up -d
docker compose --profile tools --profile cache up -d

# Variable de entorno alternativa
COMPOSE_PROFILES=cache,tools docker compose up -d
```

---

## Healthchecks y dependencias

```yaml
services:
  api:
    depends_on:
      postgres:
        condition: service_healthy    # espera el healthcheck
      redis:
        condition: service_started   # espera solo que arranque
      migrations:
        condition: service_completed_successfully  # espera que termine OK

  migrations:
    image: mi-api:latest
    command: ["node", "migrate.js"]
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 20s
```

---

## Volúmenes

```yaml
services:
  app:
    volumes:
      # Named volume (gestionado por Docker)
      - app_data:/app/data

      # Bind mount (mapea carpeta del host)
      - ./config:/app/config:ro      # :ro = solo lectura

      # Tmpfs (en memoria, se borra al parar)
      - type: tmpfs
        target: /tmp

volumes:
  app_data:
    driver: local

  # Volumen externo (creado fuera de compose)
  shared_data:
    external: true
```

```bash
# Listar volúmenes
docker volume ls

# Inspeccionar un volumen (ver dónde está en el host)
docker volume inspect postgres_data

# Hacer backup de un volumen
docker run --rm \
  -v postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restaurar backup
docker run --rm \
  -v postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

---

## Escalar servicios

```bash
# Escalar un servicio a N réplicas (sin container_name fijo)
docker compose up -d --scale api=3

# Ver las réplicas corriendo
docker compose ps
```

---

## Compose Watch (hot reload en desarrollo)

```yaml
services:
  api:
    build: .
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: package.json
```

```bash
docker compose watch
```

---

## Variables de entorno y precedencia

Orden de precedencia (mayor a menor):

1. Variables del shell donde corrés compose
2. `.env` en el mismo directorio que compose.yml
3. `environment:` en el compose.yml
4. `env_file:` en el compose.yml

```bash
# Ver la configuración efectiva (variables interpoladas)
docker compose config

# Ver solo los servicios que compose va a crear
docker compose config --services
```
