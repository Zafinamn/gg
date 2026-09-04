import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Support larger PDF payloads (up to 100MB PDF files which encode to ~135MB Base64)
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

// Local storage directory for shared catalogs
const STORAGE_DIR = path.join(process.cwd(), "data", "catalogs");
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// In-memory cache for parsed documents so chat queries don't need re-sending full PDF base64 every time
interface CachedDoc {
  id: string;
  filename: string;
  base64: string;
  summaryData?: any;
  createdAt: number;
}

const docCache = new Map<string, CachedDoc>();

// Clean up documents older than 2 hours to avoid memory growth
setInterval(() => {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, doc] of docCache.entries()) {
    if (doc.createdAt < twoHoursAgo) {
      docCache.delete(id);
    }
  }
}, 15 * 60 * 1000);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Save Catalog for Sharing
app.post("/api/catalogs", async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename, fileSize, pdfBase64 } = req.body;

    if (!pdfBase64) {
      res.status(400).json({ error: "Missing PDF catalog data." });
      return;
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
    // Generate clean 8-character catalog ID
    const catalogId = "cat-" + crypto.randomBytes(4).toString("hex");

    const record = {
      id: catalogId,
      filename: filename || "G&G Catalog.pdf",
      fileSize: fileSize || Math.round(cleanBase64.length * 0.75),
      pdfBase64: cleanBase64,
      createdAt: Date.now(),
    };

    // Store in-memory cache
    docCache.set(catalogId, {
      id: catalogId,
      filename: record.filename,
      base64: cleanBase64,
      createdAt: record.createdAt,
    });

    // Persist to disk so it stays available across server restarts
    const filePath = path.join(STORAGE_DIR, `${catalogId}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(record), "utf8");

    res.json({
      id: catalogId,
      filename: record.filename,
      fileSize: record.fileSize,
      sharePath: `/share/${catalogId}`,
    });
  } catch (error: any) {
    console.error("Save shared catalog error:", error);
    res.status(500).json({ error: "Failed to create catalog share link." });
  }
});

// Retrieve Shared Catalog
app.get("/api/catalogs/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      res.status(400).json({ error: "Invalid catalog ID." });
      return;
    }

    // Check memory cache
    if (docCache.has(id)) {
      const cached = docCache.get(id)!;
      res.json({
        id: cached.id,
        filename: cached.filename,
        pdfBase64: cached.base64,
        createdAt: cached.createdAt,
      });
      return;
    }

    // Check disk storage
    const filePath = path.join(STORAGE_DIR, `${id}.json`);
    if (fs.existsSync(filePath)) {
      const content = await fs.promises.readFile(filePath, "utf8");
      const record = JSON.parse(content);

      // Re-populate memory cache
      docCache.set(id, {
        id: record.id,
        filename: record.filename,
        base64: record.pdfBase64,
        createdAt: record.createdAt || Date.now(),
      });

      res.json({
        id: record.id,
        filename: record.filename,
        fileSize: record.fileSize,
        pdfBase64: record.pdfBase64,
        createdAt: record.createdAt,
      });
      return;
    }

    res.status(404).json({ error: "Catalog not found or link has expired." });
  } catch (error: any) {
    console.error("Get shared catalog error:", error);
    res.status(500).json({ error: "Failed to load shared catalog." });
  }
});

// PDF Analysis Endpoint
app.post("/api/analyze-pdf", async (req: Request, res: Response): Promise<void> => {
  try {
    const { pdfBase64, filename, fileSize } = req.body;

    if (!pdfBase64) {
      res.status(400).json({ error: "Missing PDF data. Please select a valid PDF file." });
      return;
    }

    // Clean base64 string if it contains data URI header
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();

    // Check approximate size (base64 string length * 0.75)
    const approximateBytes = cleanBase64.length * 0.75;
    if (approximateBytes > 30 * 1024 * 1024) {
      res.status(400).json({ error: "PDF file is too large. Please upload a file under 30MB." });
      return;
    }

    const docId = crypto.randomUUID();
    docCache.set(docId, {
      id: docId,
      filename: filename || "document.pdf",
      base64: cleanBase64,
      createdAt: Date.now(),
    });

    const ai = getGeminiClient();

    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: cleanBase64,
      },
    };

    const promptText = `Analyze this PDF thoroughly and extract a comprehensive, structured understanding suitable for an intuitive user dashboard.

Provide:
1. A clear, high-level summary (2-3 engaging, easily readable sentences).
2. Key points: 4 to 6 concise bullet points highlighting the core takeaways.
3. Important sections: 3 to 5 key sections or topics covered, with title and 1-2 sentence description.
4. Main topics: A list of 4 to 8 topic tags.
5. Important numbers, dates, and metrics: Up to 6 key specific data points found in the document (such as dates, financial figures, percentages, milestones, or deadlines).
6. Document type: Category (e.g. Financial Report, Contract, Academic Paper, Resume, User Manual, Policy Document, Technical Spec, Invoice, Article, Presentation).
7. Reading time estimate in minutes.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        pdfPart,
        { text: promptText },
      ],
      config: {
        systemInstruction: "You are an expert document analyst AI. You carefully extract accurate facts, numbers, dates, and summaries from uploaded PDF documents. Never invent facts. Ensure high accuracy and readability for non-technical users.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "High-level summary of the document in 2-3 clear sentences.",
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "4-6 essential takeaways from the PDF.",
            },
            importantSections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["title", "description"],
              },
              description: "Major sections or logical parts of the document.",
            },
            mainTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "4-8 core topic keywords or tags.",
            },
            importantData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "Name or metric, e.g., 'Revenue' or 'Effective Date'" },
                  value: { type: Type.STRING, description: "Specific value, e.g., '$4.2M' or 'Oct 15, 2025'" },
                  category: { type: Type.STRING, description: "'date', 'number', 'fact', or 'other'" },
                },
                required: ["label", "value", "category"],
              },
              description: "Important numbers, dates, and facts in the document.",
            },
            documentType: {
              type: Type.STRING,
              description: "Document genre or type.",
            },
            readingTimeMinutes: {
              type: Type.INTEGER,
              description: "Estimated reading time in minutes.",
            },
          },
          required: ["summary", "keyPoints", "importantSections", "mainTopics", "importantData", "documentType"],
        },
      },
    });

    const textOutput = response.text || "{}";
    let parsedResult;
    try {
      parsedResult = JSON.parse(textOutput);
    } catch {
      parsedResult = {
        summary: "Document successfully processed.",
        keyPoints: ["Document analysis completed."],
        importantSections: [],
        mainTopics: ["General"],
        importantData: [],
        documentType: "Document",
        readingTimeMinutes: 3,
      };
    }

    // Save in cache
    const cached = docCache.get(docId);
    if (cached) {
      cached.summaryData = parsedResult;
    }

    res.json({
      docId,
      filename: filename || "document.pdf",
      fileSize: fileSize || 0,
      analysis: parsedResult,
    });
  } catch (error: any) {
    console.error("PDF analysis error:", error);
    const message =
      error?.message?.includes("API_KEY")
        ? "AI service is currently initializing. Please verify configuration."
        : "Something went wrong while processing your PDF. Please try again.";
    res.status(500).json({ error: message, details: error?.message });
  }
});

// PDF Interactive Chat Endpoint
app.post("/api/chat-pdf", async (req: Request, res: Response): Promise<void> => {
  try {
    const { docId, message, chatHistory, pdfBase64 } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Please provide a question to ask." });
      return;
    }

    // Retrieve cached PDF base64 or use provided
    let base64 = pdfBase64 ? pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim() : null;
    if (!base64 && docId && docCache.has(docId)) {
      base64 = docCache.get(docId)!.base64;
    }

    if (!base64) {
      res.status(400).json({ error: "Document session expired or not found. Please re-upload the PDF." });
      return;
    }

    const ai = getGeminiClient();

    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: base64,
      },
    };

    // Format chat history for context
    const historyText = Array.isArray(chatHistory) && chatHistory.length > 0
      ? "Previous conversation context:\n" +
        chatHistory
          .slice(-6)
          .map((item: any) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
          .join("\n\n") +
        "\n\n"
      : "";

    const userPrompt = `${historyText}User question about this PDF: ${message}

Instructions:
- Base your response strictly on the PDF document provided.
- If the question cannot be answered from the content of the PDF, explicitly say: "This information cannot be found in the provided document."
- Never invent facts, figures, or details.
- Keep the answer concise, intuitive, and easy to understand.
- Use clear bullet points and bold highlights where appropriate.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        pdfPart,
        { text: userPrompt },
      ],
      config: {
        systemInstruction: "You are a specialized PDF analysis assistant. Your role is to help users understand the uploaded PDF clearly and accurately. Answer questions using the PDF as your sole primary source. Always preserve exact numbers, names, dates, and facts. When information is not present in the document, explicitly say so.",
      },
    });

    const reply = response.text || "I was unable to generate a response from the document.";
    res.json({ answer: reply });
  } catch (error: any) {
    console.error("PDF chat error:", error);
    res.status(500).json({
      error: "Something went wrong while analyzing your question. Please try again.",
      details: error?.message,
    });
  }
});

// Vite middleware & Express static setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
