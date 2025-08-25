const AWS = require('aws-sdk');
const config = require('../config/config'); // loads env

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: config.s3.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.s3.AWS_SECRET_ACCESS_KEY,
  region: config.s3.AWS_REGION,
});

/**
 * Upload buffer to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - Folder path inside bucket (e.g., cloclsync/qrcodes)
 * @param {string} filename - File name
 * @param {string} contentType - MIME type
 * @returns {string} public URL of uploaded file
 */
async function uploadBufferToS3(buffer, folder, filename, contentType = 'image/png') {
  const key = `${folder}/${Date.now()}_${filename}.png`;

  const uploadResult = await s3
    .upload({
      Bucket: config.s3.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read', // or 'private' if using CloudFront OAI
    })
    .promise();

  if (config.s3.CLOUDFRONT_URL) {
    return `${config.s3.CLOUDFRONT_URL}/${key}`;
  }

  return uploadResult.Location;
}

/**
 * Delete a file from S3
 * @param {string} keyOrUrl - S3 Key (e.g., cloclsync/qrcodes/123.png) or full URL
 * @returns {void}
 */
async function deleteFromS3(keyOrUrl) {
  let key = keyOrUrl;

  // If full URL is provided, extract key
  if (keyOrUrl.startsWith('http')) {
    const urlParts = keyOrUrl.split('/');
    key = urlParts.slice(3).join('/'); // remove bucket/domain
  }

  await s3
    .deleteObject({
      Bucket: config.s3.AWS_S3_BUCKET,
      Key: key,
    })
    .promise();
}

/**
 * Rename an object in S3
 * @param {string} oldKeyOrUrl - old S3 key or full URL
 * @param {string} newKey - new S3 key (path + filename)
 * @returns {string} new public URL
 */
async function renameS3Object(oldKeyOrUrl, newKey) {
  // Extract old key if full URL
  let oldKey = oldKeyOrUrl;
  if (oldKeyOrUrl.startsWith('http')) {
    const urlParts = oldKeyOrUrl.split('/');
    oldKey = urlParts.slice(3).join('/');
  }

  // Copy old object to new key
  await s3.copyObject({
    Bucket: config.s3.AWS_S3_BUCKET,
    CopySource: `${config.s3.AWS_S3_BUCKET}/${oldKey}`,
    Key: newKey,
    ACL: 'public-read',
  }).promise();

  // Delete old object
  await s3.deleteObject({
    Bucket: config.s3.AWS_S3_BUCKET,
    Key: oldKey,
  }).promise();

  // Return new URL
  return config.s3.CLOUDFRONT_URL
    ? `${config.s3.CLOUDFRONT_URL}/${newKey}`
    : `https://${config.s3.AWS_S3_BUCKET}.s3.${config.s3.AWS_REGION}.amazonaws.com/${newKey}`;
}


module.exports = { uploadBufferToS3, deleteFromS3, renameS3Object };