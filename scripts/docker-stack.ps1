# =============================================================================
# IJFK - Script helper para Docker (PowerShell)
# =============================================================================
# Uso:
#   .\scripts\docker-stack.ps1 up       # Levantar el stack
#   .\scripts\docker-stack.ps1 down     # Detener
#   .\scripts\docker-stack.ps1 reset    # Reset completo
#   .\scripts\docker-stack.ps1 logs     # Ver logs
#   .\scripts\docker-stack.ps1 status   # Estado
#   .\scripts\docker-stack.ps1 test-mail # Enviar email de prueba
#   .\scripts\docker-stack.ps1 psql     # Abrir psql
# =============================================================================

param(
  [Parameter(Position=0)]
  [ValidateSet("up","down","restart","reset","logs","status","build","rebuild","test-mail","psql","tools","clean","help")]
  [string]$Command = "help"
)

$ErrorActionPreference = "Stop"
$Compose = "docker compose"

function Header($text) {
  Write-Host ""
  Write-Host "==== $text ====" -ForegroundColor Cyan
  Write-Host ""
}

function Success($text) { Write-Host "OK $text" -ForegroundColor Green }
function Info($text)    { Write-Host ">  $text" -ForegroundColor Yellow }
function Fail($text)    { Write-Host "X  $text" -ForegroundColor Red }

# Verificar que docker esta disponible
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Fail "Docker no esta instalado o no esta en PATH"
  exit 1
}

switch ($Command) {
  "up" {
    Header "Levantando stack IJFK"
    if (-not (Test-Path ".env")) {
      Info "Creando .env desde .env.example..."
      Copy-Item ".env.example" ".env"
    }
    Invoke-Expression "$Compose up -d"
    if ($LASTEXITCODE -eq 0) {
      Success "Stack levantado"
      Info "App:        http://localhost:3000"
      Info "Mailpit:    http://localhost:8025"
      Info "Postgres:   localhost:54322 (user: postgres, db: ijfk)"
    }
  }
  "down" {
    Header "Deteniendo stack"
    Invoke-Expression "$Compose down"
  }
  "restart" {
    Header "Reiniciando stack"
    Invoke-Expression "$Compose restart"
  }
  "reset" {
    Header "Reset completo (BORRA LOS DATOS)"
    $conf = Read-Host "Estas seguro? Esto borrara la BD. (s/n)"
    if ($conf -eq "s") {
      Invoke-Expression "$Compose down -v"
      Invoke-Expression "$Compose up -d"
      Success "Stack reseteado"
    } else {
      Info "Cancelado"
    }
  }
  "logs" {
    Invoke-Expression "$Compose logs -f --tail=100"
  }
  "status" {
    Header "Estado de los servicios"
    Invoke-Expression "$Compose ps"
  }
  "build" {
    Header "Construyendo imagenes"
    Invoke-Expression "$Compose build"
  }
  "rebuild" {
    Header "Reconstruyendo imagenes (forzado)"
    Invoke-Expression "$Compose build --no-cache"
    Invoke-Expression "$Compose up -d"
  }
  "tools" {
    Header "Levantando herramientas extra (pgAdmin)"
    Invoke-Expression "$Compose --profile tools up -d"
    Info "pgAdmin: http://localhost:5050 (admin@ijfk.local / admin)"
  }
  "test-mail" {
    Header "Enviando email de prueba"
    try {
      $body = @{ to = "test@ijfk.local"; subject = "Prueba desde PowerShell"; body = "Email de prueba" } | ConvertTo-Json
      $r = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/test-email" -ContentType "application/json" -Body $body
      Success $r.message
      Info "Revisa http://localhost:8025"
    } catch {
      Fail "No se pudo enviar: $_"
      Info "Asegurate de que la app este levantada (docker compose up -d)"
    }
  }
  "psql" {
    Header "Abriendo psql"
    Invoke-Expression "$Compose exec db psql -U postgres -d ijfk"
  }
  "clean" {
    Header "Limpiando todo (imagenes, volumenes, caches)"
    $conf = Read-Host "Esto eliminara imagenes y volumenes. Continuar? (s/n)"
    if ($conf -eq "s") {
      Invoke-Expression "$Compose down -v --remove-orphans"
      docker image rm ijfk-app 2>$null
      Success "Limpieza completa"
    } else {
      Info "Cancelado"
    }
  }
  "help" {
    Write-Host "Uso: .\scripts\docker-stack.ps1 <comando>"
    Write-Host ""
    Write-Host "Comandos disponibles:"
    Write-Host "  up         Levanta el stack (app + postgres + mailpit)"
    Write-Host "  down       Detiene el stack"
    Write-Host "  restart    Reinicia los servicios"
    Write-Host "  reset      Detiene y borra volumenes, luego levanta (BORRA LA BD)"
    Write-Host "  logs       Muestra logs en tiempo real"
    Write-Host "  status     Estado de los servicios"
    Write-Host "  build      Construye las imagenes"
    Write-Host "  rebuild    Reconstruye sin cache y levanta"
    Write-Host "  tools      Levanta tambien pgAdmin"
    Write-Host "  test-mail  Envia un email de prueba"
    Write-Host "  psql       Abre psql en el contenedor de Postgres"
    Write-Host "  clean      Limpia imagenes y volumenes"
  }
}
