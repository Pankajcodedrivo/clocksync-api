const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');
const ApiError = require('../helpers/apiErrorConverter');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('prod', 'dev').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number()
      .default(30)
      .description('minutes after which access tokens expire'),
    JWT_RESET_EXPIRATION_MINUTES: Joi.number()
      .default(30)
      .description('minutes after which password reset tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
      .default(30)
      .description('days after which refresh tokens expire'),
    JWT_ISS: Joi.string().description('Token issuer').required(),
    JWT_ALGO: Joi.string()
      .description('Token Algorithm for encryption')
      .required(),
    APPEMAIL: Joi.string().description(
      'Please provide app email',
    ),
    APPPASSWORD: Joi.string().description(
      'Please provide app password',
    ),
    S3_BUCKET_PATH: Joi.string().description('BUCKET PATH for AWS s3 bucket'),
    AWS_ACCESS_KEY_ID: Joi.string().required().description('AWS access key ID'),
    AWS_SECRET_ACCESS_KEY: Joi.string()
      .required()
      .description('AWS secret access key'),
    AWS_REGION: Joi.string().required().description('AWS S3 region'),
    AWS_S3_BUCKET: Joi.string().required().description('AWS S3 bucket name'),
    APP_BASE_URL: Joi.string().required().description('Frontend url'),
    ADMIN_BASE_URL: Joi.string().required().description('Admin url'),
    RECAPTCHA_SECRET_KEY: Joi.string().required().description('Recaptcha secret key')
  })
  .unknown();
const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new ApiError(`Config validation error: ${error.message}`, 500);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  socketPort: envVars.SOCKETPORT,
  mongoose: {
    url: envVars.MONGODB_URL,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_EXPIRATION_MINUTES,
    issuer: envVars.JWT_ISS,
    algo: envVars.JWT_ALGO,
  },
  email: {
    gmail: {
      APPEMAIL: envVars.APPEMAIL,
      APPPASSWORD: envVars.APPPASSWORD,
    },
  },
  s3: {
    AWS_S3_BUCKET: envVars.AWS_S3_BUCKET,
    AWS_ACCESS_KEY_ID: envVars.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: envVars.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: envVars.AWS_REGION,
  },
  APP_BASE_URL: envVars.APP_BASE_URL,
  ADMIN_BASE_URL: envVars.ADMIN_BASE_URL,
  RECAPTCHA_SECRET_KEY: envVars.RECAPTCHA_SECRET_KEY
};
