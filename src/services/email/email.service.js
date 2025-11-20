const sgMail = require('@sendgrid/mail');
const config = require('../../config/config');
const logger = require('../../config/logger');

const sendSendgridEmail = async (to, subject, otp, tid) => {
  const mailData = {
    to,
    from: config.email.from,
    subject,
    templateId: tid,
    dynamic_template_data: {
      otp
    },
  };
  await sendSGEmail(mailData);
};

const sendSGEmail = async (mailData) => {
  sgMail.setApiKey(config.email.sg.sendGridApiKey);
  if (!mailData.from) {
    mailData.from = config.email.from;
  }
  sgMail.send(mailData).then(
    () => {
      logger.info('mail sent');
    },
    (error) => {
      if (error.response) {
        console.log(error.response.body)
        logger.error(error.response.body);
      }
    },
  );
};

module.exports = {
  sendSendgridEmail,
  sendSGEmail
};
