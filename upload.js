// upload.js
import multer from 'multer';
import path from 'path';

// Set storage engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Define the folder where files will be stored
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Append the timestamp to the original file name
    },
});

// Initialize upload
const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // Increase the limit to 5 MB if needed
    fileFilter: (req, file, cb) => {
        // Accept only images and documents
        const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/; // Add document file types
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images and Documents Only!');
        }
    },
}).single('profilePicture'); // Name of the file input

export default upload;
