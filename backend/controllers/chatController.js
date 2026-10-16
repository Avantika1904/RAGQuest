
const mongoose = require("mongoose");

const DocumentChunk = require("../models/DocumentChunk");
const Chat = require("../models/Chat");

const createEmbedding = require("../services/embeddingService");
const cosineSimilarity = require("../services/similarityService");
const generateAnswer = require("../services/geminiService");


// =====================================
// 1. ASK QUESTION
// =====================================

const askQuestion = async (req, res) => {
    try {
        const { question, documentId } = req.body;

        // Validate question
        if (!question || !question.trim()) {
            return res.status(400).json({
                message: "Question is required"
            });
        }

        // Validate document ID
        if (!documentId || !mongoose.isValidObjectId(documentId)) {
            return res.status(400).json({
                message: "Valid document ID is required"
            });
        }

        // Find existing chat
        const chat = await Chat.findOne({
            documentId: documentId
        });

        if (!chat) {
            return res.status(404).json({
                message: "Chat not found"
            });
        }

        // Get document chunks
        const chunks = await DocumentChunk.find({
            documentId: documentId
        });

        if (chunks.length === 0) {
            return res.status(404).json({
                message: "Document knowledge base not found"
            });
        }

        // Create question embedding
        const questionEmbedding = await createEmbedding(
            question.trim()
        );

        // Calculate cosine similarity
        const results = chunks.map((chunk) => {
            const similarity = cosineSimilarity(
                questionEmbedding,
                chunk.embedding
            );

            return {
                fileName: chunk.fileName,
                text: chunk.text,
                chunkIndex: chunk.chunkIndex,
                similarity: similarity
            };
        });

        // Sort by highest similarity
        results.sort(
            (a, b) => b.similarity - a.similarity
        );

        // Select top 3 relevant chunks
        const topChunks = results.slice(0, 3);

        // Build context for Gemini
        const context = topChunks
            .map((chunk) => chunk.text)
            .join("\n\n");

        // Generate answer
        // Previous messages are NOT passed to Gemini
        const answer = await generateAnswer(
            question.trim(),
            context
        );

        // Track sources
        const sources = topChunks.map((chunk) => ({
            fileName: chunk.fileName,
            chunkIndex: chunk.chunkIndex
        }));

        // Save user question
        chat.messages.push({
            role: "user",
            text: question.trim()
        });

        // Save assistant answer
        chat.messages.push({
            role: "assistant",
            text: answer,
            sources: sources
        });

        // Save updated conversation
        await chat.save();

        // Send response
        return res.status(200).json({
            question: question.trim(),
            answer: answer,
            sources: sources,
            chatId: chat._id
        });

    } catch (error) {
        console.error("Chat Error:", error.message);

        const status = error.status || error.statusCode;

        if (status === 503) {
            return res.status(503).json({
                message:
                    "Gemini is currently experiencing high demand. Please try again shortly."
            });
        }

        if (status === 429) {
            return res.status(429).json({
                message:
                    "Gemini API rate limit reached. Please try again after the limit resets."
            });
        }

        return res.status(500).json({
            message: "Error generating answer",
            error: error.message
        });
    }
};


// =====================================
// 2. GET ALL CHATS
// =====================================

const getChats = async (req, res) => {
    try {
        const chats = await Chat.find()
            .sort({ updatedAt: -1 })
            .select(
                "_id documentId fileName createdAt updatedAt"
            );

        return res.status(200).json(chats);

    } catch (error) {
        console.error(
            "Chat History Error:",
            error.message
        );

        return res.status(500).json({
            message: "Error loading chat history",
            error: error.message
        });
    }
};


// =====================================
// 3. GET ONE CHAT BY ID
// =====================================

const getChatById = async (req, res) => {
    try {
        const { chatId } = req.params;

        // Validate chat ID
        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                message: "Invalid chat ID"
            });
        }

        // Find chat and its messages
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({
                message: "Chat not found"
            });
        }

        return res.status(200).json(chat);

    } catch (error) {
        console.error(
            "Get Chat Error:",
            error.message
        );

        return res.status(500).json({
            message: "Error loading chat",
            error: error.message
        });
    }
};

// =====================================
// DELETE CHAT
// =====================================

const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;

        if (!mongoose.isValidObjectId(chatId)) {
            return res.status(400).json({
                message: "Invalid chat ID"
            });
        }

        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({
                message: "Chat not found"
            });
        }

        // Delete document chunks belonging to this chat
        await DocumentChunk.deleteMany({
            documentId: chat.documentId
        });

        // Delete chat and all its messages
        await Chat.findByIdAndDelete(chatId);

        return res.status(200).json({
            message: "Chat deleted successfully"
        });

    } catch (error) {
        console.error("Delete Chat Error:", error.message);

        return res.status(500).json({
            message: "Error deleting chat",
            error: error.message
        });
    }
};
// =====================================
// EXPORT CONTROLLERS
// =====================================

module.exports = {
    askQuestion,
    getChats,
    getChatById,
    deleteChat
};