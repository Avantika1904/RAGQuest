const fs = require("fs");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");

const extractText = async (file) => {

    const filePath = file.path;
    const fileType = file.mimetype;

    // PDF
    if (fileType === "application/pdf") {

        const buffer = fs.readFileSync(filePath);

        const parser = new PDFParse({
            data: buffer
        });

        const result = await parser.getText();

        await parser.destroy();

        return result.text;
    }

    // DOCX
    else if (
        fileType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {

        const result = await mammoth.extractRawText({
            path: filePath
        });

        return result.value;
    }

    // TXT
    else if (fileType === "text/plain") {

        return fs.readFileSync(filePath, "utf8");
    }

    else {

        throw new Error("Unsupported file type");
    }
};

module.exports = extractText;