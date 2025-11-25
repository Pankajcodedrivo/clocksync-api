const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../../config/config');
const logger = require('../../config/logger');

// ➤ Gmail transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.email.gmail.APPEMAIL,
        pass: config.email.gmail.APPPASSWORD,
    },
});

const imageToBase64 = (relativePath) => {
    const imgPath = path.join(__dirname, relativePath);
    const image = fs.readFileSync(imgPath);
    const base64 = Buffer.from(image).toString("base64");
    return `data:image/png;base64,${base64}`;
};

// ➤ Load & replace placeholders in HTML templates
const loadEmailTemplate = (templateName, variables = {}) => {
    const templatePath = path.join(__dirname, `../../templates/${templateName}.html`);

    let template = fs.readFileSync(templatePath, 'utf8');

    // Replace all {{PLACEHOLDERS}}
    Object.keys(variables).forEach((key) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        template = template.replace(regex, variables[key]);
    });

    return template;
};

// ➤ Send Gmail email using any template
const sendGmailEmail = async (to, subject, templateName, variables = {}) => {
    try {

        const htmlTemplate = loadEmailTemplate(templateName, variables);
        const mailOptions = {
            from: config.email.gmail.APPEMAIL,
            to,
            subject,
            html: htmlTemplate,
            attachments: [
                {
                    filename: 'logo.png',
                    path: path.join(__dirname, '../../../public/images/logo.png'),
                    cid: 'logo123' // same as used in <img>
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        logger.info(`Email sent to ${to}`);

    } catch (error) {
        console.error(error);
        logger.error(error);
    }
};

module.exports = {
    sendGmailEmail
};
