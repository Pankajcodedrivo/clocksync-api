const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const config = require('../config/config');

const s3 = new S3Client();

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: config.s3.S3_BUCKET_PATH,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const extension = file.originalname.split('.').pop(); // Get the extension from the original file name
      const uniqueKey = 'cloclsync/' + Date.now().toString() + '.' + extension; // Use a unique key with the extension
      cb(null, uniqueKey);
    },
  }),
});

module.exports = upload;
