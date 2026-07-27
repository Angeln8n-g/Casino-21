export interface SendClaimNotificationParams {
  toEmail: string;
  userName: string;
  rankPosition: number;
  amountUsd: number;
  sponsorName: string;
  claimUrl: string;
}

export interface SendPaymentConfirmationParams {
  toEmail: string;
  userName: string;
  amountUsd: number;
  bankName: string;
  lastFourAccountDigits: string;
}

export function generateClaimEmailContent(params: SendClaimNotificationParams) {
  const rankText = params.rankPosition === 1 ? '1er' : `${params.rankPosition}º`;
  const subject = `🏆 Ganaste $${params.amountUsd} en el Torneo ${params.sponsorName}`;
  
  const bodyText = `Hola ${params.userName},

¡Ganaste el ${rankText} lugar en el Torneo ${params.sponsorName}!

Para reclamar tu premio de $${params.amountUsd} USD tienes 7 días.
Haz clic aquí: ${params.claimUrl}

Necesitamos: Nombre, Cédula y Cuenta bancaria.
El depósito se hace todos los lunes por transferencia.

Si no reclamas en 7 días, el premio pasa al siguiente jugador.

Suerte, 
Team kasino21`;

  const bodyHtml = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #1e293b;">
    <h2 style="color: #f59e0b; margin-top: 0;">🏆 ¡Felicidades, ${params.userName}!</h2>
    <p style="font-size: 16px; line-height: 1.5; color: #e2e8f0;">
      Ganaste el <strong>${rankText} lugar</strong> en el <strong>Torneo ${params.sponsorName}</strong>.
    </p>
    <div style="background-color: #1e293b; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="font-size: 18px; margin: 0; font-weight: bold; color: #10b981;">
        Premio: $${params.amountUsd} USD
      </p>
      <p style="font-size: 13px; color: #94a3b8; margin: 5px 0 0 0;">
        Plazo de reclamo: 7 días desde la finalización del torneo.
      </p>
    </div>
    <p style="font-size: 14px; color: #cbd5e1;">Necesitamos: Nombre, Cédula y Cuenta bancaria.<br>El depósito se hace todos los lunes por transferencia.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.claimUrl}" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; padding: 14px 28px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px;">
        RECLAMAR MI PREMIO
      </a>
    </div>
    <p style="font-size: 12px; color: #64748b; text-align: center;">Si no reclamas en 7 días, el premio pasará al siguiente jugador en la tabla de posiciones.</p>
    <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;">
    <p style="font-size: 12px; color: #94a3b8; text-align: center;">Team Kasino21</p>
  </div>
  `;

  return { subject, bodyText, bodyHtml };
}

export async function sendClaimNotificationEmail(params: SendClaimNotificationParams): Promise<boolean> {
  const { subject, bodyText } = generateClaimEmailContent(params);
  console.log(`[Email Service] Enviando correo de reclamo a ${params.toEmail}:`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${bodyText}`);
  return true;
}

export async function sendPaymentConfirmationEmail(params: SendPaymentConfirmationParams): Promise<boolean> {
  const subject = `✅ Tu premio de $${params.amountUsd} ha sido enviado`;
  const bodyText = `Hola ${params.userName},

Tu premio de $${params.amountUsd} USD fue enviado a tu cuenta de ${params.bankName} terminada en ****${params.lastFourAccountDigits}.

¡Gracias por participar en Kasino21!

Team kasino21`;

  console.log(`[Email Service] Enviando confirmación de pago a ${params.toEmail}:`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${bodyText}`);
  return true;
}
