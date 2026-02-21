const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure cloudinary from env vars
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary storage — streams directly, no temp files on disk
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: 'expense-receipts',
        // Allow images and PDFs
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'],
        // Use original filename (sanitised) + timestamp for uniqueness
        public_id: `receipt_${Date.now()}_${file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')}`,
        resource_type: 'auto'  // handles both images and PDFs
    })
});

// File filter — only allow images and PDFs
const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only images (JPG, PNG, WEBP, GIF) and PDFs are allowed'), false);
    }
};

// 5 MB limit
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Export single-file upload for "receipt" field
const uploadReceipt = upload.single('receipt');

// Export cloudinary for use in receipt deletion
module.exports = { uploadReceipt, cloudinary };
