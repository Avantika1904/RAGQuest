require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const documentRoutes = require("./routes/documentRoutes");
const chatRoutes = require("./routes/chatRoutes");
const app = express();


app.use(cors());
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
    res.send("RAG Chatbot Backend Running");
});
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});