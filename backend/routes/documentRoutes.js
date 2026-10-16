const express = require("express");
const multer = require("multer");

const {
    uploadDocument
} = require("../controllers/documentController");

const router = express.Router();

const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
];

const upload = multer({

    dest: "uploads/",

    fileFilter: (req, file, cb) => {

        if (allowedTypes.includes(file.mimetype)) {

            cb(null, true);

        } else {

            cb(
                new Error(
                    "Only PDF, DOCX and TXT files are allowed"
                )
            );
        }
    }
});

router.post(
    "/upload",
    upload.single("file"),
    uploadDocument
);

module.exports = router;