require('dotenv').config();
const emailService = require('./utils/emailService');

console.log('🧪 Testing EmailService directly...');
console.log('📧 SENDER_EMAIL:', process.env.SENDER_EMAIL);
console.log('�� SENDGRID_API_KEY set:', !!process.env.SENDGRID_API_KEY);
console.log('🔑 First 20 chars of API key:', process.env.SENDGRID_API_KEY?.substring(0, 20) + '...');

async function testEmailService() {
    try {
        console.log('\n🔄 Testing EmailService connection...');
        const connectionTest = await emailService.testConnection();
        console.log('✅ Connection test result:', connectionTest);

        if (connectionTest) {
            console.log('\n📤 Sending test OTP email...');
            const result = await emailService.sendVerificationOTP(
                'bhaveshnankani777@gmail.com',
                'Test User',
                '123456'
            );
            console.log('✅ Email sent successfully!');
            console.log('📧 Result:', result);
            console.log('\n🎉 Check your email inbox!');
        } else {
            console.log('❌ Connection test failed');
        }
    } catch (error) {
        console.error('\n❌ EmailService Error:');
        console.error('- Message:', error.message);
        console.error('- Code:', error.code);
        console.error('- Command:', error.command);
        console.error('- Response:', error.response);
        console.error('- Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
        
        // Provide specific solutions based on error
        if (error.message.includes('authentication') || error.message.includes('Invalid login')) {
            console.log('\n💡 SOLUTION: Authentication failed');
            console.log('   - Your SendGrid API key might be invalid or expired');
            console.log('   - Go to SendGrid Dashboard → Settings → API Keys');
            console.log('   - Generate a new API key with Mail Send permissions');
        } else if (error.message.includes('sender') || error.message.includes('The from address does not match a verified Sender Identity')) {
            console.log('\n💡 SOLUTION: Sender verification issue');
            console.log('   - growahead.noreply@gmail.com needs to be verified in SendGrid');
            console.log('   - Go to SendGrid Dashboard → Settings → Sender Authentication');
            console.log('   - Add and verify growahead.noreply@gmail.com');
        } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
            console.log('\n💡 SOLUTION: API key permissions issue');
            console.log('   - Your SendGrid API key needs Mail Send permissions');
            console.log('   - Check API key permissions in SendGrid dashboard');
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            console.log('\n💡 SOLUTION: SendGrid quota/limit exceeded');
            console.log('   - Free plan has daily sending limits');
            console.log('   - Check your SendGrid usage dashboard');
        } else {
            console.log('\n�� Unrecognized error - check SendGrid dashboard for more details');
        }
    }
}

testEmailService();
