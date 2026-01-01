/**
 * Email utility using Resend
 */

export interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
}

/**
 * 发送邮件 (使用原生 fetch 调用 Resend API)
 */
export async function sendEmail({ to, subject, html }: SendEmailParams) {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

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
    const subject = '🎉 欢迎来到 PixelDesk!';
    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #8b5cf6;">欢迎来到 PixelDesk, ${name}!</h1>
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
