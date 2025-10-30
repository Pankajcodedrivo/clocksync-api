const multer = require('multer');

// ⚙️ Memory storage — file kept only in RAM
const storage = multer.memoryStorage();

const uploadMemory = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv'
        ];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Only .xlsx, .xls or .csv files are allowed'), false);
        }
        cb(null, true);
    }
});

module.exports = uploadMemory;