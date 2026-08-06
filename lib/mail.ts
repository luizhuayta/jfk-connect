/**
 * Cliente de correo para IJFK — SMTP (Gmail / cualquier proveedor)
 *
 * Usa nodemailer con SMTP estándar. Configurado por defecto para Gmail,
 * pero funciona con cualquier servidor SMTP cambiando las variables de entorno.
 *
 * Para Gmail necesitas una "contraseña de aplicación" (no tu contraseña normal):
 *   - Activa la verificación en 2 pasos de tu Gmail:
 *     https://myaccount.google.com/security → "Verificación en 2 pasos"
 *   - Crea una app password: https://myaccount.google.com/apppasswords
 *   - El MAIL_PASSWORD será esa clave de 16 caracteres.
 *
 * Variables de entorno:
 *   MAIL_HOST       (default smtp.gmail.com)
 *   MAIL_PORT       (default 587)
 *   MAIL_SECURE     ("true" para 465 SSL, "false" para 587 STARTTLS)
 *   MAIL_USER       (tu correo Gmail)
 *   MAIL_PASSWORD   (tu app password)
 *   MAIL_FROM       (correo remitente)
 *   MAIL_FROM_NAME  (nombre que se muestra)
 *
 * Uso:
 *   import { sendEmail } from "@/lib/mail";
 *   await sendEmail({
 *     to: "usuario@ejemplo.com",
 *     subject: "Bienvenido",
 *     html: "<h1>Hola</h1>",
 *   });
 */

import nodemailer, { Transporter } from "nodemailer";

const MAIL_HOST = process.env.MAIL_HOST ?? "smtp.gmail.com";
const MAIL_PORT = parseInt(process.env.MAIL_PORT ?? "587", 10);
const MAIL_SECURE = process.env.MAIL_SECURE === "true";
const MAIL_USER = process.env.MAIL_USER ?? "";
const MAIL_PASSWORD = process.env.MAIL_PASSWORD ?? "";
const MAIL_FROM = process.env.MAIL_FROM ?? "";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME ?? "IJFK Sistema Institucional";

let transporter: Transporter | null = null;

/**
 * Crea (o reutiliza) el transporter SMTP.
 * Devuelve null si falta la configuración necesaria.
 */
function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  if (!MAIL_HOST || !MAIL_USER || !MAIL_PASSWORD) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    secure: MAIL_SECURE, // true para 465, false para 587/STARTTLS
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASSWORD,
    },
    tls: {
      // Permitir certificados auto-firmados solo en dev
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });

  return transporter;
}

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename?: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
};

/**
 * Envía un email usando la configuración SMTP.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const t = getTransporter();
  if (!t) {
    return {
      success: false,
      error: "Configuración de SMTP incompleta (MAIL_USER/MAIL_PASSWORD/MAIL_HOST).",
    };
  }

  const fromName = options.fromName ?? MAIL_FROM_NAME;
  const fromAddr = options.from ?? MAIL_FROM;

  if (!fromAddr) {
    return { success: false, error: "MAIL_FROM no configurado." };
  }

  try {
    const info = await t.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text ?? stripHtml(options.html),
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    });

    return { success: true, messageId: info.messageId };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[mail] Error enviando email:", error);
    return { success: false, error };
  }
}

/**
 * Verifica la conexión con el servidor SMTP.
 */
export async function verifyMailConnection(): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.verify();
    return true;
  } catch (err) {
    console.error("[mail] No se pudo conectar al servidor SMTP:", err);
    return false;
  }
}

/**
 * Quita las etiquetas HTML para obtener texto plano
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Plantillas de email predefinidas para IJFK
 */

export const emailTemplates = {
  welcome: (name: string, role: string) => ({
    subject: `Bienvenido al sistema IJFK - ${role}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1E2A5E 0%, #2C3A7A 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #F4C15C; margin: 0;">IJFK</h1>
          <p style="color: #fff; margin: 8px 0 0;">Colegio Industrial John F. Kennedy</p>
        </div>
        <div style="padding: 30px; background: #f8fafc; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1E2A5E;">¡Hola, ${name}!</h2>
          <p>Tu cuenta de <strong>${role}</strong> ha sido creada exitosamente en el Sistema Institucional IJFK.</p>
          <p>Ya puedes acceder a la plataforma con tus credenciales.</p>
          <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
            Este es un email automático. Por favor no respondas a este mensaje.
          </p>
        </div>
      </div>
    `,
  }),

  gradeNotification: (
    parentName: string,
    studentName: string,
    course: string,
    bimester: string,
    grade: number,
  ) => ({
    subject: `Nueva nota registrada - ${studentName} - ${course}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1E2A5E; padding: 20px; text-align: center;">
          <h2 style="color: #F4C15C; margin: 0;">IJFK - Nueva Calificación</h2>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <p>Estimado(a) <strong>${parentName}</strong>:</p>
          <p>Le informamos que se ha registrado una nueva calificación para su hijo(a):</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; background: #fff;"><strong>Estudiante:</strong></td><td style="padding: 8px; background: #fff;">${studentName}</td></tr>
            <tr><td style="padding: 8px; background: #fff;"><strong>Curso:</strong></td><td style="padding: 8px; background: #fff;">${course}</td></tr>
            <tr><td style="padding: 8px; background: #fff;"><strong>Bimestre:</strong></td><td style="padding: 8px; background: #fff;">${bimester}</td></tr>
            <tr><td style="padding: 8px; background: #fff;"><strong>Nota:</strong></td><td style="padding: 8px; background: #fff; color: ${grade >= 14 ? "#22C55E" : "#EF4444"}; font-size: 18px; font-weight: bold;">${grade}</td></tr>
          </table>
          <p>Puede revisar el detalle completo en la plataforma institucional.</p>
        </div>
      </div>
    `,
  }),

  announcement: (title: string, body: string, sender: string) => ({
    subject: `Aviso: ${title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1E2A5E; padding: 20px; text-align: center;">
          <h2 style="color: #F4C15C; margin: 0;">IJFK - Comunicado</h2>
        </div>
        <div style="padding: 30px; background: #f8fafc;">
          <h3 style="color: #1E2A5E; margin-top: 0;">${title}</h3>
          <p style="line-height: 1.6;">${body}</p>
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">— ${sender}</p>
        </div>
      </div>
    `,
  }),
};
