const chunkText = (text, chunkSize = 500, overlap = 50) => {

    const words = text.split(/\s+/);

    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize - overlap) {

        const chunk = words
            .slice(i, i + chunkSize)
            .join(" ");

        chunks.push(chunk);
    }

    return chunks;
};

module.exports = chunkText;