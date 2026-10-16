const mongoose = require("mongoose");

const documentChunkSchema = new mongoose.Schema({

    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    fileName: {
        type: String,
        required: true
    },

    text: {
        type: String,
        required: true
    },

    embedding: {
        type: [Number],
        required: true
    },

    chunkIndex: {
        type: Number,
        required: true
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    "DocumentChunk",
    documentChunkSchema
);