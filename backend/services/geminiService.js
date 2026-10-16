const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const generateAnswer = async (question, context) => {

    const prompt = `
Answer the question using ONLY the provided context.

If the answer is not available in the context, say:
"I could not find this information in the uploaded document."

Context:
${context}

Question:
${question}

Give a clear and concise answer.
`;

    const interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: prompt
    });

    return interaction.output_text;
};

module.exports = generateAnswer;