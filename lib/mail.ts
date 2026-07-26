/**
 * Cliente de correo para IJFK
 *
 * Diseñado para funcionar con:
 *  - Mailpit (Docker, desarrollo) - API compatible con SMTP estándar
 *  - Mailgun (producción) - sólo cambiar variables de entorno
 *  - Cualquier servidor SMTP estándar
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

const MAIL_HOST = process.env.MAIL_HOST ?? "mailpit";
const MAIL_PORT = parseInt(process.env.MAIL_PORT ?? "1025", 10);
const MAIL_SECURE = process.env.MAIL_SECURE === "true";
const MAIL_USER = process.env.MAIL_USER ?? "";
const MAIL_PASSWORD = process.env.MAIL_PASSWORD ?? "";
const MAIL_FROM = process.env.MAIL_FROM ?? "no-reply@ijfk.local";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME ?? "IJFK Sistema Institucional";

let transporter: Transporter | null = null;

/**
 * Crea (o reutiliza) el transporter SMTP
 */
function getTransporter(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,
    secure: MAIL_SECURE, // true para 465, false para 587/1025
    auth:
      MAIL_USER && MAIL_PASSWORD
        ? { user: MAIL_USER, pass: MAIL_PASSWORD }
        : undefined,
    // En desarrollo ser permisivos con certificados
    tls: {
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
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
};

/**
 * Envía un email usando la configuración SMTP
 */
export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const t = getTransporter();
    const fromName = options.fromName ?? MAIL_FROM_NAME;
    const fromAddr = options.from ?? MAIL_FROM;
    const to = Array.isArray(options.to) ? options.to.join(", ") : options.to;

    const info = await t.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to,
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
 * Verifica la conexión con el servidor SMTP
 */
export async function verifyMailConnection(): Promise<boolean> {
  try {
    const t = getTransporter();
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
