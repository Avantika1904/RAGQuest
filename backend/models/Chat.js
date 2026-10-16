const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true
        },

        text: {
            type: String,
            required: true
        },

        sources: [
            {
                fileName: String,
                chunkIndex: Number
            }
        ]
    },
    {
        _id: false
    }
);


const chatSchema = new mongoose.Schema(
    {
        documentId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            unique: true
        },

        fileName: {
            type: String,
            required: true
        },

        messages: {
            type: [messageSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);


module.exports = mongoose.model("Chat", chatSchema);