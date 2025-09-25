const crypto = require('crypto');

class EmailService {
    constructor() {
        // Check if SendGrid API key is available
        if (process.env.SENDGRID_API_KEY) {
            this.isDevelopment = false;
            console.log('✅ EmailService initialized with SendGrid Web API');
        } else {
            this.isDevelopment = true;
            console.log('⚠️  EmailService in development mode - no SendGrid API key');
        }
    }

    // Generate secure 6-digit OTP
    generateOTP() {
        return crypto.randomInt(100000, 999999).toString();
    }

    // Generate OTP expiry time (10 minutes from now)
    getOTPExpiry() {
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 10);
        return expiry;
    }

    // Send verification OTP email using SendGrid Web API
    async sendVerificationOTP(email, name, otp) {
        if (this.isDevelopment) {
            // Development mode - log OTP instead of sending email
            console.log('\n🎯 ===== EMAIL VERIFICATION CODE =====');
            console.log('📧 TO:', email);
            console.log('👤 NAME:', name);
            console.log('🔢 OTP CODE:', otp);
            console.log('⏰ EXPIRES: 10 minutes');
            console.log('==========================================\n');
            
            return { success: true, messageId: 'dev-mode-' + Date.now() };
        } else {
            // Production mode - use SendGrid Web API instead of SMTP
            const senderEmail = process.env.SENDER_EMAIL || 'growahead.noreply@gmail.com';
            
            const emailData = {
                personalizations: [
                    {
                        to: [{ email: email, name: name }],
                        subject: 'Verify Your GrowAhead Account'
                    }
                ],
                from: {
                    email: senderEmail,
                    name: 'GrowAhead'
                },
                content: [
                    {
                        type: 'text/html',
                        value: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .header { background: linear-gradient(135deg, #1e293b, #475569); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
                                    .otp-box { background: white; border: 2px solid #e2e8f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
                                    .otp-code { font-size: 32px; font-weight: bold; color: #1e293b; letter-spacing: 4px; font-family: monospace; }
                                    .warning { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 6px; margin: 20px 0; }
                                    .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
                                    .owner-credit { text-align: center; color: #94a3b8; font-size: 11px; font-style: italic; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>🚀 Welcome to GrowAhead!</h1>
                                        <p>Micro-Investment Tracker</p>
                                    </div>
                                    <div class="content">
                                        <h2>Hi ${name}!</h2>
                                        <p>Thank you for registering with GrowAhead. To complete your registration and secure your account, please verify your email address using the One-Time Password (OTP) below:</p>
                                        
                                        <div class="otp-box">
                                            <p>Your Verification Code:</p>
                                            <div class="otp-code">${otp}</div>
                                            <p style="margin-top: 15px; font-size: 14px; color: #64748b;">
                                                This code expires in <strong>10 minutes</strong>
                                            </p>
                                        </div>

                                        <p>Enter this code in the GrowAhead app to verify your account and start your micro-investment journey.</p>
                                        
                                        <div class="warning">
                                            <strong>Security Notice:</strong> Never share this code with anyone. GrowAhead will never ask for your OTP via phone or other channels.
                                        </div>

                                        <p>If you didn't create a GrowAhead account, please ignore this email.</p>
                                    </div>
                                    <div class="footer">
                                        <p>© 2025 GrowAhead - Micro-Investment Tracker</p>
                                        <p>This is an automated message, please do not reply.</p>
                                        <div class="owner-credit">
                                            Developed by Bhavesh Nankani
                                        </div>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `
                    }
                ]
            };

            try {
                // Use fetch instead of nodemailer for SendGrid Web API
                const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(emailData)
                });

                if (response.ok) {
                    console.log('✅ Verification email sent to:', email);
                    return { success: true, messageId: 'sendgrid-' + Date.now() };
                } else {
                    const errorText = await response.text();
                    console.error('❌ SendGrid API Error:', response.status, errorText);
                    throw new Error(`SendGrid API error: ${response.status} ${errorText}`);
                }
            } catch (error) {
                console.error('❌ Error sending verification email:', error);
                throw new Error(`Failed to send verification email: ${error.message}`);
            }
        }
    }

    // Send welcome email using Web API
    async sendWelcomeEmail(email, name) {
        if (this.isDevelopment) {
            console.log(`📧 Welcome email would be sent to: ${email}`);
            return { success: true, messageId: 'dev-welcome-' + Date.now() };
        }

        const senderEmail = process.env.SENDER_EMAIL || 'growahead.noreply@gmail.com';

        const emailData = {
            personalizations: [
                {
                    to: [{ email: email, name: name }],
                    subject: '🎉 Welcome to GrowAhead - Your Investment Journey Begins!'
                }
            ],
            from: {
                email: senderEmail,
                name: 'GrowAhead'
            },
            content: [
                {
                    type: 'text/html',
                    value: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                                .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
                                .feature-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
                                .cta-button { background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin: 20px 0; }
                                .footer { text-align: center; color: #64748b; font-size: 14px; margin-top: 30px; }
                                .owner-credit { text-align: center; color: #94a3b8; font-size: 11px; font-style: italic; margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>🎉 Account Verified Successfully!</h1>
                                    <p>Welcome to GrowAhead, ${name}!</p>
                                </div>
                                <div class="content">
                                    <h2>Your micro-investment journey starts now! 🚀</h2>
                                    <p>Congratulations on taking the first step towards building wealth through spare change.</p>
                                    
                                    <div class="feature-box">
                                        <h3>💰 Smart Round-Ups</h3>
                                        <p>Every purchase rounds up to the nearest dollar and invests the spare change automatically.</p>
                                    </div>

                                    <div class="feature-box">
                                        <h3>📊 Real-Time Analytics</h3>
                                        <p>Track your portfolio growth with beautiful charts and detailed investment insights.</p>
                                    </div>

                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="cta-button">
                                        Start Investing Now →
                                    </a>
                                </div>
                                <div class="footer">
                                    <p>© 2025 GrowAhead - Educational Investment Learning Platform</p>
                                    <div class="owner-credit">
                                        Developed by Bhavesh Nankani
                                    </div>
                                </div>
                            </div>
                        </body>
                        </html>
                    `
                }
            ]
        };

        try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailData)
            });

            if (response.ok) {
                console.log('Welcome email sent to:', email);
            } else {
                const errorText = await response.text();
                console.error('Error sending welcome email:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error sending welcome email:', error);
            // Don't throw error for welcome email - it's not critical
        }
    }

    // Test email configuration using Web API
    async testConnection() {
        if (this.isDevelopment) {
            console.log('✅ Email service ready (development mode - console logging)');
            return true;
        }

        try {
            // Test SendGrid Web API by sending a validation request
            const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
                }
            });

            if (response.ok) {
                console.log('✅ SendGrid Web API service is ready');
                return true;
            } else {
                console.error('❌ SendGrid Web API authentication failed:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ SendGrid Web API connection error:', error);
            return false;
        }
    }
}

module.exports = new EmailService();