/**
 * Landing pública — Colegio John F. Kennedy (IJFK), Chincha Alta, Ica
 * =============================================================================
 * Ruta `/`. Server Component: si el visitante ya tiene sesión válida, lo manda
 * directo a su panel (admin / docente / padre); si no, muestra la landing.
 *
 * El concepto visual está documentado en `app/landing.module.css`.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Karla, IBM_Plex_Mono } from "next/font/google";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import styles from "./landing.module.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-display",
});

const body = Karla({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-landing",
});

export const metadata: Metadata = {
  title: "Colegio John F. Kennedy — Chincha Alta, Ica",
  description:
    "Inicial, primaria y secundaria en Chincha Alta. Matrícula 2027 abierta: agenda una visita al colegio.",
};

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  docente: "/teacher",
  padre: "/father",
};

/** Bloques de una jornada real de secundaria. */
const JORNADA = [
  { hora: "07:20", nombre: "Formación en el patio", nota: "Toma de asistencia" },
  { hora: "07:35", nombre: "Comunicación", nota: "Dos horas seguidas" },
  { hora: "09:15", nombre: "Matemática" },
  { hora: "10:00", nombre: "Recreo", tipo: "recreo" as const },
  { hora: "10:20", nombre: "Ciencia y Tecnología", nota: "Laboratorio" },
  { hora: "11:50", nombre: "Taller: cajón y zapateo", tipo: "taller" as const },
  { hora: "12:40", nombre: "Educación Física" },
  { hora: "13:20", nombre: "Salida", nota: "Refuerzo hasta las 15:00" },
];

const NIVELES = [
  {
    edad: "3 a 5 años",
    nombre: "Inicial",
    texto:
      "Juego, lenguaje y las primeras letras. Aulas de 20 niños con una docente y una auxiliar.",
  },
  {
    edad: "1.º a 6.º grado",
    nombre: "Primaria",
    texto:
      "Lectura, matemática y ciencias. La familia ve cada nota con su letra (A a D) el mismo día.",
  },
  {
    edad: "1.º a 5.º año",
    nombre: "Secundaria",
    texto:
      "Laboratorios, talleres y orientación vocacional desde 3.º para elegir carrera con tiempo.",
  },
];

const TALLERES = [
  { nombre: "Cajón y zapateo afroperuano", fuerte: true },
  { nombre: "Banda de música" },
  { nombre: "Vóley" },
  { nombre: "Fútbol" },
  { nombre: "Robótica" },
  { nombre: "Ajedrez" },
  { nombre: "Huerto escolar" },
  { nombre: "Teatro" },
];

const PASOS = [
  {
    num: "01",
    titulo: "Agende su visita",
    texto:
      "Recorra las aulas en horario de clase y converse con la dirección. Dura una hora.",
  },
  {
    num: "02",
    titulo: "Entregue los documentos",
    texto:
      "DNI del estudiante, libreta del año anterior y ficha única de matrícula.",
  },
  {
    num: "03",
    titulo: "Asista a la entrevista",
    texto:
      "Cuarenta minutos con tutoría y psicología, junto al estudiante.",
  },
  {
    num: "04",
    titulo: "Complete la matrícula",
    texto:
      "Reserve la vacante y reciba el acceso de la familia al portal del colegio.",
  },
];

export default async function HomePage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    const session = verifySession(token);
    const home = session ? ROLE_HOME[session.role] : undefined;
    if (home) redirect(home);
  }

  return (
    <main
      className={`${styles.page} ${display.variable} ${body.variable} ${mono.variable}`}
    >
      {/* ------------------------------------------------------------- barra */}
      <header className={styles.band}>
        <div className={styles.topbar}>
          <div className={styles.marca}>
            <span className={styles.marcaSigla}>IJFK</span>
            <span>Colegio John F. Kennedy</span>
            <span className={styles.marcaLugar}>Chincha Alta · Ica</span>
          </div>
          <nav className={styles.navLinks} aria-label="Secciones">
            <a className={styles.navLink} href="#niveles">
              Niveles
            </a>
            <a className={styles.navLink} href="#talleres">
              Talleres
            </a>
            <a className={styles.navLink} href="#admision">
              Admisión
            </a>
            <Link className={styles.navLink} href="/login">
              Portal
            </Link>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------- héroe */}
      <section className={styles.band}>
        <div className={`${styles.row} ${styles.rowHero}`}>
          <div className={styles.gutter} aria-hidden="true">
            <span className={styles.hora}>07:20</span>
            Formación
          </div>

          <div className={styles.heroGrid}>
            <div>
              <p className={styles.eyebrow}>
                <span className={styles.punto} />
                Matrícula 2027 abierta
              </p>
              <h1 className={styles.titulo}>
                Un día en el Kennedy
                <br />
                <span className={styles.tituloAcento}>tiene ocho bloques.</span>
                <br />
                Mírelos uno por uno.
              </h1>
              <p className={styles.entrada}>
                Inicial, primaria y secundaria en Chincha Alta. Aquí está el
                horario completo de un martes cualquiera en 4.º de secundaria:
                lo que su hijo estudia, cuándo descansa y a qué hora sale.
              </p>
              <div className={styles.acciones}>
                <a
                  className={styles.btnPrimario}
                  href="mailto:informes@ijfk.edu.pe?subject=Visita%20al%20colegio%20-%20Admisi%C3%B3n%202027"
                >
                  Agendar una visita
                </a>
                <Link className={styles.btnSecundario} href="/login">
                  Ingresar al portal
                </Link>
              </div>
            </div>

            {/* firma: el horario que se completa bloque por bloque */}
            <div className={styles.jornada}>
              <p className={styles.jornadaTitulo}>
                <span>Martes · 4.º secundaria</span>
                <span>Aula B-201</span>
              </p>
              {JORNADA.map((b) => (
                <div
                  key={b.hora}
                  className={[
                    styles.bloque,
                    b.tipo === "recreo" ? styles.bloqueRecreo : "",
                    b.tipo === "taller" ? styles.bloqueTaller : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className={styles.bloqueHora}>{b.hora}</span>
                  <span className={styles.bloqueNombre}>
                    {b.nombre}
                    {b.nota ? (
                      <span className={styles.bloqueNota}>{b.nota}</span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ niveles */}
      <section className={styles.band} id="niveles">
        <div className={styles.row}>
          <div className={styles.gutter} aria-hidden="true">
            <span className={styles.hora}>07:35</span>
            Primera hora
          </div>
          <div>
            <h2 className={styles.rubro}>Tres niveles, un solo campus</h2>
            <p className={styles.bajada}>
              Su hijo pasa de inicial a secundaria sin cambiar de colegio ni de
              compañeros. Los mismos tutores lo acompañan de un nivel al
              siguiente.
            </p>
            <div className={styles.niveles}>
              {NIVELES.map((n) => (
                <article key={n.nombre} className={styles.nivel}>
                  <p className={styles.nivelEdad}>{n.edad}</p>
                  <h3 className={styles.nivelNombre}>{n.nombre}</h3>
                  <p className={styles.nivelTexto}>{n.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- talleres */}
      <section
        className={`${styles.band} ${styles.bandArena}`}
        id="talleres"
      >
        <div className={styles.row}>
          <div
            className={`${styles.gutter} ${styles.horaArena}`}
            aria-hidden="true"
          >
            <span className={`${styles.hora} ${styles.horaArena}`}>11:50</span>
            Talleres
          </div>
          <div>
            <h2 className={styles.rubro}>
              A media mañana el colegio suena a Chincha
            </h2>
            <p className={styles.bajadaArena}>
              El taller de cajón y zapateo es parte del horario, no una
              actividad extra. Lo dictan músicos de El Carmen y todos los grados
              pasan por él.
            </p>
            <div className={styles.talleres}>
              {TALLERES.map((t) => (
                <span
                  key={t.nombre}
                  className={[
                    styles.taller,
                    t.fuerte ? styles.tallerFuerte : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {t.nombre}
                </span>
              ))}
            </div>
            <p className={styles.notaArena}>
              Cada estudiante elige dos talleres al año. Las presentaciones son
              en julio y en diciembre, y las familias están invitadas.
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- admisión */}
      <section className={styles.band} id="admision">
        <div className={styles.row}>
          <div className={styles.gutter} aria-hidden="true">
            <span className={styles.hora}>13:20</span>
            Salida
          </div>
          <div>
            <h2 className={styles.rubro}>Matrícula 2027, en cuatro pasos</h2>
            <p className={styles.bajada}>
              Las vacantes se asignan en orden de entrevista. Empiece por la
              visita: es el paso que decide todo lo demás.
            </p>
            <div className={styles.pasos}>
              {PASOS.map((p) => (
                <article key={p.num} className={styles.paso}>
                  <p className={styles.pasoNum}>{p.num}</p>
                  <h3 className={styles.pasoTitulo}>{p.titulo}</h3>
                  <p className={styles.pasoTexto}>{p.texto}</p>
                </article>
              ))}
            </div>
            <div className={styles.cierre}>
              <a
                className={styles.btnPrimario}
                href="mailto:informes@ijfk.edu.pe?subject=Visita%20al%20colegio%20-%20Admisi%C3%B3n%202027"
              >
                Escribir a admisión
              </a>
              <p className={styles.cierreTexto}>
                Las visitas son de lunes a viernes, de 8:00 a 12:00. También
                puede llamar al (056) 000 000.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- portal */}
      <section className={`${styles.band} ${styles.bandAzul}`}>
        <div className={styles.row}>
          <div className={styles.gutter} aria-hidden="true">
            <span className={styles.hora}>18:40</span>
            En casa
          </div>
          <div className={styles.portalGrid}>
            <div>
              <h2 className={styles.rubro}>
                Por la noche, el colegio sigue abierto
              </h2>
              <p className={styles.bajada}>
                Cada familia matriculada entra al portal con su correo. Los
                docentes registran ahí mismo lo que pasó en el día, así que no
                hay que esperar a la libreta.
              </p>
              <Link className={styles.btnPrimario} href="/login">
                Ingresar al portal
              </Link>
            </div>
            <ul className={styles.lista}>
              <li className={styles.listaItem}>
                <span className={styles.listaMarca}>A–D</span>
                <span>
                  Las notas de cada curso con su letra, apenas el docente las
                  registra.
                </span>
              </li>
              <li className={styles.listaItem}>
                <span className={styles.listaMarca}>✓</span>
                <span>
                  La asistencia del día y el estado de cada justificación.
                </span>
              </li>
              <li className={styles.listaItem}>
                <span className={styles.listaMarca}>◆</span>
                <span>
                  Los comunicados de dirección y de tutoría, sin grupos de
                  WhatsApp.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- footer */}
      <footer className={styles.footer}>
        <div className={styles.row}>
          <div className={styles.gutter} aria-hidden="true">
            <span className={styles.hora}>22:00</span>
            Hasta mañana
          </div>
          <div className={styles.footerGrid}>
            <div>
              <p className={styles.footerRotulo}>Dirección</p>
              <p className={styles.footerTexto}>
                Av. Los Libertadores 000
                <br />
                Chincha Alta, Ica
              </p>
            </div>
            <div>
              <p className={styles.footerRotulo}>Contacto</p>
              <p className={styles.footerTexto}>
                <a
                  className={styles.footerEnlace}
                  href="mailto:informes@ijfk.edu.pe"
                >
                  informes@ijfk.edu.pe
                </a>
                <br />
                (056) 000 000
              </p>
            </div>
            <div>
              <p className={styles.footerRotulo}>Atención</p>
              <p className={styles.footerTexto}>
                Lunes a viernes
                <br />
                7:20 a 15:00
              </p>
            </div>
          </div>
        </div>
        <p className={styles.legal}>
          Colegio John F. Kennedy · Chincha Alta, Ica · Perú
        </p>
      </footer>
    </main>
  );
}
