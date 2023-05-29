const nodemailer = require('nodemailer');
const debug = require('debug')('app:debug');

const AppError = require("./AppError");
const { EMAIL_ERROR } = require("../constants/errorCodes");

async function sendEmail(email, subject, body) {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: subject,
        html: body
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        debug('Password reset email sent: ' + info.response);
        return info;
    }
    catch (error) {
        debug("Email Error Occured! ", error);
        throw new AppError('Some Error Occured while sending password reset email', 500, [], EMAIL_ERROR);
    }
}

module.exports = sendEmail;