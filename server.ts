import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // 0. Generate Complete Sermon Package from Chosen Scripture Text
  // (Title Suggestions, Big Idea, Intro Illustration, Full Manuscript, Outline, Exegesis Scratchpad)
  app.post("/api/gemini/sermon-from-scripture", async (req, res) => {
    try {
      const {
        passage = "Romans 8:1-17",
        version = "WEB",
        versesText = "",
        mode = "expository",
        series = "",
      } = req.body;
      const ai = getAiClient();

      const systemInstruction = `You are a senior homiletics professor and pastor.
Given a specific chosen Scripture passage and its exact verse text, generate a cohesive, biblically faithful sermon package tailored strictly to that Scripture text and the selected homiletical mode (${String(mode).toUpperCase()}).

Requirements:
1. "title": A compelling, memorable primary sermon title rooted in the chosen Scripture text.
2. "titleSuggestions": An array of 4 distinct, evocative alternative sermon titles based on this exact passage.
3. "bigIdea": A single clear sentence stating the core biblical proposition of this specific passage (Fallen Condition Focus + Gospel Remedy).
4. "introIllustration": A vivid 1-2 paragraph opening sermon illustration (story, historical snapshot, or relatable modern metaphor) that introduces the tension of this specific passage and bridges directly into reading the text.
5. "manuscriptHtml": A complete, rich HTML sermon manuscript (using <h1>, <h2>, <p>, <blockquote class="illustration-box">, <blockquote class="scripture-quote">, and <span class="cue-badge cue-pause">[PAUSE]</span> / <span class="cue-badge cue-slide">[SLIDE]</span> / <span class="cue-badge cue-response">[CONGREGATIONAL PRAYER]</span>).
   - Start with <h1>Introduction: [Hook Title]</h1> containing the opening introIllustration inside <blockquote class="illustration-box"><strong>Opening Illustration:</strong> ...</blockquote> and a bridge to the text.
   - Quote the actual verses from the chosen Scripture (${passage} ${version}) inside <blockquote class="scripture-quote">.
   - Develop 3 main homiletical points derived directly from the verses of ${passage} (${mode} style), including a Greek/Hebrew word study callout box.
   - End with a Christ-centered Conclusion & Invitation.
6. "outline": 5 structured outline sections with "name", "minutes", and "notes" matching the manuscript.
7. "scratchpad": Original Greek/Hebrew lexical insights and historical context for ${passage}.`;

      const prompt = `Chosen Scripture Reference: ${passage} (${version})
Homiletical Mode: ${mode}
Sermon Series: ${series || "Standalone"}
Exact Scripture Verses Text:
${versesText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: "Primary recommended sermon title based on the passage",
              },
              titleSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "4 alternative sermon title suggestions for this passage",
              },
              bigIdea: {
                type: Type.STRING,
                description: "One-sentence core homiletical proposition of the passage",
              },
              introIllustration: {
                type: Type.STRING,
                description: "Opening sermon illustration and bridging hook based on the passage",
              },
              manuscriptHtml: {
                type: Type.STRING,
                description: "Full HTML sermon manuscript grounded in the passage",
              },
              outline: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    minutes: { type: Type.INTEGER },
                    notes: { type: Type.STRING },
                  },
                  required: ["name", "minutes", "notes"],
                },
              },
              scratchpad: {
                type: Type.STRING,
                description: "Exegetical and Greek/Hebrew notes for the passage",
              },
            },
            required: [
              "title",
              "titleSuggestions",
              "bigIdea",
              "introIllustration",
              "manuscriptHtml",
              "outline",
              "scratchpad",
            ],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error: any) {
      console.error("Sermon from scripture generation error:", error);
      res.status(500).json({
        error:
          error?.message ||
          "Failed to generate sermon package from Scripture with Gemini.",
      });
    }
  });

  // 1. Generate Sermon Outline (Expository, Textual, or Topical)
  app.post("/api/gemini/outline", async (req, res) => {
    try {
      const {
        mode = "expository",
        title = "Untitled Sermon",
        passage = "Romans 8:1-17",
        bigIdea = "",
        versesText = "",
      } = req.body;
      const ai = getAiClient();

      const systemInstruction = `You are a professor of homiletics and biblical theology specializing in Bryan Chapell, Haddon Robinson, and John Stott's preaching methodologies.
Produce a structured sermon outline for pastors in JSON format based strictly on the chosen Scripture passage (${passage}).
The homiletical mode is: ${String(mode).toUpperCase()}.
- If EXPOSITORY: Derive sequential points from the continuous passage verse-by-verse so the biblical text governs the outline divisions.
- If TEXTUAL: Derive points directly from the grammatical clauses of the anchor verse.
- If TOPICAL: Structure points around the central doctrine/theme synthesizing biblical evidence across passages.
Include 5 outline sections totaling roughly 28-32 minutes.`;

      const prompt = `Sermon Title: ${title}
Primary Passage: ${passage}
The Big Idea: ${bigIdea || "To be developed from the text"}
Passage Text Excerpt: ${versesText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description:
                    "Clear homiletical section heading referencing the verses",
                },
                minutes: {
                  type: Type.INTEGER,
                  description:
                    "Estimated speaking duration in minutes for this section",
                },
                notes: {
                  type: Type.STRING,
                  description:
                    "Brief exegetical and pastoral summary of what to cover in this section",
                },
              },
              required: ["name", "minutes", "notes"],
            },
          },
        },
      });

      const rawText = (response.text ?? "[]").trim();
      const outline = JSON.parse(rawText);
      res.json({ outline });
    } catch (error: any) {
      console.error("Outline generation error:", error);
      res.status(500).json({
        error: error?.message || "Failed to generate sermon outline with Gemini.",
      });
    }
  });

  // 2. Original Language Word Study (Greek / Hebrew)
  app.post("/api/gemini/word-study", async (req, res) => {
    try {
      const { passage = "Romans 8:1-17", versesText = "" } = req.body;
      const ai = getAiClient();

      const systemInstruction = `You are a biblical scholar proficient in Biblical Hebrew and Koine Greek.
Provide a concise, pastor-friendly original language word study for the preaching passage (${passage}).
Identify 3 key theological terms in the passage, giving for each:
1. English word & verse reference
2. Original Greek or Hebrew transliteration & script
3. Grammatical/lexical nuance and historical context
4. Preaching takeaway for the congregation.
Write in clear, well-structured prose without markdown code fences.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Passage: ${passage}\nScripture Text:\n${versesText}`,
        config: {
          systemInstruction,
        },
      });

      res.json({ study: response.text ?? "" });
    } catch (error: any) {
      console.error("Word study error:", error);
      res.status(500).json({
        error: error?.message || "Failed to generate word study.",
      });
    }
  });

  // 3. Homiletical Intro Illustration & Story Generator (Rooted in Chosen Scripture)
  app.post("/api/gemini/illustration", async (req, res) => {
    try {
      const {
        title = "",
        passage = "",
        bigIdea = "",
        mode = "expository",
        versesText = "",
      } = req.body;
      const ai = getAiClient();

      const systemInstruction = `You are a seasoned preaching consultant. Provide 2 distinct, vivid sermon illustrations tailored directly to the chosen Scripture passage (${passage}), its verse text, and the sermon's Big Idea:
1. Opening Intro Illustration: A compelling modern or historical narrative hook that introduces the central human tension of ${passage} and bridges directly into reading the Scripture text.
2. Application Illustration: A relatable metaphor or true story that illuminates the Gospel resolution found in these verses.
Keep the tone warm, reverent, and ready for the pulpit.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Sermon Title: ${title}\nChosen Scripture Passage: ${passage}\nHomiletical Mode: ${mode}\nThe Big Idea: ${bigIdea}\nScripture Text:\n${versesText}`,
        config: {
          systemInstruction,
        },
      });

      res.json({ illustration: response.text ?? "" });
    } catch (error: any) {
      console.error("Illustration generation error:", error);
      res.status(500).json({
        error: error?.message || "Failed to generate sermon illustration.",
      });
    }
  });

  // 4. Manuscript Pacing & Flow Review
  app.post("/api/gemini/polish", async (req, res) => {
    try {
      const {
        title = "",
        passage = "",
        bigIdea = "",
        manuscriptText = "",
      } = req.body;
      const ai = getAiClient();

      const systemInstruction = `You are a homiletics speech coach and manuscript editor.
Evaluate this sermon manuscript on ${passage} for spoken delivery from the pulpit:
1. Rhetorical Cadence & Clarity: Identify phrases that work well aloud and any sentences that are too long for breath control.
2. Transitions & Scriptural Cohesion: Evaluate how smoothly each point connects back to ${passage} and the Big Idea.
3. Pulpit Delivery Cues: Suggest 2-3 specific places to pause, lower the voice, or emphasize key Gospel declarations.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Sermon Title: ${title}\nPassage: ${passage}\nBig Idea: ${bigIdea}\n\nManuscript:\n${manuscriptText.slice(
          0,
          6000
        )}`,
        config: {
          systemInstruction,
        },
      });

      res.json({ review: response.text ?? "" });
    } catch (error: any) {
      console.error("Pacing review error:", error);
      res.status(500).json({
        error: error?.message || "Failed to review sermon manuscript.",
      });
    }
  });

  // 5. Organize Raw Sermon Notes into Logical Homiletical Order
  app.post("/api/gemini/organize-notes", async (req, res) => {
    try {
      const {
        rawNotes = "",
        passage = "Romans 8:1-17",
        versesText = "",
        mode = "expository",
        framework = "expository-flow",
        currentTitle = "",
        currentBigIdea = "",
      } = req.body;
      const ai = getAiClient();

      const frameworkInstructions =
        framework === "problem-gospel-response"
          ? "Organize into a Fallen Condition Focus → Exegetical Diagnosis → Christ-Centered Gospel Resolution → Practical Response sequence."
          : framework === "classic-three-point"
          ? "Organize into a Classic Homiletical Structure: Opening Hook & Illustration → Point I → Point II → Point III → Conclusion & Charge."
          : "Organize into a sequential Expository Flow following the logical progression of the Scripture text from opening hook through each verse unit to pastoral application.";

      const systemInstruction = `You are an expert homiletics professor and pastoral editor.
A pastor has typed their raw, unstructured sermon notes, brainstormed ideas, illustrations, and verse observations.
Your task is to organize all of their raw notes into a clear, logical, preachable order anchored in their chosen Scripture passage (${passage}, mode: ${String(
        mode
      ).toUpperCase()}).

Key Rules:
1. Preserve the pastor's original insights, illustrations, observations, and voice—do not discard their specific ideas; group and refine them into logical homiletical sequence.
2. ${frameworkInstructions}
3. Provide 4 to 5 logically ordered sections ("sections"), each with:
   - "category": Role in the sermon (e.g., "1. Opening Hook & Tension", "2. Exegetical Foundation", "3. Theological Climax", "4. Practical Application & Charge")
   - "heading": Clear, memorable sermon section heading
   - "scriptureConnection": How this section ties directly to ${passage}
   - "organizedContent": Cohesive, well-ordered prose synthesized from the pastor's notes for this section
   - "keyBullets": 2-4 crisp bullet points from the pastor's notes belonging in this section
   - "transitionToNext": A natural spoken transition sentence leading into the next section
   - "estimatedMinutes": Speaking duration in minutes (total across sections ~28-32 mins)
4. Also provide a "suggestedTitle" and a one-sentence "suggestedBigIdea" distilled from the pastor's notes and ${passage}.`;

      const prompt = `Chosen Scripture Passage: ${passage}
Current Title: ${currentTitle || "Untitled"}
Current Big Idea: ${currentBigIdea || "To be synthesized"}
Homiletical Mode: ${mode}
Organization Framework: ${framework}
Scripture Text Excerpt:
${versesText}

Pastor's Raw Unstructured Sermon Notes:
${rawNotes}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestedTitle: {
                type: Type.STRING,
                description: "Compelling sermon title synthesized from the notes and passage",
              },
              suggestedBigIdea: {
                type: Type.STRING,
                description: "Single-sentence Big Idea uniting the pastor's notes and the passage",
              },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    heading: { type: Type.STRING },
                    scriptureConnection: { type: Type.STRING },
                    organizedContent: { type: Type.STRING },
                    keyBullets: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    transitionToNext: { type: Type.STRING },
                    estimatedMinutes: { type: Type.INTEGER },
                  },
                  required: [
                    "category",
                    "heading",
                    "scriptureConnection",
                    "organizedContent",
                    "keyBullets",
                    "transitionToNext",
                    "estimatedMinutes",
                  ],
                },
              },
            },
            required: ["suggestedTitle", "suggestedBigIdea", "sections"],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error: any) {
      console.error("Organize notes error:", error);
      res.status(500).json({
        error:
          error?.message || "Failed to organize sermon notes with Gemini.",
      });
    }
  });

  // 6. Scholarly Commentary Excerpts for Active Scripture Passage
  app.post("/api/gemini/commentaries", async (req, res) => {
    try {
      const {
        passage = "Romans 8:1-17",
        version = "WEB",
        versesText = "",
      } = req.body;
      const ai = getAiClient();

      const systemInstruction = `You are a distinguished biblical commentary editor and seminary professor.
Generate 4 concise, high-impact scholarly commentary excerpts for the specified Scripture passage (${passage}).
Cover these 4 distinct scholarly lenses across the 4 items:
1. "Exegetical & Lexical" (Grammatical-historical syntax, Hebrew/Greek lexical nuances, literary structure)
2. "Historical-Cultural" (Ancient Near Eastern or Second Temple / Greco-Roman background and original audience context)
3. "Historical Theology" (Insights from Patristic, Reformation, or classic orthodox commentators)
4. "Pastoral & Christological" (Redemptive-historical fulfillment in Christ and homiletical application)

Each item must be concise, substantive, and directly tied to the verses of ${passage}.`;

      const prompt = `Scripture Passage: ${passage} (${version})
Scripture Text Excerpt:
${versesText}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              commentaries: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    lens: {
                      type: Type.STRING,
                      description:
                        "One of: Exegetical & Lexical, Historical-Cultural, Historical Theology, Pastoral & Christological",
                    },
                    scholarOrTradition: {
                      type: Type.STRING,
                      description:
                        "Scholarly tradition or representative commentators (e.g. Reformed / Patristic / Pauline Exegesis)",
                    },
                    verseFocus: {
                      type: Type.STRING,
                      description: "Specific verse or sub-range within the passage",
                    },
                    thesis: {
                      type: Type.STRING,
                      description: "Concise headline summarizing the scholarly insight",
                    },
                    excerpt: {
                      type: Type.STRING,
                      description:
                        "2-4 sentence scholarly commentary excerpt unpacking the text",
                    },
                    lexicalOrContextNote: {
                      type: Type.STRING,
                      description:
                        "1-sentence note on Greek/Hebrew terms, historical setting, or canonical connection",
                    },
                  },
                  required: [
                    "lens",
                    "scholarOrTradition",
                    "verseFocus",
                    "thesis",
                    "excerpt",
                    "lexicalOrContextNote",
                  ],
                },
              },
            },
            required: ["commentaries"],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error: any) {
      console.error("Commentaries generation error:", error);
      res.status(500).json({
        error:
          error?.message || "Failed to fetch scholarly commentaries with Gemini.",
      });
    }
  });

  // 7. Scripture Context Search by Theme / Topic (Suggest & Link Relevant Passages)
  app.post("/api/gemini/context-search", async (req, res) => {
    try {
      const {
        topic = "grace",
        currentPassage = "Romans 8:1-17",
        sermonTitle = "",
        bigIdea = "",
        version = "WEB",
      } = req.body;
      const ai = getAiClient();

      const systemInstruction = `You are a biblical theologian and homiletics consultant.
A pastor is preparing a sermon on ${currentPassage} (Title: "${sermonTitle}", Big Idea: "${bigIdea}") and is searching for relevant biblical passages on the theme or topic: "${topic}".
Suggest 4 key biblical passages across the Old and New Testaments that illuminate "${topic}" and connect meaningfully to the current sermon.
For each passage, provide:
- "reference": Exact book, chapter, and verse(s) (e.g. "2 Corinthians 12:9-10")
- "book": Exact canonical Bible book name (e.g. "2 Corinthians", "Psalms", "Romans", "Isaiah")
- "chapter": Chapter number as integer
- "verseStart": Starting verse number as integer
- "verseEnd": Ending verse number as integer
- "quote": Full text of the verse(s) (${version} style)
- "thematicConnection": 1-2 sentences explaining how this passage illuminates "${topic}" and enriches the pastor's sermon on ${currentPassage}
- "testamentOrGenre": Genre label (e.g. "Pauline Epistle", "Wisdom & Psalms", "Gospel Narrative", "Prophetic Literature")`;

      const prompt = `Searched Theme / Topic: ${topic}
Current Sermon Scripture: ${currentPassage}
Current Sermon Title: ${sermonTitle}
Current Sermon Big Idea: ${bigIdea}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              passages: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    reference: { type: Type.STRING },
                    book: { type: Type.STRING },
                    chapter: { type: Type.INTEGER },
                    verseStart: { type: Type.INTEGER },
                    verseEnd: { type: Type.INTEGER },
                    quote: { type: Type.STRING },
                    thematicConnection: { type: Type.STRING },
                    testamentOrGenre: { type: Type.STRING },
                  },
                  required: [
                    "reference",
                    "book",
                    "chapter",
                    "verseStart",
                    "verseEnd",
                    "quote",
                    "thematicConnection",
                    "testamentOrGenre",
                  ],
                },
              },
            },
            required: ["passages"],
          },
        },
      });

      const rawText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
    } catch (error: any) {
      console.error("Context search error:", error);
      res.status(500).json({
        error:
          error?.message ||
          "Failed to search Scripture context with Gemini.",
      });
    }
  });

  // 8. Multimodal Audio Transcription (gemini-3.5-transcribe)
  app.post("/api/gemini/transcribe", async (req, res) => {
    try {
      const {
        audioBase64,
        mimeType = "audio/webm",
        passageContext = "",
      } = req.body;
      const ai = getAiClient();

      if (audioBase64) {
        const audioPart = {
          inlineData: {
            mimeType,
            data: audioBase64,
          },
        };
        const textPart = {
          text: `Transcribe this pastoral sermon audio recording accurately with clean punctuation, paragraph breaks, and properly capitalized biblical book and theological names.${
            passageContext ? ` Context passage: ${passageContext}.` : ""
          }`,
        };

        const response = await ai.models.generateContent({
          model: "gemini-3.5-transcribe",
          contents: { parts: [audioPart, textPart] },
        });

        return res.json({ transcript: response.text ?? "" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `Write a concise, spoken-style 1-paragraph pastoral reflection on ${
          passageContext || "Romans 8:1-17"
        } suitable for inserting directly into a sermon manuscript.`,
      });

      return res.json({ transcript: response.text ?? "" });
    } catch (error: any) {
      console.error("Audio transcription error:", error);
      res.status(500).json({
        error: error?.message || "Failed to transcribe audio with Gemini.",
      });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PulpitFlow server running on http://localhost:${PORT}`);
  });
}

startServer();
