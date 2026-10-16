
import { useEffect, useRef, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

function App() {
  const [file, setFile] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeFileName, setActiveFileName] = useState("");

  const [uploadMessage, setUploadMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);

  const [chatHistory, setChatHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [openingChat, setOpeningChat] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState(null);

  const fileInputRef = useRef(null);
  const conversationRef = useRef(null);

  const busy = uploading || asking || openingChat;

  // =====================================
  // HELPER: PARSE API RESPONSE
  // =====================================

  const readResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error(
        "Backend returned an invalid response. Check that the backend is running on port 5000."
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  };

  // =====================================
  // LOAD CHAT HISTORY
  // =====================================

  const loadChatHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError("");

      const response = await fetch(`${API}/chat`);
      const data = await readResponse(response);

      setChatHistory(data);
    } catch (error) {
      setHistoryError(error.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, []);

  // Scroll to latest message
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop =
        conversationRef.current.scrollHeight;
    }
  }, [messages, asking]);

  // =====================================
  // NEW CHAT
  // =====================================

  const newChat = () => {
    setFile(null);
    setDocumentId(null);
    setActiveChatId(null);
    setActiveFileName("");
    setQuestion("");
    setMessages([]);
    setUploadMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =====================================
  // OPEN SAVED CHAT
  // =====================================

  const openChat = async (chatId) => {
    if (busy || deletingChatId) return;

    try {
      setOpeningChat(true);
      setHistoryError("");

      const response = await fetch(`${API}/chat/${chatId}`);
      const data = await readResponse(response);

      setActiveChatId(data._id);
      setDocumentId(data.documentId);
      setActiveFileName(data.fileName);
      setMessages(data.messages || []);
      setQuestion("");
      setFile(null);
      setUploadMessage("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setHistoryError(error.message);
    } finally {
      setOpeningChat(false);
    }
  };

  // =====================================
  // DELETE CHAT
  // =====================================

  const deleteChat = async (chatId) => {
    if (busy || deletingChatId) return;

    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this chat and its document?"
    );

    if (!confirmed) return;

    try {
      setDeletingChatId(chatId);
      setHistoryError("");

      const response = await fetch(`${API}/chat/${chatId}`, {
        method: "DELETE",
      });

      await readResponse(response);

      // Remove deleted chat from sidebar immediately
      setChatHistory((prev) =>
        prev.filter((chat) => chat._id !== chatId)
      );

      // Reset main chat if currently opened chat was deleted
      if (activeChatId === chatId) {
        newChat();
      }

      await loadChatHistory();
    } catch (error) {
      setHistoryError(error.message);
    } finally {
      setDeletingChatId(null);
    }
  };

  // =====================================
  // UPLOAD DOCUMENT
  // =====================================

  const uploadDocument = async () => {
    if (!file || busy || deletingChatId) return;

    try {
      setUploading(true);
      setUploadMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await readResponse(response);

      setDocumentId(data.documentId);
      setActiveChatId(data.chatId);
      setActiveFileName(data.fileName);
      setMessages([]);
      setQuestion("");

      setUploadMessage("Document uploaded successfully!");

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadChatHistory();
    } catch (error) {
      setUploadMessage(error.message);
    } finally {
      setUploading(false);
    }
  };

  // =====================================
  // ASK QUESTION
  // =====================================

  const askQuestion = async () => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || !documentId || busy || deletingChatId) {
      return;
    }

    const userMessage = {
      role: "user",
      text: trimmedQuestion,
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setAsking(true);

    try {
      const response = await fetch(`${API}/chat/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          documentId,
        }),
      });

      const data = await readResponse(response);

      const assistantMessage = {
        role: "assistant",
        text: data.answer,
        sources: data.sources || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      await loadChatHistory();
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: error.message,
          isError: true,
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  // =====================================
  // UNIQUE SOURCES
  // =====================================

  const getUniqueSources = (sources = []) => {
    return [...new Set(sources.map((source) => source.fileName))];
  };

  // =====================================
  // UI
  // =====================================

  return (
    <div className="app">
      <div className="glow glow-one"></div>
      <div className="glow glow-two"></div>

      <div className="dashboard">

        {/* =====================================
            LEFT 30% - CHAT HISTORY
        ===================================== */}

        <aside className="chat-sidebar">

          <div className="sidebar-brand">
            <div className="brand-symbol">✦</div>

            <div>
              <h2>RAGQuest</h2>
              <p>Document Intelligence</p>
            </div>
          </div>

          <button
            className="new-chat-button"
            onClick={newChat}
            disabled={busy || Boolean(deletingChatId)}
          >
            <span>+</span>
            New Chat
          </button>

          <div className="history-heading">
            <span>CHAT HISTORY</span>

            <span className="history-count">
              {chatHistory.length}
            </span>
          </div>

          {historyLoading && (
            <p className="history-status">
              Loading chats...
            </p>
          )}

          {historyError && (
            <p className="history-error">
              {historyError}
            </p>
          )}

          <div className="history-list">
            {!historyLoading &&
              chatHistory.length === 0 &&
              !historyError && (
                <p className="history-status">
                  No chats yet. Upload a document to start.
                </p>
              )}

            {chatHistory.map((chat) => (
              <div
                key={chat._id}
                className={`history-item ${
                  activeChatId === chat._id ? "active" : ""
                }`}
              >
                <button
                  type="button"
                  className="history-open"
                  onClick={() => openChat(chat._id)}
                  disabled={busy || Boolean(deletingChatId)}
                  title={chat.fileName}
                >
                  <span className="history-icon">
                    ▤
                  </span>

                  <span className="history-details">
                    <span className="history-name">
                      {chat.fileName}
                    </span>

                    <span className="history-date">
                      {new Date(
                        chat.updatedAt
                      ).toLocaleDateString()}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  className="history-delete"
                  onClick={() => deleteChat(chat._id)}
                  disabled={busy || Boolean(deletingChatId)}
                  title="Delete chat"
                  aria-label={`Delete ${chat.fileName}`}
                >
                  {deletingChatId === chat._id ? "..." : "🗑"}
                </button>
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <span className="online-dot"></span>
            RAG-Powered Assistant
          </div>
        </aside>

        {/* =====================================
            RIGHT 70% - MAIN CHAT
        ===================================== */}

        <main className="main-content">

          <header className="header">
            <div className="header-title">
              <span className="header-symbol">
                ✦
              </span>

              <div>
                <h2>
                  {activeFileName || "Document Assistant"}
                </h2>

                <span>
                  Ask questions from your uploaded document
                </span>
              </div>
            </div>

            <div className={`status ${documentId ? "ready" : ""}`}>
              <span className="status-dot"></span>

              {documentId
                ? "Document Ready"
                : "No Document"}
            </div>
          </header>

          <div className="glass-panel">

            {!documentId && (
              <div className="welcome">
                <p className="small-title">
                  AI-POWERED DOCUMENT CHAT
                </p>

                <h1>
                  Welcome to <span>RAGQuest</span>
                </h1>

                <p>
                  Upload your document and ask questions.
                  Get AI-generated answers based on relevant
                  information retrieved from your document.
                </p>
              </div>
            )}

            {/* DOCUMENT UPLOAD */}

            <section className="section">
              <div className="section-heading">
                <div>
                  <p className="step">
                    STEP 01
                  </p>

                  <h3>Upload Document</h3>
                </div>

                {documentId && (
                  <span className="connected">
                    ● READY
                  </span>
                )}
              </div>

              {activeFileName && (
                <div className="active-document">
                  <span>▤</span>

                  <div>
                    <small>ACTIVE DOCUMENT</small>
                    <strong>{activeFileName}</strong>
                  </div>
                </div>
              )}

              <label className="file-upload">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.txt"
                  disabled={busy || Boolean(deletingChatId)}
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setUploadMessage("");
                  }}
                />

                <span className="upload-icon">
                  ↑
                </span>

                <span className="upload-info">
                  <strong>
                    {file
                      ? file.name
                      : "Choose a document"}
                  </strong>

                  <span>
                    Supports DOCX and TXT files
                  </span>
                </span>

                <span className="browse">
                  Browse Files
                </span>
              </label>

              <button
                className="gradient-button"
                onClick={uploadDocument}
                disabled={!file || busy || Boolean(deletingChatId)}
              >
                {uploading
                  ? "Processing Document..."
                  : "Upload & Process Document"}
              </button>

              {uploadMessage && (
                <p className="upload-message">
                  {uploadMessage}
                </p>
              )}
            </section>

            {/* CONVERSATION */}

            <section className="section">
              <div className="section-heading">
                <div>
                  <p className="step">
                    STEP 02
                  </p>

                  <h3>Ask Questions</h3>
                </div>
              </div>

              <div
                className="conversation"
                ref={conversationRef}
              >
                {messages.length === 0 && !asking ? (
                  <div className="empty-chat">
                    <span className="empty-icon">
                      ✦
                    </span>

                    <h3>
                      {documentId
                        ? "Ready for your questions"
                        : "No document selected"}
                    </h3>

                    <p>
                      {documentId
                        ? "Ask anything about your uploaded document."
                        : "Upload a document or select a previous chat."}
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`message-row ${
                        message.role === "user"
                          ? "user-row"
                          : "assistant-row"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="message-avatar">
                          ✦
                        </div>
                      )}

                      <div
                        className={`message-bubble ${
                          message.role === "user"
                            ? "user-message"
                            : "assistant-message"
                        } ${
                          message.isError
                            ? "error-message"
                            : ""
                        }`}
                      >
                        <span className="message-role">
                          {message.role === "user"
                            ? "You"
                            : "RAGQuest"}
                        </span>

                        <p>{message.text}</p>

                        {message.sources?.length > 0 && (
                          <div className="message-sources">
                            <span className="sources-label">
                              SOURCES
                            </span>

                            {getUniqueSources(
                              message.sources
                            ).map((source, i) => (
                              <div
                                className="source"
                                key={i}
                              >
                                ▤ {source}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {asking && (
                  <div className="message-row assistant-row">
                    <div className="message-avatar">
                      ✦
                    </div>

                    <div className="message-bubble assistant-message">
                      <span className="message-role">
                        RAGQuest
                      </span>

                      <p>Generating answer...</p>
                    </div>
                  </div>
                )}
              </div>

              <form
                className="chat-input"
                onSubmit={(e) => {
                  e.preventDefault();
                  askQuestion();
                }}
              >
                <input
                  type="text"
                  placeholder={
                    documentId
                      ? "Ask a question about your document..."
                      : "Upload a document to start chatting..."
                  }
                  value={question}
                  onChange={(e) =>
                    setQuestion(e.target.value)
                  }
                  disabled={
                    !documentId ||
                    busy ||
                    Boolean(deletingChatId)
                  }
                />

                <button
                  type="submit"
                  disabled={
                    !documentId ||
                    !question.trim() ||
                    busy ||
                    Boolean(deletingChatId)
                  }
                  aria-label="Send question"
                >
                  ↑
                </button>
              </form>
            </section>
          </div>

          <p className="footer">
            RAGQuest · Powered by Retrieval-Augmented Generation
          </p>
        </main>
      </div>
    </div>
  );
}

export default App;
