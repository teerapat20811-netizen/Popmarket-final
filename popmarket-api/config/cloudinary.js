const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: 'dkanzflfw',
  api_key: '648191429855429',
  api_secret: '4mn5Y42mlOztcsSoFWSBWy9mtY8',
});

const marketStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'popmarket/markets',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit' }],
  },
});

const slipStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'popmarket/slips',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
  },
});

const shopStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'popmarket/shops',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit' }],
  },
});

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'popmarket/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
});

const layoutStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'popmarket/layouts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1600, crop: 'limit' }],
  },
});

const uploadMarket = multer({ storage: marketStorage });
const uploadSlip   = multer({ storage: slipStorage });
const uploadShop   = multer({ storage: shopStorage });
const uploadAvatar = multer({ storage: avatarStorage });
const uploadLayout = multer({ storage: layoutStorage });

module.exports = { uploadMarket, uploadSlip, uploadShop, uploadAvatar, uploadLayout, cloudinary };