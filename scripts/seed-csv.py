import csv, hashlib, os, sys, subprocess
DATA = "datos"
P = {"p":"11111111","f":"22222222","a":"33333333","s":"44444444","asg":"66666666","rel":"77777777"}
def u(pre, n): return f"{pre}-0000-4000-8000-{str(n).zfill(12)}"
def hp(p): return hashlib.sha256(f"ijfk-salt-{p}".encode()).hexdigest()
def gi(n): return "".join(w[0].upper() for w in n.strip().split()[:2])
def rd(fn): return list(csv.DictReader(open(os.path.join(DATA,fn),encoding="utf-8")))
# psql via docker
def psql(sql):
    r = subprocess.run(["docker","compose","exec","-T","-e","PGPASSWORD=ijfk_dev_password","db","psql","-U","supabase_admin","-d","ijfk","-c",sql], capture_output=True, text=True)
    return r.stdout + r.stderr
print("?? Creando tablas...")
for t in [
"CREATE TABLE IF NOT EXISTS cursos (id INTEGER PRIMARY KEY, nombre_curso TEXT NOT NULL)",
"CREATE TABLE IF NOT EXISTS secciones (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), nivel TEXT NOT NULL, grado INT NOT NULL, letra TEXT NOT NULL, nombre_seccion TEXT, turno TEXT NOT NULL, capacidad_alumnos INT DEFAULT 30, id_profesor_tutor UUID, created_at TIMESTAMPTZ DEFAULT now())",
"CREATE TABLE IF NOT EXISTS alumnos (id UUID PRIMARY KEY, dni TEXT NOT NULL, nombres TEXT NOT NULL, apellido_paterno TEXT NOT NULL, apellido_materno TEXT NOT NULL, sexo TEXT, fecha_nacimiento DATE, nivel TEXT, grado INT, seccion TEXT, turno TEXT, id_seccion UUID, id_padre UUID, parentesco TEXT, status TEXT DEFAULT ''activo'', avg_grade NUMERIC DEFAULT 0, attendance_rate INT DEFAULT 100, created_at TIMESTAMPTZ DEFAULT now())",
"CREATE TABLE IF NOT EXISTS asignaciones (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), id_seccion UUID, id_curso INT, id_profesor UUID, horas_semanales INT, dia_principal TEXT, created_at TIMESTAMPTZ DEFAULT now())",
"CREATE TABLE IF NOT EXISTS relacion_padres_alumnos (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), id_padre UUID, id_alumno UUID, parentesco TEXT, created_at TIMESTAMPTZ DEFAULT now())"]:
 psql(t)
psql("TRUNCATE TABLE relacion_padres_alumnos, alumnos, asignaciones, secciones, cursos RESTART IDENTITY CASCADE")
psql("DELETE FROM users WHERE CAST(id AS text) LIKE ''11111111-%'' OR CAST(id AS text) LIKE ''22222222-%'' OR CAST(id AS text) LIKE ''33333333-%''")
print("?? Cursos (10)...")
psql("INSERT INTO cursos (id, nombre_curso) VALUES (1,''Matematica''),(2,''Comunicacion''),(3,''Comprension Lectora''),(4,''Educacion Fisica''),(5,''Taller''),(6,''Ciencia y Tecnologia (CTA)''),(7,''Educacion Civica''),(8,''Educacion Religiosa''),(9,''Arte y Cultura''),(10,''Ingles'')")
psql("SELECT setval(''cursos_id_seq'', 10)")
print("????? Profesores (130)...")
p_hash = hp("ijfk2026")
psql(f"INSERT INTO users (id, email, full_name, role, phone, is_active, password_hash, email_verified_at, must_change_password, avatar_url) SELECT ''{P["p"]}-0000-4000-8000-'' || LPAD(id::text,12,''0''), email, TRIM(CONCAT(nombres,'' '',apellido_paterno,'' '',apellido_materno)), ''docente'', telefono, true, ''{p_hash}'', now(), true, ''https://api.dicebear.com/7.x/initials/svg?seed='' || UPPER(LEFT(nombres,1)) || UPPER(LEFT(apellido_paterno,1)) FROM datos_profesores_import;")
print("?? Falló COPY directo. Probando alternativa con CSV temporal...")
