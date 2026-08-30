---
name: IJFK — Sistema Institucional
description: Marca pública de jornada escolar (tinta, timbre de oro, ocho bloques) que el portal debe alcanzar.
colors:
  navy-kennedy: "#1E2A5E"
  navy-kennedy-hover: "#162043"
  navy-deep: "#2C3A7A"
  on-navy: "#ffffff"
  tinta: "#0e1633"
  tinta-alta: "#0a1028"
  oro-honor: "#F4C15C"
  oro-honor-hover: "#e0b04f"
  oro-lift: "#ffd580"
  tiza: "#f2f4f8"
  arena: "#e7dcc5"
  vid: "#57a184"
  linea: "#24305c"
  hour-mute: "#8d9bc9"
  chalk-blue: "#c8d0ea"
  paper: "#F8FAFC"
  ink: "#0f172a"
  card: "#ffffff"
  muted: "#f1f5f9"
  muted-ink: "#64748b"
  border: "#e2e8f0"
  surface: "#f9f9ff"
  surface-low: "#f0f3ff"
  outline: "#767680"
  outline-variant: "#c6c5d1"
  success: "#1b6f3a"
  warning: "#815700"
  error: "#ba1a1a"
  destructive: "#ef4444"
  level-ad: "#109669"
  level-a: "#2563EB"
  level-b: "#d97706"
  level-c: "#dc2626"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6.4vw, 4.6rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 3.4vw, 2.35rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Karla, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  "2xl": "16px"
  pill: "2rem"
spacing:
  base: "8px"
  stack-sm: "12px"
  gutter: "16px"
  stack-md: "24px"
  container: "24px"
  stack-lg: "48px"
  band: "5.5rem"
components:
  button-honor:
    backgroundColor: "{colors.oro-honor}"
    textColor: "{colors.tinta}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.85rem 1.5rem"
  button-honor-hover:
    backgroundColor: "{colors.oro-lift}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "0.85rem 1.5rem"
  button-ghost-ink:
    backgroundColor: "transparent"
    textColor: "{colors.tiza}"
    rounded: "{rounded.md}"
    padding: "0.85rem 1.5rem"
  button-portal:
    backgroundColor: "{colors.navy-kennedy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-portal-hover:
    backgroundColor: "{colors.navy-kennedy-hover}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.lg}"
    height: "32px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  chip-seal:
    backgroundColor: "{colors.oro-honor}"
    textColor: "{colors.navy-kennedy}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
    height: "20px"
  nav-item-active:
    backgroundColor: "{colors.oro-honor}"
    textColor: "{colors.navy-kennedy}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  topbar:
    backgroundColor: "{colors.navy-kennedy}"
    textColor: "{colors.on-navy}"
    height: "64px"
---

# Design System: IJFK — Sistema Institucional

## Overview

**Creative North Star: "Ocho Bloques"**

El colegio se lee como una jornada: hora, bloque, recreo, taller, salida. La landing pública ya lo hace — columna de horas en monoespaciada, timbre dorado que baja por la página, el horario de un martes como héroe. Toda superficie nueva debe aprender esa gramática. Un dashboard de tarjetas flotantes sin hora ni bloque es una recaída en producto genérico.

La marca pública es la landing (tinta, Bricolage Grotesque, Karla, IBM Plex Mono, oro de honor). El portal autenticado — Geist, papel `#F8FAFC`, chrome navy compacto de shadcn — es el sistema **operativo hoy**, no la autoridad de marca. El trabajo nuevo del portal converge hacia la landing: más display, más jornada, más ceremonial. No se exporta la densidad Geist/shadcn hacia `/`.

Profundidad **levantada**: las superficies flotan; el CTA dorado sube al hover (`translateY(-2px)`). Componentes **ceremoniales y táctiles**: el oro es sello, el escudo está presente, un botón primario parece acto del colegio, no un control de herramienta.

**Key Characteristics:**

- Jornada como estructura (hora + bloque), no grid de KPIs anónimo.
- Navy Kennedy + Oro de Honor: el oro es raro y significa actuar o lograr.
- Display grotesk apretado sobre tinta o papel; labels en mono con tracking amplio.
- Escudo institucional (`/Image/logo.jpg`) como marca; jamás el globo de Next ni un birrete genérico si el escudo cabe.
- Portal light-mode únicamente en lo enviado (existen tokens `.dark` sin uso).

## Colors

Paleta de colegio industrial peruano: tinta de patio, oro de honor, papel de secretaría. El verde vid y la arena aparecen como materias del día (taller, tierra), no como marca.

### Primary

- **Navy Kennedy**: chrome del portal (top bar, sidebar, botón primario compacto), bandas de portal en la landing, texto sobre oro. Es el color del edificio.
- **Tinta / Tinta alta**: campo de la landing y el footer. Más oscura que Navy Kennedy; es de noche en el patio, no el aula iluminada.
- **Navy deep**: segundo paso del gradiente del sidebar y series de gráfico. Nunca sustituye a Navy Kennedy como marca.

### Secondary

- **Oro de Honor**: timbre, hora, CTA de admisión, ítem activo del menú, anillo de foco, acento del display. Su rareza es el punto.
- **Oro lift**: hover del CTA ceremonial (un paso más claro, no un wash).
- **Arena**: banda de talleres en la landing; el colegio suena a Chincha, no a un acento pastel.

### Tertiary

- **Vid**: vivo, puntual (eyebrow «matrícula», punto de estado). No pinta superficies enteras.
- **Success / warning / error**: semántica de asistencia y formularios (Material 3). No reemplazan los sellos SIAGIE.

### Neutral

- **Tiza**: texto sobre tinta.
- **Chalk blue / hour mute**: cuerpo y horas secundarias sobre tinta.
- **Paper / ink / card / muted / border**: canvas del portal (secretaría de día).
- **Surface / surface-low**: autenticación (Material 3, papel azulado).
- **Línea**: separadores sobre tinta.

### Named Rules

**The Honor Gold Rule.** El oro pinta lo que hay que hacer o lo ya logrado: CTA, hora, nav activo, sello. Nunca un fondo de página, nunca una serie más en un gráfico de cinco colores.

**The Landing Leads Rule.** Los hex de la landing (tinta, tiza, arena, vid, línea) son marca. Los tokens Geist/shadcn del portal son deuda de convergencia, no paleta a extender.

## Typography

**Display Font:** Bricolage Grotesque (system-ui)
**Body Font:** Karla (system-ui)
**Label/Mono Font:** IBM Plex Mono (ui-monospace)

**Character:** Display apretado, casi militar de patio, con el dorado en una sola línea del título. Cuerpo humano, de circular a las familias. Mono para lo que en el colegio es reloj, código o rótulo de pasillo.

El portal enviado usa Geist Sans/Mono en `app/layout.tsx`. Eso no se copia a superficies nuevas ni a la landing. Convergencia: Bricolage + Karla + Plex, no un cuarto sans.

### Hierarchy

- **Display** (700, clamp 2.5–4.6rem, line-height 0.98): héroes y promesas de jornada. Una línea puede ir en Oro de Honor.
- **Headline** (700, clamp 1.6–2.35rem, line-height 1.08): rúbricas de sección («Tres niveles, un solo campus»).
- **Title** (700, 1.3rem): nombres de nivel, títulos de card que merecen voz de colegio.
- **Body** (400, 1rem / 1.6, max ~34–42rem en lectura larga): Karla. En portal compacto el cuerpo enviado es 14px Geist; no es el modelo a crecer.
- **Label** (400, 0.72–0.75rem, tracking 0.08–0.12em, uppercase): horas, siglas, «Martes · 4.º secundaria», pies legales.

### Named Rules

**The Clock Label Rule.** Toda hora, código de matrícula y rótulo de jornada va en IBM Plex Mono. Un `14px` sans para las 07:20 es un error de sistema.

## Layout

La landing es una **rejilla de jornada**: gutter de 7.5rem (hora + spine) + contenido, `max-width: 74rem`, padding de banda `5.5rem 1.5rem`. El spine dorado (2px) cae por el gutter; en viewport ≤44rem el gutter se apila y el spine pasa a borde izquierdo.

El portal es **chrome institucional + papel**: top bar fija 64px Navy Kennedy, sidebar 256px (colapsada 80px) con gradiente Navy Kennedy → Navy deep, contenido `p-6 lg:p-8` sobre Paper. Breakpoint de chrome: `lg` (1024px). Ritmo de espacio: 8 / 12 / 16 / 24 / 48px.

Pantallas nuevas del portal deben ganar un eje de jornada (hora, bimestre, bloque del día) antes de ganar otra card de KPI. No se inventa un tercer layout (p. ej. sidebar clara o top bar blanca): el chrome es navy, el trabajo es papel.

Auth es un caso aparte: split 50/50 en `lg`, panel izquierdo `primary-container` + foto + escudo, derecha `surface-low` con tarjeta 16px.

## Elevation & Depth

Filosofía confirmada: **levantado**. Las superficies flotan; el acto primario se despega del plano.

Incumbente mixto, a converger: landing casi plana sobre tinta (la profundidad es el campo, no la sombra); portal con `ring-1` suave más sombra larga y pálida en cards; top bar con vidrio navy (`backdrop-blur`, `bg-primary/90`); modal `shadow-2xl` sobre overlay 50%.

### Shadow Vocabulary

- **Card lift** (`0 1px 2px rgba(17,28,44,0.04), 0 8px 24px -16px rgba(17,28,44,0.12)`): tarjetas del panel padre. Modelo a extender, no a aplanar.
- **Topbar glass** (`inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 24px -16px rgba(15,23,42,0.45)`): chrome superior. Un solo tono navy; no saturar el blur (ensucia a oliva).
- **Honor lift**: el CTA dorado no gana sombra extra; **sube** `translateY(-2px)` en 180ms. Eso es el gesto ceremonial.
- **Modal** (`shadow-2xl` + overlay `#000` 50%): única pieza que puede sentirse «encima de todo».

### Named Rules

**The Lifted Honor Rule.** El botón que importa se eleva. Hover de CTA = translateY(−2px) y oro más claro. No se «enciende» un fill navy como único feedback de un acto ceremonial.

## Shapes

Radios suaves de colegio, no squircles de app: base `--radius: 0.625rem` (10px). Botones/inputs del portal 10px; cards 14px; auth 16px; landing CTA ~6–8px; chip de sigla IJFK 4px; talleres y badges SIAGIE en píldora (2rem / 4xl).

Bordes: sobre tinta, `1px` Línea; sobre papel, `border` slate o `ring-foreground/10`. El bloque de horario usa **barra izquierda de 3px** (oro al hover, oro fijo en taller, muda en recreo) — es la silueta distintiva de la jornada, no un card con sombra.

Escudo siempre **círculo** blanco que recorta `logo.jpg`. Avatares con ring de Oro de Honor.

## Components

Ceremonial y táctil: el control parece acto del colegio (sello, timbre, escudo), no chrome de SaaS. El portal compacto (h-8) es el estado enviado; los primarios de marca siguen el CTA de la landing.

### Buttons

- **Shape:** landing ~8px; portal 10px (`rounded-lg`).
- **Honor (marca):** oro sobre tinta, 700, padding `0.85rem 1.5rem`. Hover: oro lift + sube 2px.
- **Ghost sobre tinta:** borde `1px #3a4780`, tiza; hover borde oro y velo oro 8%.
- **Portal default:** Navy Kennedy, blanco, alto 32px, padding estrecho. Hover: navy-kennedy-hover. Foco: anillo Oro de Honor 3px a 50%.
- **Ghost / outline portal:** muted fill al hover; no competir con Honor.
- **Destructive:** texto rojo sobre tint, no un bloque rojo sólido.

### Chips

- **Sigla IJFK:** oro, tinta, radio 4px, padding mínimo — marca, no filtro.
- **Talleres:** píldora, borde arena; el taller fuerte se invierte a tinta sobre arena.
- **Sellos SIAGIE (AD/A/B/C):** píldora, bold, sin borde. AD esmeralda, A azul, B ámbar, C rojo. Son el nivel de logro, no tags de UI. No existe una quinta letra. No se usa A–D.

### Cards / Containers

- **Corner:** 14px portal; ~10px la tarjeta-jornada sobre tinta.
- **Background:** blanco + ring en portal; tinta-alta + borde Línea en la jornada.
- **Shadow:** Card lift en portal; nada de drop-shadow en la jornada (el campo ya es profundo).
- **Internal padding:** 16px portal; 1.25rem jornada.

### Inputs / Fields

- **Style:** alto 32px, radio 10px, borde `input`, fondo transparente.
- **Focus:** borde + anillo Oro de Honor (igual que el timbre).
- **Error:** borde destructive y anillo rojo 20%.
- **Auth:** icono 20px a la izquierda, tokens `on-surface` / `outline` (Material 3), no el input compacto del dashboard.

### Navigation

- **Landing:** links chalk-blue, underline oro al hover, foco oro 2px offset 3px.
- **Portal top bar:** 64px Navy Kennedy / 90% + blur, marca a la izquierda (escudo circular + «Colegio IJFK»), avisos a la derecha.
- **Sidebar:** gradiente navy, ítem activo **relleno oro / texto navy** (sello), inactivo blanco 80% / hover blanco 10%. Ancho 256 / 80. Overlay móvil negro 50%.
- **Auth nav:** no hay; el aside es escudo + nombre del colegio en tres líneas (COLEGIO INDUSTRIAL / JOHN F. KENNEDY / CHINCHA).

### Signature: Jornada (horario-bloque)

La pieza que define el sistema. Columna de hora en Plex, nombre del bloque, nota opcional. Recreo se apaga; taller se enciende con velo oro. Al hover, barra izquierda oro. En carga, los bloques entran de izquierda (`entraBloque`, delay en cascada). Reproducir esta silueta — no un table genérico — cuando se muestre un día escolar.

### Signature: Sello de nivel

`LevelBadge`: AD / A / B / C como sello de color (RGB de libreta en `lib/grades/scale.ts`). Ausencia = raya muda, no chip gris de «N/A» llamativo.

## Do's and Don'ts

### Do:

- **Do** estructurar superficies nuevas como jornada (hora, bloque, pausa) antes que como grid de métricas.
- **Do** usar Bricolage Grotesque + Karla + IBM Plex Mono en trabajo de marca y en convergencia del portal.
- **Do** reservar Oro de Honor para CTA, hora, nav activo y sellos de logro.
- **Do** elevar el acto primario (`translateY(-2px)`) y respetar `prefers-reduced-motion`.
- **Do** mostrar el escudo en círculo blanco cuando hay chrome institucional.
- **Do** pintar SIAGIE con AD/A/B/C y los colores de sello ya definidos.

### Don't:

- **Don't** tratar Geist + shadcn compacto como identidad a expandir; es el portal de hoy, no la marca.
- **Don't** lavar una pantalla en oro o en vid.
- **Don't** sustituir el escudo por `next.svg`, birretes Lucide o wordmarks en inglés.
- **Don't** usar la escala A–D de copy viejo, ni promediar competencias en un chip único «de área».
- **Don't** saturar el `backdrop-filter` de la top bar (aparece oliva).
- **Don't** activar el tema `.dark` como producto: los tokens existen, la UI enviada es light.
- **Don't** citar teléfono, dirección o «Matrícula 2027» de la landing como hechos; son placeholders de copy.
