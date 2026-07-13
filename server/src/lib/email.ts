import nodemailer, { type Transporter } from 'nodemailer';
import { logger } from './logger';

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const host = process.env.SMTP_HOST;
  if (!host) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  return transporter;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({ to, subject, text }: SendEmailInput): Promise<void> {
  const client = getTransporter();

  if (!client) {
    logger.info({ to, subject }, 'SMTP not configured — skipping email (would have sent)');
    return;
  }

  await client.sendMail({
    from: process.env.EMAIL_FROM ?? 'BeniFits <no-reply@benifits.demo>',
    to,
    subject,
    text,
  });
}
