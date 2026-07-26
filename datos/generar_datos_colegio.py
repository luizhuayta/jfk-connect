#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de datos sinteticos para integracion de base de datos escolar (Peru).

ESTRUCTURA ASUMIDA:
- Niveles: Primaria y Secundaria
- Grados: 1ro a 5to en cada nivel  -> 10 "grados" en total
- Secciones por grado: A hasta M (13 secciones)
    * Secciones A-F  -> turno MAÑANA
    * Secciones G-M  -> turno TARDE
- Alumnos por seccion: aleatorio entre 35 y 40
- Total de secciones = 10 grados x 13 secciones = 130 secciones
- Total de profesores = 130 (uno por seccion como tutor, mas
  reasignados como docentes de curso en la tabla de asignaciones)
- Cursos: 10 cursos tipicos de la curricula peruana (EBR)

SALIDA (todo en /mnt/user-data/outputs/):
    - alumnos.csv
    - profesores.csv
    - secciones.csv
    - cursos.csv
    - asignaciones.csv   (profesor <-> curso <-> seccion)

Todas las tablas usan IDs enteros correlativos para poder
relacionarlas directamente en una base de datos relacional
(alumnos.id_seccion -> secciones.id, asignaciones.id_profesor ->
profesores.id, etc.)
"""

import csv
import random
from datetime import date, timedelta

# ------------------------------------------------------------------
# CONFIGURACION
# ------------------------------------------------------------------
SEED = 2026  # cambiar o comentar para resultados distintos cada corrida
if SEED is not None:
    random.seed(SEED)

OUTPUT_DIR = "/mnt/user-data/outputs"

NIVELES = ["Primaria", "Secundaria"]
GRADOS = [1, 2, 3, 4, 5]
SECCIONES_MANANA = list("ABCDEF")        # A-F
SECCIONES_TARDE = list("GHIJKLM")        # G-M
SECCIONES_TODAS = SECCIONES_MANANA + SECCIONES_TARDE

MIN_ALUMNOS_POR_SECCION = 20
MAX_ALUMNOS_POR_SECCION = 40  # nunca debe pasar de 40

TOTAL_PADRES = 3200
# probabilidad de que un padre tenga 1, 2 o 3 hijos matriculados
PROB_HIJOS = [(1, 0.60), (2, 0.30), (3, 0.10)]
MAX_HIJOS_POR_PADRE = 3

OCUPACIONES = [
    "Comerciante", "Chofer", "Docente", "Enfermero(a)", "Obrero de construccion",
    "Empleado publico", "Independiente", "Agricultor", "Comerciante ambulante",
    "Tecnico electricista", "Cocinero(a)", "Ama de casa", "Vendedor(a)",
    "Contador(a)", "Policia", "Personal de seguridad", "Mecanico",
    "Administrador(a)", "Enfermero tecnico", "Empresario(a)",
]

CURSOS = [
    "Matematica",
    "Comunicacion",
    "Comprension Lectora",
    "Educacion Fisica",
    "Taller",
    "Ciencia y Tecnologia (CTA)",
    "Educacion Civica",
    "Educacion Religiosa",
    "Arte y Cultura",
    "Ingles",
]

# ------------------------------------------------------------------
# NOMBRES PERUANOS (listas base para combinar aleatoriamente)
# ------------------------------------------------------------------
NOMBRES_M = [
    "Jose", "Luis", "Carlos", "Juan", "Miguel", "Jorge", "Cesar", "Victor",
    "Ricardo", "Manuel", "Pedro", "Alberto", "Raul", "Fernando", "Diego",
    "Sebastian", "Mateo", "Adrian", "Gonzalo", "Rodrigo", "Andres", "Alexis",
    "Bryan", "Kevin", "Anthony", "Jhon", "Jhoel", "Piero", "Renzo", "Franco",
    "Nicolas", "Gabriel", "Emilio", "Martin", "Oscar", "Hugo", "Julio",
    "Walter", "Elmer", "Wilson", "Edgar", "Alexander", "Angel", "Cristian",
    "Marco", "Gustavo", "Ivan", "Erick", "Yamil", "Aaron", "Benjamin",
    "Dylan", "Thiago", "Joaquin", "Leonardo", "Samuel", "Fabricio", "Ian",
]

NOMBRES_F = [
    "Maria", "Rosa", "Carmen", "Ana", "Luz", "Julia", "Milagros", "Fiorella",
    "Gabriela", "Diana", "Karen", "Katherine", "Lucia", "Valentina", "Camila",
    "Sofia", "Antonella", "Alexandra", "Yolanda", "Patricia", "Isabel",
    "Elena", "Susan", "Yesenia", "Yesica", "Ruth", "Flor", "Estefany",
    "Katty", "Jhoana", "Brenda", "Melissa", "Vanessa", "Pilar", "Teresa",
    "Ximena", "Mia", "Rafaella", "Ariana", "Nicole", "Paula", "Daniela",
    "Alessandra", "Zoe", "Britany", "Grecia", "Kiara", "Ashley", "Nayeli",
    "Xiomara", "Emily", "Danna", "Luana", "Abigail", "Renata", "Dulce",
]

APELLIDOS = [
    "Quispe", "Mamani", "Huaman", "Flores", "Rojas", "Garcia", "Rodriguez",
    "Gonzales", "Torres", "Vasquez", "Ramos", "Sanchez", "Cruz", "Vargas",
    "Chavez", "Gutierrez", "Reyes", "Diaz", "Castillo", "Romero", "Mendoza",
    "Ruiz", "Aguilar", "Alvarez", "Herrera", "Medina", "Salazar", "Cardenas",
    "Espinoza", "Rivera", "Guzman", "Delgado", "Paredes", "Fernandez",
    "Ortiz", "Silva", "Nunez", "Palacios", "Carrillo", "Campos", "Vega",
    "Huaraca", "Ccahuana", "Condori", "Choque", "Yupanqui", "Apaza",
    "Ticona", "Machaca", "Cutipa", "Paucar", "Rimac", "Ochoa", "Zavala",
    "Bravo", "Cabrera", "Leon", "Soto", "Marin", "Alarcon", "Espinoza",
    "Villanueva", "Pacheco", "Aquino", "Lazo", "Bautista", "Cornejo",
    "Salvador", "Farfan", "Cabanillas", "Ibarra", "Vilca", "Yataco",
]

DIAS_SEMANA_CURSO = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"]

# ------------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------------
_dni_usados = set()


def generar_dni():
    while True:
        dni = random.randint(10_000_000, 79_999_999)
        if dni not in _dni_usados:
            _dni_usados.add(dni)
            return str(dni)


def generar_nombre_completo():
    sexo = random.choice(["M", "F"])
    nombre = random.choice(NOMBRES_M if sexo == "M" else NOMBRES_F)
    # Peru: comunmente dos nombres
    segundo_nombre = random.choice(NOMBRES_M if sexo == "M" else NOMBRES_F)
    apellido_paterno = random.choice(APELLIDOS)
    apellido_materno = random.choice(APELLIDOS)
    return nombre, segundo_nombre, apellido_paterno, apellido_materno, sexo


def fecha_nacimiento_para_grado(nivel, grado):
    # Edad tipica: Primaria 1ro ~ 6 anios ... Secundaria 5to ~ 16 anios
    if nivel == "Primaria":
        edad_base = 5 + grado  # 1ro=6, 2do=7, ... 5to=10
    else:
        edad_base = 10 + grado  # 1ro=11, ... 5to=15/16
    anio_actual = 2026
    anio_nacimiento = anio_actual - edad_base
    inicio = date(anio_nacimiento, 1, 1)
    dias_random = random.randint(0, 364)
    return inicio + timedelta(days=dias_random)


def fecha_ingreso_docente():
    inicio = date(2010, 3, 1)
    fin = date(2025, 3, 1)
    delta_dias = (fin - inicio).days
    return inicio + timedelta(days=random.randint(0, delta_dias))


def telefono_peru():
    return "9" + "".join(str(random.randint(0, 9)) for _ in range(8))


def email_desde_nombre(nombre, apellido, dominio="colegio.edu.pe"):
    base = f"{nombre}.{apellido}".lower()
    base = (base.replace("a", "a").encode("ascii", "ignore").decode())
    return f"{base}{random.randint(1,999)}@{dominio}"


# ------------------------------------------------------------------
# 1) SECCIONES
# ------------------------------------------------------------------
secciones = []
sec_id = 1
for nivel in NIVELES:
    for grado in GRADOS:
        for letra in SECCIONES_TODAS:
            turno = "Mañana" if letra in SECCIONES_MANANA else "Tarde"
            capacidad = random.randint(MIN_ALUMNOS_POR_SECCION, MAX_ALUMNOS_POR_SECCION)
            secciones.append({
                "id": sec_id,
                "nivel": nivel,
                "grado": grado,
                "letra": letra,
                "nombre_seccion": f"{grado}° {letra} - {nivel}",
                "turno": turno,
                "capacidad_alumnos": capacidad,
            })
            sec_id += 1

TOTAL_SECCIONES = len(secciones)  # deberia ser 130

# ------------------------------------------------------------------
# 2) CURSOS
# ------------------------------------------------------------------
cursos = [{"id": i + 1, "nombre_curso": nombre} for i, nombre in enumerate(CURSOS)]

# ------------------------------------------------------------------
# 3) PROFESORES  (uno por seccion como tutor -> total = TOTAL_SECCIONES)
# ------------------------------------------------------------------
profesores = []
for i in range(TOTAL_SECCIONES):
    nombre, segundo_nombre, ap_pat, ap_mat, sexo = generar_nombre_completo()
    especialidad = random.choice(CURSOS)
    profesores.append({
        "id": i + 1,
        "dni": generar_dni(),
        "nombres": f"{nombre} {segundo_nombre}",
        "apellido_paterno": ap_pat,
        "apellido_materno": ap_mat,
        "sexo": sexo,
        "especialidad_principal": especialidad,
        "telefono": telefono_peru(),
        "email": email_desde_nombre(nombre, ap_pat),
        "fecha_ingreso": fecha_ingreso_docente().isoformat(),
        "condicion_laboral": random.choice(["Nombrado", "Contratado"]),
    })

TOTAL_PROFESORES = len(profesores)  # 130

# Asignamos un tutor de aula (1 profesor por seccion) a cada seccion
profesores_shuffle = profesores[:]
random.shuffle(profesores_shuffle)
for seccion, profesor in zip(secciones, profesores_shuffle):
    seccion["id_profesor_tutor"] = profesor["id"]

# ------------------------------------------------------------------
# 4) ASIGNACIONES (profesor <-> curso <-> seccion)
#    Cada seccion recibe los 10 cursos. Cada curso-seccion se dicta
#    por un profesor cuya especialidad coincide cuando es posible;
#    si no hay disponible, se asigna aleatoriamente.
# ------------------------------------------------------------------
profesores_por_curso = {c: [] for c in CURSOS}
for p in profesores:
    profesores_por_curso[p["especialidad_principal"]].append(p)

asignaciones = []
asig_id = 1
for seccion in secciones:
    for curso in cursos:
        pool = profesores_por_curso[curso["nombre_curso"]]
        profesor = random.choice(pool) if pool else random.choice(profesores)
        asignaciones.append({
            "id": asig_id,
            "id_seccion": seccion["id"],
            "id_curso": curso["id"],
            "id_profesor": profesor["id"],
            "horas_semanales": random.choice([2, 3, 4, 5]),
            "dia_principal": random.choice(DIAS_SEMANA_CURSO),
        })
        asig_id += 1

# ------------------------------------------------------------------
# 5) ALUMNOS
# ------------------------------------------------------------------
alumnos = []
alumno_id = 1
for seccion in secciones:
    n_alumnos = seccion["capacidad_alumnos"]
    for _ in range(n_alumnos):
        nombre, segundo_nombre, ap_pat, ap_mat, sexo = generar_nombre_completo()
        alumnos.append({
            "id": alumno_id,
            "dni": generar_dni(),
            "nombres": f"{nombre} {segundo_nombre}",
            "apellido_paterno": ap_pat,
            "apellido_materno": ap_mat,
            "sexo": sexo,
            "fecha_nacimiento": fecha_nacimiento_para_grado(seccion["nivel"], seccion["grado"]).isoformat(),
            "nivel": seccion["nivel"],
            "grado": seccion["grado"],
            "seccion": seccion["letra"],
            "turno": seccion["turno"],
            "id_seccion": seccion["id"],
        })
        alumno_id += 1

TOTAL_ALUMNOS = len(alumnos)

# ------------------------------------------------------------------
# 6) PADRES / APODERADOS  y relacion padre-hijo
#    Un padre puede tener 1, 2 o 3 hijos matriculados (hermanos),
#    que pueden estar en grados, secciones y turnos distintos.
# ------------------------------------------------------------------
padres = []
for i in range(TOTAL_PADRES):
    nombre, segundo_nombre, ap_pat, ap_mat, sexo = generar_nombre_completo()
    padres.append({
        "id": i + 1,
        "dni": generar_dni(),
        "nombres": f"{nombre} {segundo_nombre}",
        "apellido_paterno": ap_pat,
        "apellido_materno": ap_mat,
        "sexo": sexo,
        "telefono": telefono_peru(),
        "email": email_desde_nombre(nombre, ap_pat, dominio="gmail.com"),
        "ocupacion": random.choice(OCUPACIONES),
    })

# Barajamos alumnos para que los hermanos asignados a un mismo padre
# queden distribuidos entre distintas secciones/grados/turnos.
alumnos_shuffled = alumnos[:]
random.shuffle(alumnos_shuffled)

# Paso 1: cada padre recibe garantizado 1 hijo (mientras alcancen alumnos)
cursor = 0
padre_a_hijos = {p["id"]: [] for p in padres}
for padre in padres:
    if cursor >= TOTAL_ALUMNOS:
        break
    padre_a_hijos[padre["id"]].append(alumnos_shuffled[cursor])
    cursor += 1

# Paso 2: alumnos restantes se reparten como hermanos adicionales
# (2do o 3er hijo) entre padres que aun no llegaron al maximo permitido
padres_disponibles = [p["id"] for p in padres if len(padre_a_hijos[p["id"]]) < MAX_HIJOS_POR_PADRE]
while cursor < TOTAL_ALUMNOS and padres_disponibles:
    id_padre = random.choice(padres_disponibles)
    padre_a_hijos[id_padre].append(alumnos_shuffled[cursor])
    cursor += 1
    if len(padre_a_hijos[id_padre]) >= MAX_HIJOS_POR_PADRE:
        padres_disponibles.remove(id_padre)
    if not padres_disponibles and cursor < TOTAL_ALUMNOS:
        # si ya todos llegaron al maximo pero sobran alumnos (caso raro),
        # se reabre el pool permitiendo superar levemente el maximo
        padres_disponibles = [p["id"] for p in padres]

# Escribimos la relacion final: cada alumno queda con su id_padre
# y el parentesco (Padre/Madre/Apoderado) segun el sexo del padre generado
alumno_id_to_row = {a["id"]: a for a in alumnos}
relaciones_padre_hijo = []
rel_id = 1
for padre in padres:
    hijos = padre_a_hijos[padre["id"]]
    for hijo in hijos:
        parentesco = "Madre" if padre["sexo"] == "F" else "Padre"
        alumno_id_to_row[hijo["id"]]["id_padre"] = padre["id"]
        alumno_id_to_row[hijo["id"]]["parentesco"] = parentesco
        relaciones_padre_hijo.append({
            "id": rel_id,
            "id_padre": padre["id"],
            "id_alumno": hijo["id"],
            "parentesco": parentesco,
        })
        rel_id += 1

# Alumnos sin padre asignado (no deberia pasar salvo bordes) reciben "Sin registrar"
for a in alumnos:
    if "id_padre" not in a:
        a["id_padre"] = ""
        a["parentesco"] = "Sin registrar"

# ------------------------------------------------------------------
# ESCRITURA DE ARCHIVOS CSV
# ------------------------------------------------------------------
import os
os.makedirs(OUTPUT_DIR, exist_ok=True)


def escribir_csv(nombre_archivo, filas, columnas):
    ruta = os.path.join(OUTPUT_DIR, nombre_archivo)
    with open(ruta, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columnas)
        writer.writeheader()
        writer.writerows(filas)
    print(f"  -> {ruta}  ({len(filas)} filas)")


print("Generando archivos CSV...")
escribir_csv("secciones.csv", secciones, [
    "id", "nivel", "grado", "letra", "nombre_seccion", "turno",
    "capacidad_alumnos", "id_profesor_tutor",
])
escribir_csv("cursos.csv", cursos, ["id", "nombre_curso"])
escribir_csv("profesores.csv", profesores, [
    "id", "dni", "nombres", "apellido_paterno", "apellido_materno", "sexo",
    "especialidad_principal", "telefono", "email", "fecha_ingreso",
    "condicion_laboral",
])
escribir_csv("asignaciones.csv", asignaciones, [
    "id", "id_seccion", "id_curso", "id_profesor", "horas_semanales",
    "dia_principal",
])
escribir_csv("alumnos.csv", alumnos, [
    "id", "dni", "nombres", "apellido_paterno", "apellido_materno", "sexo",
    "fecha_nacimiento", "nivel", "grado", "seccion", "turno", "id_seccion",
    "id_padre", "parentesco",
])
escribir_csv("padres.csv", padres, [
    "id", "dni", "nombres", "apellido_paterno", "apellido_materno", "sexo",
    "telefono", "email", "ocupacion",
])
escribir_csv("relacion_padres_alumnos.csv", relaciones_padre_hijo, [
    "id", "id_padre", "id_alumno", "parentesco",
])

# ------------------------------------------------------------------
# RESUMEN
# ------------------------------------------------------------------
print("\n===== RESUMEN =====")
print(f"Secciones totales : {TOTAL_SECCIONES}")
print(f"Profesores totales: {TOTAL_PROFESORES}")
print(f"Alumnos totales   : {TOTAL_ALUMNOS}")
print(f"Cursos totales    : {len(cursos)}")
print(f"Asignaciones (curso x seccion x profesor): {len(asignaciones)}")
print(f"Padres totales    : {TOTAL_PADRES}")
hijos_por_padre = [len(v) for v in padre_a_hijos.values()]
print(f"Padres con 1 hijo : {hijos_por_padre.count(1)}")
print(f"Padres con 2 hijos: {hijos_por_padre.count(2)}")
print(f"Padres con 3 hijos: {hijos_por_padre.count(3)}")
print(f"Padres sin hijo asignado: {hijos_por_padre.count(0)}")
