import { getSystemSetting } from './systemSettings'

export interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
}

/**
 * 发送邮件 (使用数据库或环境变量配置)
 */
export async function sendEmail({ to, subject, html }: SendEmailParams) {
    try {
        const apiKey = await getSystemSetting('RESEND_API_KEY');
        const fromEmail = await getSystemSetting('RESEND_FROM_EMAIL', 'noreply@yourdomain.com');

        if (!apiKey) {
            console.warn('RESEND_API_KEY is not configured, skipping email delivery');
            return { success: false, error: 'RESEND_API_KEY is not configured' };
        }

        const recipients = Array.isArray(to) ? to : [to];

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromEmail,
                to: recipients,
                subject,
                html,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Failed to send email:', result);
            return {
                success: false,
                error: result.message || `HTTP ${response.status}: ${response.statusText}`
            };
        }

        console.log('Email sent successfully:', result);
        return { success: true, data: result };
    } catch (error: any) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 发送欢迎邮件
 */
export async function sendWelcomeEmail(email: string, name: string) {
    const subject = '🎉 欢迎来到 象素工坊!';
    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #8b5cf6;">欢迎来到 象素工坊, ${name}!</h1>
      <p>很高兴你能加入我们的像素世界。在这里，你可以创建你心仪的像素分身，与其他玩家互动，并在这个创意无限的世界里探索。</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0; font-size: 18px;">你的旅程从这里开始：</h2>
        <ul style="padding-left: 20px;">
          <li>自定义你的角色外观</li>
          <li>探索充满惊喜的地图</li>
          <li>与其他玩家实时交流</li>
        </ul>
      </div>
      <a href="${process.env.NEXTAUTH_URL}" style="display: inline-block; background: #8b5cf6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">立即开始</a>
      <p style="color: #6b7280; font-size: 0.875rem; margin-top: 30px;">
        如果你有任何问题，只需回复此邮件，我们会竭尽所能为你提供帮助。
      </p>
    </div>
  `;

    return sendEmail({ to: email, subject, html });
}

/**
 * 发送工位不活跃预警邮件 (5天未上线)
 */
export async function sendInactivityWarningEmail(email: string, name: string, language: 'zh-CN' | 'en' = 'zh-CN') {
    const isZh = language === 'zh-CN';
    const subject = isZh ? '⚠️ 您的工位入驻协议即将失效 - 像素工坊' : '⚠️ Your Workstation Lease is Expiring - Pixel Desk';
    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded-lg: 8px;">
      <h2 style="color: #f59e0b;">${isZh ? '入驻协议预警提示' : 'Lease Agreement Warning'}</h2>
      <p>${isZh ? `亲爱的 ${name},` : `Dear ${name},`}</p>
      <p>
        ${isZh
            ? '我们注意到您已经连续 5 天没有进入工位办公了。根据入驻协议，若连续 7 天未登录，为确保资源有效利用，您的工位将被自动回收。'
            : 'We noticed that you haven\'t visited your workstation for 5 consecutive days. According to the agreement, if you are inactive for 7 days, your workstation will be automatically reclaimed to ensure resource efficiency.'}
      </p>
      <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <strong>${isZh ? '如何保留工位？' : 'How to keep your station?'}</strong><br/>
        <p>${isZh ? '您只需在接下来的 48 小时内登录一次系统，协议将自动为您重置活跃期。' : 'Simply log in to the system within the next 48 hours, and your active status will be automatically reset.'}</p>
      </div>
      <a href="${process.env.NEXTAUTH_URL}" style="display: inline-block; background: #8b5cf6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">${isZh ? '立即回归' : 'Return Now'}</a>
    </div>
  `;

    return sendEmail({ to: email, subject, html });
}

/**
 * 发送工位回收通知邮件 (7天未上线)
 */
export async function sendReclamationEmail(email: string, name: string, refundPoints: number, language: 'zh-CN' | 'en' = 'zh-CN') {
    const isZh = language === 'zh-CN';
    const subject = isZh ? '🏢 工位回收处理结果通知 - 像素工坊' : '🏢 Workstation Reclamation Notice - Pixel Desk';
    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb;">
      <h2 style="color: #ef4444;">${isZh ? '工位已正式回收' : 'Workstation Reclaimed'}</h2>
      <p>${isZh ? `亲爱的 ${name},` : `Dear ${name},`}</p>
      <p>
        ${isZh
            ? '很抱歉通知您，由于您已连续 7 天未登录系统，您的工位入驻协议已自动终止。该工位现已归还资源池。'
            : 'We regret to inform you that as you haven\'t logged in for 7 consecutive days, your workstation lease has been automatically terminated. The station is now back in the resource pool.'}
      </p>
      ${refundPoints > 0 ? `
      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;">${isZh ? `系统已根据剩余比例为您退回了 <strong>${refundPoints} 象素币</strong>。` : `We have refunded <strong>${refundPoints} PixelCoins</strong> to your account based on the remaining period.`}</p>
      </div>
      ` : ''}
      <p>${isZh ? '如有需要，您可以随时登录系统重新签约其他工位。' : 'You can log in and sign a new contract for another workstation at any time.'}</p>
    </div>
  `;

    return sendEmail({ to: email, subject, html });
}
