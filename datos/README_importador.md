# Muestras de prueba — importador de notas con IA

Archivos usados para verificar de extremo a extremo el importador de notas
(`lib/imports/*`, `app/api/imports/grades/**`, fase P4 del módulo de IA).
Construidos contra el roster real de **1ro "A" — Desarrollo Personal,
Ciudadanía y Cívica** (curso sembrado por `npm run seed:full`; sección
elegible por default en `/teacher/grades` y `/teacher/imports` con el
docente `ddpcc01@ijfk.edu.pe` / `Demo2026!`).

Si vuelves a sembrar la BD (`npm run seed:clean`), estos archivos siguen
siendo válidos porque el seed es determinista (mismos DNI, mismos nombres,
mismo orden alfabético) — solo cambian los UUID internos, que el importador
resuelve por nombre/DNI, no por UUID.

## `muestra_notas_dni.csv`

Delimitado por `;` (Excel en español), con columna DNI. Prueba la escalera
de matching completa en un solo archivo:

| Fila | Qué prueba | Resultado esperado |
|---|---|---|
| 1 (Alejandra) | DNI exacto | `match_method = "dni"`, notas 15 y 16 aplicadas |
| 2 (Ana) | Nota inválida (letra) | Nota 1 = 18 aplicada; nota 2 = "AD" → `status = "invalido"`, **no se aplica**, mensaje pidiendo el número en vez de la letra |
| 3 (Andrés) | Celda vacía | Nota 1 vacía → `status = "vacio"`, **no se aplica ni borra** lo existente; nota 2 = 12 aplicada |
| 4 (Camila) | DNI incorrecto (`99999999`, no existe) | Cae al fallback de nombre → `match_method = "nombre_normalizado"` (token-set), igual queda `status = "ok"` |
| 5 (Carlos) | Nota con coma decimal | `"12,5"` → se interpreta como `12.5` |

Con `overwriteExisting=false` (default) todo aparece como `skippedExisting`
si el bimestre ya tiene notas cargadas (el seed carga B1 y B2 completos) —
usa `overwriteExisting=true` para verificar la escritura real en
`competency_grades`.

## `muestra_notas_orden.csv`

Delimitado por `;`, con tildes, **sin columna DNI**, con N° de orden — y las
filas deliberadamente **desordenadas** dentro del archivo (3, 1, 5, 2, 4)
para probar que el matching usa el valor de la columna N°, no la posición
física de la fila. Resultado esperado: las 5 filas emparejan con
`match_method = "orden"` (el roster interno usa el mismo
`ROW_NUMBER() OVER (ORDER BY full_name)` que `/teacher/grades`, así que el
N° del docente cuadra con lo que ve en pantalla).

## Foto (OCR)

No se incluye un archivo de imagen de muestra en el repo (requiere una
imagen real de una libreta manuscrita o impresa, no generable como texto).
Para probar ese camino manualmente: sube cualquier foto JPG/PNG de una
tabla de notas desde `/teacher/imports` o `/admin/imports` con
`AI_ENABLED=1` y `AI_SUPPORTS_VISION=1` configurados — el modelo de visión
(`AI_MODEL_VISION`) transcribe la tabla y el resto del pipeline
(`lib/imports/detect.ts`, `match.ts`, `score.ts`) es idéntico al de
Excel/CSV.

## Comandos de verificación rápida (vía `curl`)

```bash
# 1. Login como el docente dueño del curso
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -H "Origin: http://localhost:3000" \
  -d '{"email":"ddpcc01@ijfk.edu.pe","password":"Demo2026!"}'

# 2. Subir + analizar (reemplaza COURSE_ID si tu seed generó otro UUID:
#    SELECT id FROM courses WHERE grade='1ro' AND section='A'
#    AND name='Desarrollo Personal, Ciudadanía y Cívica';)
COURSE_ID="<uuid-del-curso>"
JOB_ID=$(curl -s -b cookies.txt -X POST http://localhost:3000/api/imports/grades \
  -H "Origin: http://localhost:3000" \
  -F "file=@datos/muestra_notas_dni.csv;type=text/csv" \
  -F "bimester=2" -F "courseId=$COURSE_ID" | python3 -c "import json,sys;print(json.load(sys.stdin)['jobId'])")

curl -s -b cookies.txt -X POST "http://localhost:3000/api/imports/grades/$JOB_ID/parse" \
  -H "Origin: http://localhost:3000"

# 3. Revisar el resultado del matching
curl -s -b cookies.txt "http://localhost:3000/api/imports/grades/$JOB_ID"
```
