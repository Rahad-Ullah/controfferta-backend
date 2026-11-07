import config from '../config';
import {
  ICreateAccount,
  ILowBalanceWarning,
  IResetPassword,
} from '../types/emailTemplate';

const createAccount = (values: ICreateAccount) => {
  const data = {
    to: values.email,
    subject: 'Verify your account',
    html: `
      <div style="background-color: #f4f7f9; padding: 40px 16px; font-family: system-ui, -apple-system, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333333;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          
          ${config.logo_url ? `<img src="${config.logo_url}" alt="Logo" style="display: block; margin: 0 auto 32px; max-width: 140px; height: auto;" />` : ''}
          
          <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 600; color: #111111; text-align: center; letter-spacing: -0.3px;">
            Verify Your Account
          </h2>
          
          <p style="margin: 0 0 28px; font-size: 15px; color: #666666; text-align: center; line-height: 1.5;">
            Use the single-use verification code below to complete setting up your <strong>${config.server_name}</strong> account.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background-color: #f0f8fc; border: 1px dashed #D99722; border-radius: 10px; padding: 14px 28px;">
              <span style="font-family: ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #D99722;">
                ${values.otp}
              </span>
            </div>
          </div>
          
          <p style="margin: 0 0 32px; font-size: 13px; color: #888888; text-align: center;">
            This code will expire in <strong style="color: #555555;">5 minutes</strong>.
          </p>

          <hr style="border: none; border-top: 1px solid #eef2f5; margin: 32px 0 24px;" />

          <p style="margin: 0; font-size: 12px; color: #999999; text-align: center; line-height: 1.4;">
            If you didn't request this code, you can safely ignore this email.
          </p>

        </div>
      </div>
    `,
  };
  return data;
};

const resetPassword = (values: IResetPassword) => {
  const data = {
    to: values.email,
    subject: 'Reset your password',
    html: `
      <div style="background-color: #f4f7f9; padding: 40px 16px; font-family: system-ui, -apple-system, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333333;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          
          ${config.logo_url ? `<img src="${config.logo_url}" alt="Logo" style="display: block; margin: 0 auto 32px; max-width: 140px; height: auto;" />` : ''}
          
          <h2 style="margin: 0 0 12px; font-size: 22px; font-weight: 600; color: #111111; text-align: center; letter-spacing: -0.3px;">
            Reset Your Password
          </h2>
          
          <p style="margin: 0 0 28px; font-size: 15px; color: #666666; text-align: center; line-height: 1.5;">
            Use the verification code below to reset the password for your <strong>${config.server_name}</strong> account.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background-color: #f0f8fc; border: 1px dashed #D99722; border-radius: 10px; padding: 14px 28px;">
              <span style="font-family: ui-monospace, 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #D99722;">
                ${values.otp}
              </span>
            </div>
          </div>
          
          <p style="margin: 0 0 32px; font-size: 13px; color: #888888; text-align: center;">
            This code will expire in <strong style="color: #555555;">5 minutes</strong>.
          </p>

          <hr style="border: none; border-top: 1px solid #eef2f5; margin: 32px 0 24px;" />

          <p style="margin: 0; font-size: 12px; color: #999999; text-align: center; line-height: 1.4;">
            If you didn't request this code, you can safely ignore this email. Someone else might have typed your email address by mistake.
          </p>

        </div>
      </div>
    `,
  };
  return data;
};

// warning for low platform balance
const lowBalanceWarning = (values: ILowBalanceWarning) => {
  const missingAmount = Math.max(
    0,
    values.requiredBalance - values.currentBalance,
  );

  const data = {
    to: values.adminEmail,
    subject: `🚨 ALERT: Low Balance Warning - ${values.gatewayName}`,
    html: `
      <body
          style="font-family: 'Trebuchet MS', sans-serif; background-color: #f9f9f9; margin: 50px; padding: 20px; color: #555;">
          <div
              style="width: 100%; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); border-top: 4px solid #F1913D;">
              
              <img src="${config.logo_url}" alt="Logo" style="display: block; margin: 0 auto 20px; width:150px" />
              
              <h2 style="color: #F1913D; font-size: 22px; margin-bottom: 20px; text-align: center;">
                🚨 Payout Action Required: Low Funds
              </h2>
              
              <p style="font-size: 16px; line-height: 1.5; color: #333;">
                Hello Admin,
              </p>
              
              <p style="font-size: 16px; line-height: 1.5; color: #555;">
                A host payout request is currently on hold because your <strong>${values.gatewayName}</strong> available balance is insufficient to process the transaction.
              </p>

              <!-- Financial Breakdown Box -->
              <div style="background-color: #FFFBF7; border: 1px solid #FFE3CC; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <table style="width: 100%; font-size: 15px; border-collapse: collapse;">
                      <tr>
                          <td style="padding: 6px 0; color: #777;">Payment Gateway:</td>
                          <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #333;">${values.gatewayName}</td>
                      </tr>
                      <tr>
                          <td style="padding: 6px 0; color: #777;">Current Available Balance:</td>
                          <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #D32F2F;">${values.currentBalance.toLocaleString()} ${values.currency.toUpperCase()}</td>
                      </tr>
                      <tr>
                          <td style="padding: 6px 0; color: #777;">Required Transfer Amount:</td>
                          <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #333;">${values.requiredBalance.toLocaleString()} ${values.currency.toUpperCase()}</td>
                      </tr>
                      <tr style="border-top: 1px solid #FFE3CC;">
                          <td style="padding: 12px 0 0 0; font-weight: bold; color: #333;">⚠️ Shortfall Amount:</td>
                          <td style="padding: 12px 0 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #D32F2F;">
                              -${missingAmount.toLocaleString()} ${values.currency.toUpperCase()}
                          </td>
                      </tr>
                  </table>
              </div>

              <div style="text-align: center; margin-top: 30px;">
                  <p style="color: #777; font-size: 14px; line-height: 1.5;">
                      Please log into your ${values.gatewayName} dashboard immediately and deposit funds to resume pending host payouts.
                  </p>
              </div>
          </div>
      </body>
    `,
  };
  return data;
};

export const emailTemplate = {
  createAccount,
  resetPassword,
  lowBalanceWarning,
};
