const { v2: cloudinary } = require('cloudinary');
const { AppError } = require('./errors');

const ALLOWED_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 5000;

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(503, 'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return { cloudName, apiKey, apiSecret };
}

function createUploadSignature() {
  const { cloudName, apiKey, apiSecret } = configureCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = process.env.CLOUDINARY_FOLDER?.trim() || 'cosmictech/products';
  const allowedFormats = [...ALLOWED_FORMATS].join(',');
  const params = { timestamp, folder, allowed_formats: allowedFormats };
  const signature = cloudinary.utils.api_sign_request(params, apiSecret);
  return {
    cloudName,
    apiKey,
    timestamp,
    folder,
    allowedFormats,
    maxBytes: MAX_BYTES,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}

async function verifyUploadedAsset(publicId) {
  const { cloudName } = configureCloudinary();
  const folder = process.env.CLOUDINARY_FOLDER?.trim() || 'cosmictech/products';
  if (!publicId.startsWith(`${folder}/`)) throw new AppError(400, 'Uploaded image is outside the approved product-media folder.');
  let asset;
  try {
    asset = await cloudinary.api.resource(publicId, { resource_type: 'image', type: 'upload' });
  } catch {
    throw new AppError(400, 'The uploaded Cloudinary asset could not be verified.');
  }
  if (!ALLOWED_FORMATS.has(String(asset.format || '').toLowerCase())) throw new AppError(400, 'This image format is not allowed.');
  if (Number(asset.bytes || 0) > MAX_BYTES) throw new AppError(400, 'Images must be 8 MB or smaller.');
  if (Number(asset.width || 0) > MAX_DIMENSION || Number(asset.height || 0) > MAX_DIMENSION) {
    throw new AppError(400, 'Images may not exceed 5000 × 5000 pixels.');
  }
  const expectedPrefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
  if (!String(asset.secure_url || '').startsWith(expectedPrefix)) throw new AppError(400, 'The uploaded image URL is not from the configured Cloudinary account.');
  return {
    publicId: asset.public_id,
    secureUrl: asset.secure_url,
    format: asset.format || null,
    width: asset.width || null,
    height: asset.height || null,
    bytes: asset.bytes || null,
  };
}

async function destroyAsset(publicId) {
  configureCloudinary();
  return cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'image' });
}

module.exports = { createUploadSignature, verifyUploadedAsset, destroyAsset };
