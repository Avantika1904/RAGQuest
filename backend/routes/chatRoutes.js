
const express = require("express");

const {
    askQuestion,
    getChats,
    getChatById,
    deleteChat
} = require("../controllers/chatController");

const router = express.Router();

// Ask a question about the uploaded document
router.post("/ask", askQuestion);

// Get all saved chats
router.get("/", getChats);

// Get a specific chat with all its messages
router.get("/:chatId", getChatById);

// Delete a chat and its associated document chunks
router.delete("/:chatId", deleteChat);

module.exports = router;
