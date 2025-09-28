const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const config = require('../config/config'); // your config file with env vars
// Configure AWS S3
const s3 = new S3Client({
  accessKeyId: config.s3.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.s3.AWS_SECRET_ACCESS_KEY,
  region: config.s3.AWS_REGION,
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: config.s3.AWS_S3_BUCKET, // bucket name from env
    acl: 'public-read', // or 'private' if using CloudFront with OAI
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const extension = file.originalname.split('.').pop(); // get file extension
      const timestamp = Date.now();
      const uniqueKey = `cloclsync/${timestamp}.${extension}`; // unique key per upload
      cb(null, uniqueKey);
    },
  }),
});

module.exports = upload;
