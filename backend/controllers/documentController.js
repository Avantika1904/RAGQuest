const mongoose = require("mongoose");
const extractText = require("../services/textExtractor");
const chunkText = require("../services/chunkText");
const createEmbedding = require("../services/embeddingService");
const DocumentChunk = require("../models/DocumentChunk");
const Chat = require("../models/Chat");

const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded"
            });
        }

        // Create unique ID for this document
        const documentId = new mongoose.Types.ObjectId();

        // Extract document text
        const text = await extractText(req.file);

        // Break document into chunks
        const chunks = chunkText(text);

        // Create embeddings and store chunks
        for (let i = 0; i < chunks.length; i++) {

            const embedding = await createEmbedding(chunks[i]);

            await DocumentChunk.create({
                documentId: documentId,
                fileName: req.file.originalname,
                text: chunks[i],
                embedding: embedding,
                chunkIndex: i
            });
        }


        // Create chat for this document
        const chat = await Chat.create({
            documentId: documentId,
            fileName: req.file.originalname,
            messages: []
        });


        res.status(200).json({
            message: "Document added to knowledge base successfully",

            documentId: documentId,

            chatId: chat._id,

            fileName: req.file.originalname,

            totalChunks: chunks.length
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Error processing document",
            error: error.message
        });
    }
};

module.exports = { uploadDocument };