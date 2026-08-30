#!/usr/bin/env bash
# =============================================================================
# IJFK - Script helper para Docker (bash / Git Bash / WSL)
# =============================================================================
# Uso:
#   ./scripts/docker-stack.sh up       # Levantar el stack
#   ./scripts/docker-stack.sh down     # Detener
#   ./scripts/docker-stack.sh reset    # Reset completo
#   ./scripts/docker-stack.sh logs     # Ver logs
#   ./scripts/docker-stack.sh status   # Estado
#   ./scripts/docker-stack.sh test-mail # Enviar email de prueba
# =============================================================================

set -e
COMPOSE="docker compose"

header() { echo ""; echo "==== $1 ===="; echo ""; }
ok()    { echo "OK  $1"; }
info()  { echo ">   $1"; }
fail()  { echo "X   $1"; }

if ! command -v docker >/dev/null 2>&1; then
  fail "Docker no está instalado"
  exit 1
fi

case "${1:-help}" in
  up)
    header "Levantando stack IJFK"
    [ -f .env ] || cp .env.example .env
    $COMPOSE up -d
    ok "Stack levantado"
    info "App:        http://localhost:3000"
    info "Postgres:   localhost:54322 (user: postgres, db: ijfk)"
    info "Email:      vía SMTP/Gmail (ver MAIL_USER/MAIL_PASSWORD en .env)"
    ;;
  down)
    header "Deteniendo stack"
    $COMPOSE down
    ;;
  restart)
    header "Reiniciando stack"
    $COMPOSE restart
    ;;
  reset)
    header "Reset completo (BORRA LOS DATOS)"
    read -p "¿Estás seguro? (s/n) " conf
    if [ "$conf" = "s" ]; then
      $COMPOSE down -v
      $COMPOSE up -d
      ok "Stack reseteado"
    else
      info "Cancelado"
    fi
    ;;
  logs)
    $COMPOSE logs -f --tail=100
    ;;
  status)
    header "Estado de los servicios"
    $COMPOSE ps
    ;;
  build)
    header "Construyendo imágenes"
    $COMPOSE build
    ;;
  rebuild)
    header "Reconstruyendo imágenes (forzado)"
    $COMPOSE build --no-cache
    $COMPOSE up -d
    ;;
  tools)
    header "Levantando herramientas extra (pgAdmin)"
    $COMPOSE --profile tools up -d
    info "pgAdmin: http://localhost:5050 (admin@ijfk.local / admin)"
    ;;
  test-mail)
    header "Enviando email de prueba"
    if command -v curl >/dev/null 2>&1; then
      curl -sS -X POST http://localhost:3000/api/test-email \
        -H "Content-Type: application/json" \
        -d '{"to":"test@ijfk.local","subject":"Prueba desde bash","body":"Email de prueba"}'
      echo ""
      info "Revisa la bandeja del destinatario (envío vía SMTP/Gmail)"
    else
      fail "curl no está instalado"
    fi
    ;;
  psql)
    header "Abriendo psql"
    $COMPOSE exec db psql -U postgres -d ijfk
    ;;
  clean)
    header "Limpiando todo"
    read -p "Esto eliminará imágenes y volúmenes. Continuar? (s/n) " conf
    if [ "$conf" = "s" ]; then
      $COMPOSE down -v --remove-orphans
      docker image rm ijfk-app 2>/dev/null || true
      ok "Limpieza completa"
    else
      info "Cancelado"
    fi
    ;;
  help|*)
    echo "Uso: ./scripts/docker-stack.sh <comando>"
    echo ""
    echo "Comandos disponibles:"
    echo "  up         Levanta el stack (app + postgres)"
    echo "  down       Detiene el stack"
    echo "  restart    Reinicia los servicios"
    echo "  reset      Detiene y borra volúmenes, luego levanta (BORRA LA BD)"
    echo "  logs       Muestra logs en tiempo real"
    echo "  status     Estado de los servicios"
    echo "  build      Construye las imágenes"
    echo "  rebuild    Reconstruye sin cache y levanta"
    echo "  tools      Levanta también pgAdmin"
    echo "  test-mail  Envía un email de prueba"
    echo "  psql       Abre psql en el contenedor de Postgres"
    echo "  clean      Limpia imágenes y volúmenes"
    ;;
esac
