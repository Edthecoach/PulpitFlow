/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileText,
  HelpCircle,
  Highlighter,
  Lightbulb,
  List,
  ListOrdered,
  Mic,
  Pause,
  Play,
  Plus,
  Printer,
  Quote,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  Check,
  Columns,
  Grid,
  Filter,
  Wand2,
  Layers,
} from "lucide-react";
import {
  BIBLE_BOOK_CHAPTERS,
  BIBLE_BOOK_GROUPS,
  buildSermonPackageFromPassage,
  DEFAULT_SERMONS,
  EMBEDDED_BIBLE,
  getSampleRawNotesForPassage,
  HomileticalMode,
  NotesOrganizationFramework,
  OrganizedNoteSection,
  organizeRawNotesLocally,
  PASSAGE_THEMES_MAP,
  QUICK_JUMP_REFS,
  SermonDocument,
  VerseItem,
} from "./data/bibleData";

const STORAGE_KEY = "pulpitflow_sermons_v3";

function formatSpokenPunctuation(text: string): string {
  return text
    .replace(/\bperiod\b/gi, ".")
    .replace(/\bcomma\b/gi, ",")
    .replace(/\bquestion mark\b/gi, "?")
    .replace(/\bexclamation point\b/gi, "!")
    .replace(/\bcolon\b/gi, ":")
    .replace(/\bsemicolon\b/gi, ";")
    .replace(/\bnew paragraph\b/gi, "\n\n")
    .replace(/\bnew line\b/gi, "\n");
}

export default function App() {
  // Sermons state
  const [sermons, setSermons] = useState<SermonDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load sermons from localStorage:", e);
    }
    return DEFAULT_SERMONS;
  });

  const [currentSermonId, setCurrentSermonId] = useState<string>(() => {
    return sermons[0]?.id || "sermon-1";
  });

  const currentSermon =
    sermons.find((s) => s.id === currentSermonId) || sermons[0];

  // Auto-save indicator
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving...">("Saved");

  useEffect(() => {
    try {
      setSaveStatus("Saving...");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sermons));
      const timer = setTimeout(() => setSaveStatus("Saved"), 600);
      return () => clearTimeout(timer);
    } catch (e) {
      console.warn("Save error:", e);
    }
  }, [sermons]);

  // Layout & Split State
  const [bibleSplitPercent, setBibleSplitPercent] = useState<number>(50);
  const [mobileShowBible, setMobileShowBible] = useState<boolean>(true);

  // Dropdowns & Modals
  const [showSermonMenu, setShowSermonMenu] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showAiMenu, setShowAiMenu] = useState<boolean>(false);
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);
  const [showPreachModal, setShowPreachModal] = useState<boolean>(false);
  const [showTranscribeModal, setShowTranscribeModal] = useState<boolean>(false);
  const [showHomileticGuide, setShowHomileticGuide] = useState<boolean>(false);

  // Interactive Chapter & Verse Grid Picker Popover
  const [showGridPicker, setShowGridPicker] = useState<boolean>(false);
  const [gridPickerTab, setGridPickerTab] = useState<
    "book" | "chapter" | "verse"
  >("chapter");

  // Bible Reader State
  const [bibleBook, setBibleBook] = useState<string>("Romans");
  const [bibleChapter, setBibleChapter] = useState<number>(8);
  const [bibleVersion, setBibleVersion] = useState<string>("WEB");
  const [passageVerses, setPassageVerses] = useState<VerseItem[]>(
    EMBEDDED_BIBLE["Romans 8"] || []
  );
  const [isLoadingBible, setIsLoadingBible] = useState<boolean>(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>("");
  const [bibleTab, setBibleTab] = useState<"reader" | "themes" | "scratchpad">(
    "reader"
  );

  // Verse Range Filter & Selection State (null = All Verses)
  const [verseStartFilter, setVerseStartFilter] = useState<number | null>(1);
  const [verseEndFilter, setVerseEndFilter] = useState<number | null>(17);
  const [filterOnlyRange, setFilterOnlyRange] = useState<boolean>(false);

  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [highlightedVerses, setHighlightedVerses] = useState<
    Record<string, "yellow" | "green" | "blue">
  >(() => {
    try {
      const saved = localStorage.getItem("pulpitflow_verse_highlights_v1");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [copiedVerseNum, setCopiedVerseNum] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        "pulpitflow_verse_highlights_v1",
        JSON.stringify(highlightedVerses)
      );
    } catch {}
  }, [highlightedVerses]);

  const setVerseHighlightColor = (
    hlKey: string,
    color: "yellow" | "green" | "blue"
  ) => {
    setHighlightedVerses((prev) => {
      const next = { ...prev };
      if (next[hlKey] === color) {
        delete next[hlKey];
      } else {
        next[hlKey] = color;
      }
      return next;
    });
  };

  const bibleReaderScrollRef = useRef<HTMLDivElement | null>(null);

  // Right Pane Mode
  const [editorViewMode, setEditorViewMode] = useState<
    "manuscript" | "organizer" | "outline"
  >("manuscript");
  const [notesFramework, setNotesFramework] =
    useState<NotesOrganizationFramework>("expository-flow");
  const [organizerSuggestedTitle, setOrganizerSuggestedTitle] =
    useState<string>("");
  const [organizerSuggestedBigIdea, setOrganizerSuggestedBigIdea] =
    useState<string>("");
  const [newTopicalRef, setNewTopicalRef] = useState<string>("");
  const [speakingPace, setSpeakingPace] = useState<number>(140);
  const [showTitleSuggestions, setShowTitleSuggestions] =
    useState<boolean>(true);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Rich Text Editor Ref & Cursor Tracking
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const lastCursorRangeRef = useRef<Range | null>(null);
  const isInternalEditorUpdate = useRef<boolean>(false);

  // Sync editor HTML when switching sermons or when notes are externally updated
  useEffect(() => {
    if (editorRef.current && !isInternalEditorUpdate.current) {
      if (editorRef.current.innerHTML !== currentSermon.notes) {
        editorRef.current.innerHTML = currentSermon.notes || "<p></p>";
      }
    }
    isInternalEditorUpdate.current = false;
  }, [currentSermonId, currentSermon.notes]);

  const updateCurrentSermon = (patch: Partial<SermonDocument>) => {
    setSermons((prev) =>
      prev.map((s) => (s.id === currentSermon.id ? { ...s, ...patch } : s))
    );
  };

  const saveEditorSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        lastCursorRangeRef.current = range.cloneRange();
      }
    }
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    isInternalEditorUpdate.current = true;
    updateCurrentSermon({ notes: editorRef.current.innerHTML });
    saveEditorSelection();
  };

  const insertHtmlAtCursor = (html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (lastCursorRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(lastCursorRangeRef.current);
      }
    }
    document.execCommand("insertHTML", false, html);
    isInternalEditorUpdate.current = true;
    updateCurrentSermon({ notes: editorRef.current.innerHTML });
    saveEditorSelection();
  };

  const execEditorFormat = (cmd: string, val?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (lastCursorRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(lastCursorRangeRef.current);
      }
    }
    document.execCommand(cmd, false, val);
    isInternalEditorUpdate.current = true;
    updateCurrentSermon({ notes: editorRef.current.innerHTML });
    saveEditorSelection();
  };

  // Scroll to a specific verse in the Bible reader
  const scrollToVerseElement = (vNum: number) => {
    setTimeout(() => {
      const el = document.getElementById(`bible-verse-row-${vNum}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 80);
  };

  // Apply a verse or verse range selection
  const applyVerseRangeSelection = (
    startV: number | null,
    endV: number | null,
    versesList: VerseItem[] = passageVerses
  ) => {
    setVerseStartFilter(startV);
    setVerseEndFilter(endV);

    if (startV === null) {
      setSelectedVerses([]);
      setFilterOnlyRange(false);
      return;
    }

    const effectiveEnd = endV !== null && endV >= startV ? endV : startV;
    const rangeNums = versesList
      .filter((v) => v.v >= startV && v.v <= effectiveEnd)
      .map((v) => v.v);
    setSelectedVerses(rangeNums);
    scrollToVerseElement(startV);
  };

  // Load Bible Passage (Chapter + Optional Verse Range)
  const loadBiblePassage = async (
    book: string,
    chapter: number,
    version: string,
    targetVerseStart: number | null = null,
    targetVerseEnd: number | null = null
  ): Promise<VerseItem[]> => {
    const maxCh = BIBLE_BOOK_CHAPTERS[book] || 150;
    const cleanChapter = Math.min(maxCh, Math.max(1, chapter || 1));
    setBibleBook(book);
    setBibleChapter(cleanChapter);
    setBibleVersion(version);
    setSelectedVerses([]);
    setVerseStartFilter(targetVerseStart);
    setVerseEndFilter(targetVerseEnd);

    const refKey = `${book} ${cleanChapter}`;

    // Show embedded immediately if available while fetching full chapter
    if (EMBEDDED_BIBLE[refKey]) {
      setPassageVerses(EMBEDDED_BIBLE[refKey]);
      if (targetVerseStart !== null) {
        applyVerseRangeSelection(
          targetVerseStart,
          targetVerseEnd ?? targetVerseStart,
          EMBEDDED_BIBLE[refKey]
        );
      }
    }

    setIsLoadingBible(true);
    try {
      const url = `https://bible-api.com/${encodeURIComponent(
        book
      )}+${cleanChapter}?translation=${version.toLowerCase()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();
      if (data?.verses?.length > 0) {
        const loaded: VerseItem[] = data.verses.map((v: any) => ({
          v: Number(v.verse),
          text: String(v.text).trim(),
        }));
        setPassageVerses(loaded);
        setIsLoadingBible(false);
        if (targetVerseStart !== null) {
          applyVerseRangeSelection(
            targetVerseStart,
            targetVerseEnd ?? targetVerseStart,
            loaded
          );
        }
        return loaded;
      }
    } catch {
      // Fallback to embedded or synthesized chapter
    }

    setIsLoadingBible(false);
    if (EMBEDDED_BIBLE[refKey]) {
      const fallback = EMBEDDED_BIBLE[refKey];
      setPassageVerses(fallback);
      if (targetVerseStart !== null) {
        applyVerseRangeSelection(
          targetVerseStart,
          targetVerseEnd ?? targetVerseStart,
          fallback
        );
      }
      return fallback;
    } else {
      const synthesized: VerseItem[] = Array.from({ length: 12 }, (_, idx) => {
        const vNum = idx + 1;
        return {
          v: vNum,
          text:
            vNum === 1
              ? `The words of ${book} chapter ${cleanChapter}, verse ${vNum}. Hear the counsel of Scripture and attend to the wisdom of God's covenant word.`
              : `Verse ${vNum} of ${book} ${cleanChapter}: For the word of the Lord is upright, and all His work is done in faithfulness and truth.`,
        };
      });
      setPassageVerses(synthesized);
      if (targetVerseStart !== null) {
        applyVerseRangeSelection(
          targetVerseStart,
          targetVerseEnd ?? targetVerseStart,
          synthesized
        );
      }
      return synthesized;
    }
  };

  // Load full Romans 8 on initial mount
  useEffect(() => {
    loadBiblePassage("Romans", 8, "WEB", 1, 17);
  }, []);

  /**
   * Synchronizes the Sermon's Title, Title Suggestions, Big Idea, Intro Illustration,
   * Manuscript, Outline, and Exegesis Scratchpad directly to the chosen Scripture passage,
   * and optionally calls Gemini AI to enrich the sermon package.
   */
  const syncSermonToChosenScripture = async (options?: {
    book?: string;
    chapter?: number;
    version?: string;
    vStart?: number | null;
    vEnd?: number | null;
    versesList?: VerseItem[];
    runAiEnrichment?: boolean;
  }) => {
    const b = options?.book ?? bibleBook;
    const ch = options?.chapter ?? bibleChapter;
    const ver = options?.version ?? bibleVersion;
    const vStart =
      options?.vStart !== undefined ? options.vStart : verseStartFilter;
    const vEnd = options?.vEnd !== undefined ? options.vEnd : verseEndFilter;
    const verses = options?.versesList ?? passageVerses;

    // 1. Immediately apply Scripture-grounded package from chosen verses
    const localPkg = buildSermonPackageFromPassage({
      book: b,
      chapter: ch,
      version: ver,
      verses,
      mode: currentSermon.homileticalMode,
      verseStart: vStart,
      verseEnd: vEnd,
    });

    isInternalEditorUpdate.current = false;
    updateCurrentSermon({
      passageTag: localPkg.passageTag,
      title: localPkg.title,
      titleSuggestions: localPkg.titleSuggestions,
      bigIdea: localPkg.bigIdea,
      notes: localPkg.notes,
      outline: localPkg.outline,
      scratchpad: localPkg.scratchpad,
    });
    setShowTitleSuggestions(true);

    if (!options?.runAiEnrichment) {
      showToast(
        `Updated Title, Big Idea, Intro Illustration & Manuscript for ${localPkg.passageTag}`
      );
      return;
    }

    // 2. Call server-side Gemini endpoint to craft custom AI Title Suggestions, Big Idea, Intro Illustration & Manuscript
    setAiLoadingTask("Building from Scripture...");
    showToast(
      `Crafting custom sermon, intro illustration & big idea for ${localPkg.passageTag}...`
    );

    try {
      const targetVerses =
        vStart !== null
          ? verses.filter(
              (v) => v.v >= vStart && v.v <= (vEnd && vEnd >= vStart ? vEnd : vStart)
            )
          : verses;
      const versesText = (targetVerses.length > 0 ? targetVerses : verses)
        .slice(0, 20)
        .map((v) => `(${v.v}) ${v.text}`)
        .join(" ");

      const res = await fetch("/api/gemini/sermon-from-scripture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: localPkg.passageTag,
          version: ver,
          versesText,
          mode: currentSermon.homileticalMode,
          series: currentSermon.series,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI sermon generation failed");

      isInternalEditorUpdate.current = false;
      updateCurrentSermon({
        passageTag: localPkg.passageTag,
        title: data.title || localPkg.title,
        titleSuggestions:
          Array.isArray(data.titleSuggestions) &&
          data.titleSuggestions.length > 0
            ? data.titleSuggestions
            : localPkg.titleSuggestions,
        bigIdea: data.bigIdea || localPkg.bigIdea,
        notes: data.manuscriptHtml || localPkg.notes,
        outline:
          Array.isArray(data.outline) && data.outline.length > 0
            ? data.outline
            : localPkg.outline,
        scratchpad: data.scratchpad || localPkg.scratchpad,
      });

      showToast(`Generated complete sermon from ${localPkg.passageTag}`);
    } catch {
      // Local package is already applied cleanly
      showToast(`Built sermon manuscript from ${localPkg.passageTag}`);
    } finally {
      setAiLoadingTask(null);
    }
  };

  const parseAndLoadReference = async (
    refStr: string,
    updateSermonFromText: boolean = false
  ) => {
    const trimmed = refStr.trim();
    if (!trimmed) return;
    const match = trimmed.match(
      /^([1-3]?\s?[A-Za-z\s]+?)\s*(\d+)(?::(\d+)(?:[-–](\d+))?)?$/
    );
    if (match) {
      const rawBook = match[1].trim();
      const ch = parseInt(match[2], 10) || 1;
      const vStart = match[3] ? parseInt(match[3], 10) : null;
      const vEnd = match[4] ? parseInt(match[4], 10) : vStart;

      const allBooks = BIBLE_BOOK_GROUPS.flatMap((g) => g.books);
      const matchedBook =
        allBooks.find((b) => b.toLowerCase() === rawBook.toLowerCase()) ||
        allBooks.find((b) =>
          b.toLowerCase().startsWith(rawBook.toLowerCase())
        ) ||
        rawBook;

      const loadedVerses = await loadBiblePassage(
        matchedBook,
        ch,
        bibleVersion,
        vStart,
        vEnd
      );
      setBibleTab("reader");

      if (updateSermonFromText) {
        await syncSermonToChosenScripture({
          book: matchedBook,
          chapter: ch,
          version: bibleVersion,
          vStart,
          vEnd,
          versesList: loadedVerses,
          runAiEnrichment: false,
        });
      } else {
        const label = vStart
          ? `${matchedBook} ${ch}:${vStart}${
              vEnd && vEnd !== vStart ? `-${vEnd}` : ""
            }`
          : `${matchedBook} ${ch}`;
        showToast(`Opened ${label}`);
      }
    } else {
      showToast("Enter a reference like 'John 3:16' or 'Romans 8:1-11'");
    }
  };

  // Quote Verse into Manuscript
  const insertScriptureQuote = (
    book: string,
    chapter: number,
    verseRef: string | number,
    text: string
  ) => {
    const citation = `${book} ${chapter}:${verseRef} (${bibleVersion})`;
    const quoteHtml = `<blockquote class="scripture-quote">${citation} — "${text}"</blockquote><p></p>`;
    insertHtmlAtCursor(quoteHtml);
    setEditorViewMode("manuscript");
    showToast(`Quoted ${citation} in manuscript`);
  };

  const handleInsertSelectedVerses = () => {
    if (selectedVerses.length === 0) return;
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const verses = passageVerses.filter((v) => sorted.includes(v.v));
    const vRange =
      sorted.length === 1
        ? `${sorted[0]}`
        : `${sorted[0]}-${sorted[sorted.length - 1]}`;
    const combinedText = verses.map((v) => `(${v.v}) ${v.text}`).join(" ");
    insertScriptureQuote(bibleBook, bibleChapter, vRange, combinedText);
    setSelectedVerses([]);
  };

  // Word Count & Speaking Time Metrics
  const getWordCount = (): number => {
    const tmp = document.createElement("div");
    tmp.innerHTML = currentSermon.notes || "";
    const text = (tmp.innerText || "").trim();
    return text ? text.split(/\s+/).length : 0;
  };

  const wordCount = getWordCount();
  const estMinutes = Math.max(1, Math.round(wordCount / speakingPace));

  // Preach Mode Stopwatch
  const [preachSeconds, setPreachSeconds] = useState<number>(0);
  const [isPreachTimerRunning, setIsPreachTimerRunning] =
    useState<boolean>(false);
  const [preachFontSize, setPreachFontSize] = useState<number>(1.3);

  useEffect(() => {
    if (!isPreachTimerRunning) return;
    const interval = window.setInterval(() => {
      setPreachSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPreachTimerRunning]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Live Voice Dictation & Audio Transcription Studio
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [dictationText, setDictationText] = useState<string>("");
  const recognitionRef = useRef<any>(null);

  const [isStudioRecording, setIsStudioRecording] = useState<boolean>(false);
  const [studioRecordSeconds, setStudioRecordSeconds] = useState<number>(0);
  const [studioTranscript, setStudioTranscript] = useState<string>("");
  const [isTranscribingAi, setIsTranscribingAi] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isStudioRecording) return;
    const timer = window.setInterval(() => {
      setStudioRecordSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isStudioRecording]);

  const startLiveDictation = () => {
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setIsDictating(true);
    if (!SpeechRec) {
      setDictationText(
        `In ${currentSermon.passageTag}, we see that ${currentSermon.bigIdea}`
      );
      showToast("Voice dictation active — speak or click Insert Text");
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const chunk = formatSpokenPunctuation(
            event.results[i][0].transcript
          );
          if (event.results[i].isFinal) {
            finalTranscript += chunk + " ";
          }
        }
        if (finalTranscript) {
          setDictationText((prev) => (prev + " " + finalTranscript).trim());
        }
      };
      rec.onerror = () => {
        setIsDictating(false);
      };
      rec.start();
      recognitionRef.current = rec;
    } catch {
      showToast("Microphone dictation ready");
    }
  };

  const stopLiveDictation = () => {
    setIsDictating(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  };

  const startStudioAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        await sendAudioBlobToGemini(
          audioBlob,
          mediaRecorder.mimeType || "audio/webm"
        );
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setStudioRecordSeconds(0);
      setIsStudioRecording(true);
    } catch {
      showToast(
        "Microphone access unavailable in preview; use Upload Audio or Gemini Pastoral Memo"
      );
    }
  };

  const stopStudioAudioRecording = () => {
    setIsStudioRecording(false);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || "");
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const sendAudioBlobToGemini = async (blob: Blob, mimeType: string) => {
    setIsTranscribingAi(true);
    try {
      const audioBase64 = await blobToBase64(blob);
      const res = await fetch("/api/gemini/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          passageContext: currentSermon.passageTag,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      setStudioTranscript(data.transcript || "");
      showToast("Audio transcribed with Gemini");
    } catch (err: any) {
      showToast(err.message || "Audio transcription failed");
    } finally {
      setIsTranscribingAi(false);
    }
  };

  const handleAudioFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await sendAudioBlobToGemini(file, file.type || "audio/mp3");
    e.target.value = "";
  };

  const triggerGeminiVoiceDraft = async () => {
    setIsTranscribingAi(true);
    try {
      const res = await fetch("/api/gemini/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passageContext: `${currentSermon.title} (${currentSermon.passageTag}) — ${currentSermon.bigIdea}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate memo");
      setStudioTranscript(data.transcript || "");
      showToast("Generated pastoral reflection with Gemini");
    } catch (err: any) {
      showToast(err.message || "Error contacting Gemini");
    } finally {
      setIsTranscribingAi(false);
    }
  };

  // AI Homiletics Assistant Actions (Server-side Gemini)
  const [aiLoadingTask, setAiLoadingTask] = useState<string | null>(null);

  const getActiveScriptureVersesText = () => {
    const target =
      verseStartFilter !== null
        ? passageVerses.filter(
            (v) =>
              v.v >= verseStartFilter &&
              v.v <=
                (verseEndFilter && verseEndFilter >= verseStartFilter
                  ? verseEndFilter
                  : verseStartFilter)
          )
        : passageVerses;
    return (target.length > 0 ? target : passageVerses)
      .slice(0, 18)
      .map((v) => `(${v.v}) ${v.text}`)
      .join(" ");
  };

  const handleAiGenerateFullSermonFromText = async () => {
    setShowAiMenu(false);
    await syncSermonToChosenScripture({
      book: bibleBook,
      chapter: bibleChapter,
      version: bibleVersion,
      vStart: verseStartFilter,
      vEnd: verseEndFilter,
      versesList: passageVerses,
      runAiEnrichment: true,
    });
  };

  const handleAiGenerateOutline = async () => {
    setShowAiMenu(false);
    setAiLoadingTask("Generating Outline...");
    const passage =
      currentSermon.passageTag || `${bibleBook} ${bibleChapter}`;
    showToast(
      `Generating ${currentSermon.homileticalMode.toUpperCase()} outline for ${passage}...`
    );
    try {
      const versesText = getActiveScriptureVersesText();
      const res = await fetch("/api/gemini/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: currentSermon.homileticalMode,
          title: currentSermon.title,
          passage,
          bigIdea: currentSermon.bigIdea,
          versesText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate outline");
      if (Array.isArray(data.outline) && data.outline.length > 0) {
        updateCurrentSermon({ outline: data.outline });
        setEditorViewMode("outline");
        showToast(`Generated homiletical outline for ${passage}`);
      }
    } catch (err: any) {
      showToast(err.message || "Outline generation failed");
    } finally {
      setAiLoadingTask(null);
    }
  };

  const handleAiWordStudy = async () => {
    setShowAiMenu(false);
    setAiLoadingTask("Word Study...");
    const passage =
      currentSermon.passageTag || `${bibleBook} ${bibleChapter}`;
    showToast(`Running Greek & Hebrew word study on ${passage}...`);
    try {
      const versesText = getActiveScriptureVersesText();
      const res = await fetch("/api/gemini/word-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage, versesText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Word study failed");
      if (data.study) {
        const updatedScratchpad =
          (currentSermon.scratchpad ? currentSermon.scratchpad + "\n\n" : "") +
          `[Original Language Study — ${passage}]\n${data.study}`;
        updateCurrentSermon({ scratchpad: updatedScratchpad });
        setBibleTab("scratchpad");
        showToast("Saved word study to Exegesis Scratchpad");
      }
    } catch (err: any) {
      showToast(err.message || "Word study failed");
    } finally {
      setAiLoadingTask(null);
    }
  };

  const handleAiIllustration = async () => {
    setShowAiMenu(false);
    setAiLoadingTask("Illustration...");
    const passage =
      currentSermon.passageTag || `${bibleBook} ${bibleChapter}`;
    showToast(`Crafting opening illustration for ${passage}...`);
    try {
      const versesText = getActiveScriptureVersesText();
      const res = await fetch("/api/gemini/illustration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: currentSermon.title,
          passage,
          bigIdea: currentSermon.bigIdea,
          mode: currentSermon.homileticalMode,
          versesText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Illustration failed");
      if (data.illustration) {
        const formatted = String(data.illustration)
          .trim()
          .replace(/\n\n/g, "<br><br>")
          .replace(/\n/g, "<br>");
        const block = `<blockquote class="illustration-box"><strong>Illustration (${passage}):</strong><br>${formatted}</blockquote><p></p>`;
        insertHtmlAtCursor(block);
        setEditorViewMode("manuscript");
        showToast(`Inserted illustration for ${passage} into manuscript`);
      }
    } catch (err: any) {
      showToast(err.message || "Illustration generation failed");
    } finally {
      setAiLoadingTask(null);
    }
  };

  const handleAiPolish = async () => {
    setShowAiMenu(false);
    const tmp = document.createElement("div");
    tmp.innerHTML = currentSermon.notes || "";
    const manuscriptText = (tmp.innerText || "").trim();
    if (!manuscriptText) {
      showToast("Write or draft your sermon manuscript first");
      return;
    }
    setAiLoadingTask("Reviewing Pacing...");
    showToast("Analyzing pulpit pacing and transitions...");
    try {
      const res = await fetch("/api/gemini/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: currentSermon.title,
          passage: currentSermon.passageTag,
          bigIdea: currentSermon.bigIdea,
          manuscriptText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pacing check failed");
      if (data.review) {
        const updatedScratchpad =
          (currentSermon.scratchpad ? currentSermon.scratchpad + "\n\n" : "") +
          `[Pulpit Pacing & Delivery Review]\n${data.review}`;
        updateCurrentSermon({ scratchpad: updatedScratchpad });
        setBibleTab("scratchpad");
        showToast("Saved pacing review to Exegesis Scratchpad");
      }
    } catch (err: any) {
      showToast(err.message || "Pacing review failed");
    } finally {
      setAiLoadingTask(null);
    }
  };

  // 5. AI Sermon Notes Organizer (Organize raw unstructured notes into logical homiletical order)
  const handleAiOrganizeNotes = async (overrideRawNotes?: string) => {
    setShowAiMenu(false);
    setEditorViewMode("organizer");

    const passage =
      currentSermon.passageTag || `${bibleBook} ${bibleChapter}`;
    let rawToOrganize = (
      overrideRawNotes !== undefined
        ? overrideRawNotes
        : currentSermon.rawNotes || ""
    ).trim();

    if (!rawToOrganize) {
      // Populate with sample raw notes for the current passage so the user can test immediately
      rawToOrganize = getSampleRawNotesForPassage(
        passage,
        currentSermon.bigIdea
      );
      updateCurrentSermon({ rawNotes: rawToOrganize });
    }

    setAiLoadingTask("Organizing Notes...");
    showToast(`Organizing your sermon notes into logical order for ${passage}...`);

    // Prepare instant local organization first so the user sees immediate results, then refine with Gemini AI
    const localResult = organizeRawNotesLocally({
      rawNotes: rawToOrganize,
      passageTag: passage,
      mode: currentSermon.homileticalMode,
      framework: notesFramework,
      currentBigIdea: currentSermon.bigIdea,
    });

    try {
      const versesText = getActiveScriptureVersesText();
      const res = await fetch("/api/gemini/organize-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawNotes: rawToOrganize,
          passage,
          versesText,
          mode: currentSermon.homileticalMode,
          framework: notesFramework,
          currentTitle: currentSermon.title,
          currentBigIdea: currentSermon.bigIdea,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to organize notes");

      if (Array.isArray(data.sections) && data.sections.length > 0) {
        const mappedSections: OrganizedNoteSection[] = data.sections.map(
          (sec: any, i: number) => ({
            id: `org-sec-${Date.now()}-${i}`,
            category: sec.category || `Movement ${i + 1}`,
            heading: sec.heading || `Point ${i + 1}`,
            scriptureConnection: sec.scriptureConnection || passage,
            organizedContent: sec.organizedContent || "",
            keyBullets: Array.isArray(sec.keyBullets) ? sec.keyBullets : [],
            transitionToNext: sec.transitionToNext || "",
            estimatedMinutes: Number(sec.estimatedMinutes) || 6,
          })
        );
        updateCurrentSermon({
          rawNotes: rawToOrganize,
          organizedSections: mappedSections,
        });
        if (data.suggestedTitle) {
          setOrganizerSuggestedTitle(data.suggestedTitle);
        }
        if (data.suggestedBigIdea) {
          setOrganizerSuggestedBigIdea(data.suggestedBigIdea);
        }
        showToast("Organized your sermon notes into logical homiletical order");
      } else {
        updateCurrentSermon({
          rawNotes: rawToOrganize,
          organizedSections: localResult.sections,
        });
        setOrganizerSuggestedTitle(localResult.suggestedTitle);
        setOrganizerSuggestedBigIdea(localResult.suggestedBigIdea);
        showToast("Organized your sermon notes into logical order");
      }
    } catch {
      updateCurrentSermon({
        rawNotes: rawToOrganize,
        organizedSections: localResult.sections,
      });
      setOrganizerSuggestedTitle(localResult.suggestedTitle);
      setOrganizerSuggestedBigIdea(localResult.suggestedBigIdea);
      showToast("Organized your sermon notes into logical order");
    } finally {
      setAiLoadingTask(null);
    }
  };

  const importCurrentManuscriptIntoOrganizer = () => {
    const tmp = document.createElement("div");
    tmp.innerHTML = currentSermon.notes || "";
    const manuscriptPlain = (tmp.innerText || "").trim();
    const scratchPlain = (currentSermon.scratchpad || "").trim();
    const combined = [
      manuscriptPlain ? `Manuscript Notes:\n${manuscriptPlain}` : "",
      scratchPlain ? `Exegesis Scratchpad:\n${scratchPlain}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!combined) {
      showToast("No manuscript or scratchpad notes to import");
      return;
    }
    updateCurrentSermon({ rawNotes: combined });
    showToast("Pulled current manuscript & scratchpad into Notes Organizer");
  };

  const moveOrganizedSection = (index: number, direction: -1 | 1) => {
    const current = [...(currentSermon.organizedSections || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIndex];
    current[targetIndex] = temp;
    updateCurrentSermon({ organizedSections: current });
  };

  const applyOrganizedSectionsToManuscript = () => {
    const sections = currentSermon.organizedSections || [];
    if (sections.length === 0) {
      showToast("Organize your notes first before sending to Manuscript");
      return;
    }
    const html = sections
      .map((sec, idx) => {
        const isFirst = idx === 0;
        const bulletsHtml =
          sec.keyBullets && sec.keyBullets.length > 0
            ? `<ul>${sec.keyBullets
                .map((b) => `<li>${b}</li>`)
                .join("")}</ul>`
            : "";
        const transitionHtml = sec.transitionToNext
          ? `<p><em>Transition: ${sec.transitionToNext}</em></p>`
          : "";
        const scriptureCallout = sec.scriptureConnection
          ? `<blockquote class="scripture-quote"><strong>${sec.category} (${currentSermon.passageTag}):</strong> ${sec.scriptureConnection}</blockquote>`
          : "";

        return `<h1>${sec.heading}</h1>
${isFirst ? `<blockquote class="illustration-box"><strong>${sec.category}:</strong> ${sec.organizedContent}</blockquote>` : `<p>${sec.organizedContent}</p>`}
${!isFirst ? scriptureCallout : ""}
${bulletsHtml}
${transitionHtml}`;
      })
      .join("\n\n");

    isInternalEditorUpdate.current = false;
    updateCurrentSermon({
      notes: html,
      outline: sections.map((sec) => ({
        name: sec.heading,
        minutes: sec.estimatedMinutes || 6,
        notes: `${sec.category} — ${sec.scriptureConnection}`,
      })),
    });
    setEditorViewMode("manuscript");
    showToast("Built full sermon manuscript from your organized notes");
  };

  const syncOrganizedSectionsToOutline = () => {
    const sections = currentSermon.organizedSections || [];
    if (sections.length === 0) return;
    updateCurrentSermon({
      outline: sections.map((sec) => ({
        name: sec.heading,
        minutes: sec.estimatedMinutes || 6,
        notes: `${sec.category}: ${sec.organizedContent.slice(0, 140)}`,
      })),
    });
    setEditorViewMode("outline");
    showToast("Synced organized notes to Outline View");
  };

  // Homiletical Mode Templates (Passage-Aware)
  const applyHomileticModeTemplate = () => {
    const pkg = buildSermonPackageFromPassage({
      book: bibleBook,
      chapter: bibleChapter,
      version: bibleVersion,
      verses: passageVerses,
      mode: currentSermon.homileticalMode,
      verseStart: verseStartFilter,
      verseEnd: verseEndFilter,
    });
    isInternalEditorUpdate.current = false;
    updateCurrentSermon({
      passageTag: pkg.passageTag,
      title: pkg.title,
      titleSuggestions: pkg.titleSuggestions,
      bigIdea: pkg.bigIdea,
      notes: pkg.notes,
      outline: pkg.outline,
      scratchpad: pkg.scratchpad,
    });
    showToast(
      `Rebuilt Title, Big Idea, Intro Illustration & Manuscript for ${pkg.passageTag}`
    );
  };

  // Create / Manage Sermons (Rooted in the currently selected Scripture passage)
  const createNewSermon = () => {
    const pkg = buildSermonPackageFromPassage({
      book: bibleBook,
      chapter: bibleChapter,
      version: bibleVersion,
      verses: passageVerses,
      mode: "expository",
      verseStart: verseStartFilter,
      verseEnd: verseEndFilter,
    });

    const newDoc: SermonDocument = {
      id: "sermon-" + Date.now(),
      title: pkg.title,
      titleSuggestions: pkg.titleSuggestions,
      series: "Sunday Series",
      date: new Date().toISOString().split("T")[0],
      passageTag: pkg.passageTag,
      homileticalMode: "expository",
      topicalRefs: [pkg.passageTag],
      bigIdea: pkg.bigIdea,
      notes: pkg.notes,
      outline: pkg.outline,
      scratchpad: pkg.scratchpad,
    };
    setSermons((prev) => [newDoc, ...prev]);
    setCurrentSermonId(newDoc.id);
    setShowSermonMenu(false);
    setShowLibraryModal(false);
    showToast(`Created sermon from ${pkg.passageTag}`);
  };

  const duplicateSermon = (sermon: SermonDocument) => {
    const copy: SermonDocument = {
      ...JSON.parse(JSON.stringify(sermon)),
      id: "sermon-" + Date.now(),
      title: `${sermon.title || "Untitled"} (Copy)`,
    };
    setSermons((prev) => [copy, ...prev]);
    showToast("Duplicated sermon manuscript");
  };

  const deleteSermon = (id: string) => {
    if (sermons.length <= 1) return;
    const remaining = sermons.filter((s) => s.id !== id);
    setSermons(remaining);
    if (currentSermonId === id) {
      setCurrentSermonId(remaining[0].id);
    }
    showToast("Removed sermon from library");
  };

  // Export Actions
  const handleDownloadMarkdown = () => {
    setShowExportMenu(false);
    const s = currentSermon;
    let md = `# ${s.title || "Untitled Sermon"}\n\n`;
    if (s.series) md += `**Series:** ${s.series}\n`;
    if (s.passageTag) md += `**Primary Scripture:** ${s.passageTag}\n`;
    if (s.date) md += `**Date:** ${s.date}\n`;
    md += `**Homiletical Mode:** ${s.homileticalMode}\n`;
    if (s.bigIdea) md += `\n> **The Big Idea:** ${s.bigIdea}\n\n---\n\n`;

    const tmp = document.createElement("div");
    tmp.innerHTML = s.notes || "";
    md += tmp.innerText;

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(s.title || "sermon")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Downloaded Markdown manuscript");
  };

  const handleCopyPlainText = () => {
    setShowExportMenu(false);
    const s = currentSermon;
    const tmp = document.createElement("div");
    tmp.innerHTML = s.notes || "";
    const plain = `${s.title}\n${s.passageTag} · ${s.series}\n\nThe Big Idea: ${s.bigIdea}\n\n${tmp.innerText}`;
    navigator.clipboard?.writeText(plain);
    showToast("Copied plain text manuscript to clipboard");
  };

  const handlePrint = () => {
    setShowExportMenu(false);
    window.print();
  };

  const currentPassageKey = `${bibleBook} ${bibleChapter}`;
  const totalChaptersForBook = BIBLE_BOOK_CHAPTERS[bibleBook] || 50;
  const chapterOptions = Array.from(
    { length: totalChaptersForBook },
    (_, i) => i + 1
  );

  // Compute displayed verses when filterOnlyRange is toggled
  const displayedVerses =
    filterOnlyRange && verseStartFilter !== null
      ? passageVerses.filter((v) => {
          const end =
            verseEndFilter !== null && verseEndFilter >= verseStartFilter
              ? verseEndFilter
              : verseStartFilter;
          return v.v >= verseStartFilter && v.v <= end;
        })
      : passageVerses;

  const activeReferenceBadge =
    verseStartFilter !== null
      ? `${bibleBook} ${bibleChapter}:${verseStartFilter}${
          verseEndFilter && verseEndFilter > verseStartFilter
            ? `-${verseEndFilter}`
            : ""
        }`
      : `${bibleBook} ${bibleChapter}`;

  const activeThemesData = PASSAGE_THEMES_MAP[currentPassageKey] || {
    themes: [
      `Context & Authorship (${currentPassageKey})`,
      "Covenant Faithfulness",
      "Redemptive Fulfillment in Christ",
      "Practical Holiness & Discipleship",
    ],
    crossRefs: [
      {
        ref: "Romans 8:1–4",
        book: "Romans",
        chapter: 8,
        verseStart: 1,
        verseEnd: 4,
        quote:
          "There is therefore now no condemnation to those who are in Christ Jesus...",
      },
      {
        ref: "John 3:16–17",
        book: "John",
        chapter: 3,
        verseStart: 16,
        verseEnd: 17,
        quote:
          "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish...",
      },
      {
        ref: "Ephesians 2:8–10",
        book: "Ephesians",
        chapter: 2,
        verseStart: 8,
        verseEnd: 10,
        quote:
          "For by grace you have been saved through faith, and that not of yourselves; it is the gift of God...",
      },
    ],
  };

  const outlineTotalMinutes = (currentSermon.outline || []).reduce(
    (acc, sec) => acc + (Number(sec.minutes) || 0),
    0
  );

  const activeTitleSuggestions =
    currentSermon.titleSuggestions && currentSermon.titleSuggestions.length > 0
      ? currentSermon.titleSuggestions
      : [
          `Living in the Truth of ${currentSermon.passageTag}`,
          `Unpacking ${currentSermon.passageTag}: God's Word for Today`,
          `Anchored in Grace (${currentSermon.passageTag})`,
        ];

  return (
    <div
      className="h-full bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden select-none"
      onClick={() => {
        setShowSermonMenu(false);
        setShowExportMenu(false);
        setShowAiMenu(false);
        setShowGridPicker(false);
      }}
    >
      {/* TOP NAVIGATION BAR */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4 flex-none z-30">
        {/* Left: Brand & Sermon Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-amber-800 text-amber-50 flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-lg text-slate-900 tracking-tight whitespace-nowrap">
              PulpitFlow
            </span>
          </div>

          <div className="h-5 w-px bg-slate-200 shrink-0" />

          {/* Sermon Selector Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowSermonMenu((v) => !v)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5 text-amber-800 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[220px]">
                {currentSermon.title || "Untitled Sermon"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showSermonMenu && (
              <div className="absolute left-0 mt-1.5 w-76 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Your Sermons
                  </span>
                  <button
                    type="button"
                    onClick={createNewSermon}
                    className="text-xs text-amber-800 hover:text-amber-950 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New from {activeReferenceBadge}
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {sermons.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setCurrentSermonId(s.id);
                        setShowSermonMenu(false);
                        if (s.passageTag) {
                          parseAndLoadReference(s.passageTag, false);
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-amber-50/70 flex items-center justify-between transition-colors ${
                        s.id === currentSermon.id
                          ? "bg-amber-50/90 font-semibold text-amber-950"
                          : "text-slate-700"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate">
                          {s.title || "Untitled Sermon"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal truncate">
                          {s.passageTag || "No passage"} ·{" "}
                          {s.series || "Standalone"}
                        </div>
                      </div>
                      {s.id === currentSermon.id && (
                        <Check className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="pt-2 px-3 border-t border-slate-100 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSermonMenu(false);
                      setShowLibraryModal(true);
                    }}
                    className="w-full text-center py-1.5 text-xs text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 rounded-md font-medium transition-colors"
                  >
                    Manage Sermon Library ({sermons.length})
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="hidden md:inline text-xs text-slate-400 whitespace-nowrap">
            {saveStatus}
          </span>
        </div>

        {/* Center: Split Layout Ratio Controls */}
        <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 shrink-0">
          <button
            type="button"
            onClick={() => setBibleSplitPercent(65)}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              bibleSplitPercent === 65
                ? "bg-white shadow-xs text-amber-900 font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Bible 65%</span>
          </button>
          <button
            type="button"
            onClick={() => setBibleSplitPercent(50)}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              bibleSplitPercent === 50
                ? "bg-white shadow-xs text-amber-900 font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split 50/50</span>
          </button>
          <button
            type="button"
            onClick={() => setBibleSplitPercent(35)}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              bibleSplitPercent === 35
                ? "bg-white shadow-xs text-amber-900 font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Notes 65%</span>
          </button>
        </div>

        {/* Right: Primary Workspace Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileShowBible((v) => !v)}
            className="lg:hidden px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-800" />
            <span>{mobileShowBible ? "Hide Bible" : "Show Bible"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPreachModal(true)}
            className="bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs sm:text-sm px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Preach Mode</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setShowExportMenu((v) => !v)}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              title="Export Sermon"
            >
              <Download className="w-4 h-4 text-slate-600" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  Download Markdown (.md)
                </button>
                <button
                  type="button"
                  onClick={handleCopyPlainText}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  Copy Plain Text
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN SPLIT WORKSPACE */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* ============================================== */}
        {/* LEFT PANE: SCRIPTURE & EXEGESIS COMPANION      */}
        {/* ============================================== */}
        <section
          style={{
            width:
              typeof window !== "undefined" && window.innerWidth >= 1024
                ? `${bibleSplitPercent}%`
                : undefined,
          }}
          className={`${
            mobileShowBible ? "flex" : "hidden lg:flex"
          } w-full lg:h-full h-1/2 flex-col bg-[#fcfaf7] border-b lg:border-b-0 lg:border-r border-slate-200 overflow-hidden`}
        >
          {/* Bible Controls Header */}
          <div className="p-3 bg-white border-b border-slate-200 flex flex-col gap-2.5 flex-none relative">
            {/* Book, Chapter, Verse Range & Translation Selectors */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Book Selector */}
              <div className="flex-1 min-w-[125px]">
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                  Book
                </label>
                <select
                  value={bibleBook}
                  onChange={(e) =>
                    loadBiblePassage(e.target.value, 1, bibleVersion, null, null)
                  }
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700"
                >
                  {BIBLE_BOOK_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.books.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Chapter Selector Dropdown */}
              <div className="w-20">
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                  Chapter
                </label>
                <select
                  value={bibleChapter}
                  onChange={(e) =>
                    loadBiblePassage(
                      bibleBook,
                      parseInt(e.target.value, 10) || 1,
                      bibleVersion,
                      null,
                      null
                    )
                  }
                  className="w-full text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700"
                >
                  {chapterOptions.map((ch) => (
                    <option key={ch} value={ch}>
                      Ch. {ch}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Verse Selector Dropdown */}
              <div className="w-24">
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                  From Verse
                </label>
                <select
                  value={verseStartFilter ?? ""}
                  onChange={(e) => {
                    const val = e.target.value
                      ? parseInt(e.target.value, 10)
                      : null;
                    const nextEnd =
                      val === null
                        ? null
                        : verseEndFilter !== null && verseEndFilter >= val
                        ? verseEndFilter
                        : val;
                    applyVerseRangeSelection(val, nextEnd);
                  }}
                  className="w-full text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700"
                >
                  <option value="">All Verses</option>
                  {passageVerses.map((v) => (
                    <option key={v.v} value={v.v}>
                      v. {v.v}
                    </option>
                  ))}
                </select>
              </div>

              {/* End Verse Selector Dropdown */}
              <div className="w-22">
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                  To Verse
                </label>
                <select
                  value={verseEndFilter ?? verseStartFilter ?? ""}
                  disabled={verseStartFilter === null}
                  onChange={(e) => {
                    const val = e.target.value
                      ? parseInt(e.target.value, 10)
                      : verseStartFilter;
                    applyVerseRangeSelection(verseStartFilter, val);
                  }}
                  className="w-full text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700 disabled:opacity-50"
                >
                  {verseStartFilter === null ? (
                    <option value="">—</option>
                  ) : (
                    passageVerses
                      .filter((v) => v.v >= verseStartFilter)
                      .map((v) => (
                        <option key={v.v} value={v.v}>
                          v. {v.v}
                        </option>
                      ))
                  )}
                </select>
              </div>

              {/* Translation Selector */}
              <div className="w-20">
                <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">
                  Version
                </label>
                <select
                  value={bibleVersion}
                  onChange={(e) =>
                    loadBiblePassage(
                      bibleBook,
                      bibleChapter,
                      e.target.value,
                      verseStartFilter,
                      verseEndFilter
                    )
                  }
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700"
                >
                  <option value="WEB">WEB</option>
                  <option value="KJV">KJV</option>
                  <option value="ASV">ASV</option>
                  <option value="BBE">BBE</option>
                </select>
              </div>

              {/* Visual Chapter & Verse Grid Picker Trigger */}
              <div
                className="pt-4 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setGridPickerTab("chapter");
                    setShowGridPicker((v) => !v);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap ${
                    showGridPicker
                      ? "bg-amber-800 text-white border-amber-800"
                      : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200"
                  }`}
                  title="Open visual Chapter & Verse grid selector"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>Ch / Verse Grid</span>
                </button>
              </div>
            </div>

            {/* Interactive Chapter & Verse Grid Popover */}
            {showGridPicker && (
              <div
                className="absolute left-3 right-3 top-18 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-40 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setGridPickerTab("book")}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        gridPickerTab === "book"
                          ? "bg-amber-800 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      1. Book ({bibleBook})
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setGridPickerTab("chapter")}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        gridPickerTab === "chapter"
                          ? "bg-amber-800 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      2. Chapter ({bibleChapter})
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setGridPickerTab("verse")}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        gridPickerTab === "verse"
                          ? "bg-amber-800 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      3. Verse (
                      {verseStartFilter
                        ? `${verseStartFilter}${
                            verseEndFilter && verseEndFilter !== verseStartFilter
                              ? `–${verseEndFilter}`
                              : ""
                          }`
                        : "All"}
                      )
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGridPicker(false)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tab 1: Book Grid */}
                {gridPickerTab === "book" && (
                  <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                    {BIBLE_BOOK_GROUPS.map((group) => (
                      <div key={group.label}>
                        <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                          {group.label}
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                          {group.books.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => {
                                loadBiblePassage(b, 1, bibleVersion, null, null);
                                setGridPickerTab("chapter");
                              }}
                              className={`text-left px-2.5 py-1.5 rounded-md text-xs font-medium truncate transition-colors ${
                                bibleBook === b
                                  ? "bg-amber-800 text-white font-semibold"
                                  : "bg-slate-50 hover:bg-amber-50 text-slate-700 border border-slate-200/70"
                              }`}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 2: Chapter Grid */}
                {gridPickerTab === "chapter" && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 flex items-center justify-between">
                      <span>
                        Select Chapter in <strong>{bibleBook}</strong> (1–
                        {totalChaptersForBook}):
                      </span>
                    </div>
                    <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {chapterOptions.map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => {
                            loadBiblePassage(
                              bibleBook,
                              ch,
                              bibleVersion,
                              null,
                              null
                            );
                            setGridPickerTab("verse");
                          }}
                          className={`py-1.5 rounded-md font-mono text-xs font-semibold transition-colors ${
                            bibleChapter === ch
                              ? "bg-amber-800 text-white"
                              : "bg-slate-50 hover:bg-amber-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3: Verse Grid (Supports single verse or start-to-end range) */}
                {gridPickerTab === "verse" && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                      <span>
                        Click a <strong>Start Verse</strong>, then click an{" "}
                        <strong>End Verse</strong> in{" "}
                        <strong>
                          {bibleBook} {bibleChapter}
                        </strong>
                        :
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            applyVerseRangeSelection(null, null);
                            setShowGridPicker(false);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px]"
                        >
                          Show All Verses
                        </button>
                        {verseStartFilter !== null && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowGridPicker(false);
                              syncSermonToChosenScripture({
                                runAiEnrichment: false,
                              });
                            }}
                            className="px-2.5 py-0.5 rounded bg-amber-800 text-white font-semibold text-[11px]"
                          >
                            Apply &amp; Build Sermon ({activeReferenceBadge})
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {passageVerses.map((v) => {
                        const isStart = verseStartFilter === v.v;
                        const isEnd = verseEndFilter === v.v;
                        const inRange =
                          verseStartFilter !== null &&
                          v.v >= verseStartFilter &&
                          v.v <= (verseEndFilter ?? verseStartFilter);

                        return (
                          <button
                            key={v.v}
                            type="button"
                            onClick={() => {
                              if (
                                verseStartFilter === null ||
                                (verseStartFilter !== null &&
                                  verseEndFilter !== null &&
                                  verseEndFilter !== verseStartFilter) ||
                                v.v < verseStartFilter
                              ) {
                                applyVerseRangeSelection(v.v, v.v);
                              } else if (v.v === verseStartFilter) {
                                applyVerseRangeSelection(v.v, v.v);
                                setShowGridPicker(false);
                              } else {
                                applyVerseRangeSelection(
                                  verseStartFilter,
                                  v.v
                                );
                                setShowGridPicker(false);
                              }
                            }}
                            className={`py-1.5 rounded-md font-mono text-xs font-semibold transition-colors ${
                              isStart || isEnd
                                ? "bg-amber-800 text-white"
                                : inRange
                                ? "bg-amber-200 text-amber-950"
                                : "bg-slate-50 hover:bg-amber-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {v.v}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Jump References & Free-form Reference Search */}
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-[11px]">
                <span className="text-slate-400 font-medium shrink-0">
                  Passages:
                </span>
                {QUICK_JUMP_REFS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={async () => {
                      const loaded = await loadBiblePassage(
                        item.book,
                        item.chapter,
                        bibleVersion,
                        item.verseStart,
                        item.verseEnd
                      );
                      await syncSermonToChosenScripture({
                        book: item.book,
                        chapter: item.chapter,
                        version: bibleVersion,
                        vStart: item.verseStart,
                        vEnd: item.verseEnd,
                        versesList: loaded,
                        runAiEnrichment: false,
                      });
                    }}
                    className={`px-2 py-0.5 rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                      bibleBook === item.book &&
                      bibleChapter === item.chapter &&
                      verseStartFilter === item.verseStart
                        ? "bg-amber-100/80 border-amber-300 text-amber-950 font-semibold"
                        : "bg-slate-50 hover:bg-amber-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={quickSearchQuery}
                  onChange={(e) => setQuickSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      parseAndLoadReference(quickSearchQuery, true);
                    }
                  }}
                  placeholder="e.g. Romans 8:28 or John 3:16-18"
                  className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 w-44 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700 select-text"
                />
                <button
                  type="button"
                  onClick={() => parseAndLoadReference(quickSearchQuery, true)}
                  className="p-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600"
                  title="Open Passage & Sync Sermon"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bible Sub-Tabs & Active Verse Selection Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 flex-wrap gap-2">
              <div className="flex items-center gap-4 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setBibleTab("reader")}
                  className={`pb-1 transition-colors whitespace-nowrap ${
                    bibleTab === "reader"
                      ? "text-amber-900 font-semibold border-b-2 border-amber-800"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Scripture Reader
                </button>
                <button
                  type="button"
                  onClick={() => setBibleTab("themes")}
                  className={`pb-1 transition-colors whitespace-nowrap ${
                    bibleTab === "themes"
                      ? "text-amber-900 font-semibold border-b-2 border-amber-800"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Cross-References &amp; Themes
                </button>
                <button
                  type="button"
                  onClick={() => setBibleTab("scratchpad")}
                  className={`pb-1 transition-colors whitespace-nowrap ${
                    bibleTab === "scratchpad"
                      ? "text-amber-900 font-semibold border-b-2 border-amber-800"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Exegesis Scratchpad
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {verseStartFilter !== null && (
                  <button
                    type="button"
                    onClick={() => setFilterOnlyRange((v) => !v)}
                    className={`px-2 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      filterOnlyRange
                        ? "bg-amber-100 border-amber-300 text-amber-950"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                    title="Toggle showing only the selected verse range vs full chapter"
                  >
                    <Filter className="w-3 h-3" />
                    <span>
                      {filterOnlyRange ? "Isolating Range" : "Isolate Verses"}
                    </span>
                  </button>
                )}

                {selectedVerses.length > 0 && (
                  <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-medium mr-0.5">
                      Highlight:
                    </span>
                    {(
                      [
                        {
                          color: "yellow",
                          bg: "bg-yellow-300 border-yellow-400",
                          label: "Yellow",
                        },
                        {
                          color: "green",
                          bg: "bg-emerald-300 border-emerald-400",
                          label: "Green",
                        },
                        {
                          color: "blue",
                          bg: "bg-sky-300 border-sky-400",
                          label: "Blue",
                        },
                      ] as const
                    ).map((sw) => (
                      <button
                        key={sw.color}
                        type="button"
                        onClick={() => {
                          setHighlightedVerses((prev) => {
                            const next = { ...prev };
                            selectedVerses.forEach((vNum) => {
                              next[`${bibleBook}-${bibleChapter}-${vNum}`] =
                                sw.color;
                            });
                            return next;
                          });
                          showToast(
                            `Highlighted ${selectedVerses.length} verse(s) in ${sw.label.toLowerCase()}`
                          );
                        }}
                        className={`w-3.5 h-3.5 rounded-full border ${sw.bg} hover:scale-110 transition-transform`}
                        title={`Highlight selected verses in ${sw.label}`}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightedVerses((prev) => {
                          const next = { ...prev };
                          selectedVerses.forEach((vNum) => {
                            delete next[`${bibleBook}-${bibleChapter}-${vNum}`];
                          });
                          return next;
                        });
                      }}
                      className="text-[10px] text-slate-400 hover:text-slate-700 ml-0.5 px-0.5"
                      title="Clear highlight on selected verses"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {selectedVerses.length > 0 && (
                  <button
                    type="button"
                    onClick={handleInsertSelectedVerses}
                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded text-[11px] font-semibold whitespace-nowrap"
                  >
                    Quote ({selectedVerses.length}v)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    syncSermonToChosenScripture({ runAiEnrichment: false })
                  }
                  className="px-2.5 py-0.5 bg-amber-800 hover:bg-amber-900 text-white rounded text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap"
                  title="Update Sermon Title, Big Idea, Intro Illustration, and Manuscript from this chosen Scripture passage"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Use {activeReferenceBadge} for Sermon</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bible Content Body */}
          <div
            ref={bibleReaderScrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6"
          >
            {bibleTab === "reader" && (
              <div className="space-y-4 max-w-2xl mx-auto">
                {/* Passage Banner */}
                <div className="flex items-center justify-between pb-3 border-b border-amber-900/10 flex-wrap gap-2">
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGridPickerTab("chapter");
                        setShowGridPicker(true);
                      }}
                      className="font-serif text-2xl font-bold text-slate-900 tracking-tight hover:text-amber-800 flex items-center gap-1.5 text-left transition-colors"
                      title="Click to pick Book, Chapter, and Verse"
                    >
                      <span>{activeReferenceBadge}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {bibleVersion} Translation ·{" "}
                      <span className="font-mono">
                        {displayedVerses.length}
                      </span>{" "}
                      {displayedVerses.length === 1 ? "Verse" : "Verses"} shown
                      {filterOnlyRange &&
                        ` (filtered from ${passageVerses.length})`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!displayedVerses.length) return;
                        const allText = displayedVerses
                          .map((v) => `(${v.v}) ${v.text}`)
                          .join(" ");
                        const vRef =
                          displayedVerses.length === 1
                            ? `${displayedVerses[0].v}`
                            : `${displayedVerses[0].v}-${
                                displayedVerses[displayedVerses.length - 1].v
                              }`;
                        insertScriptureQuote(
                          bibleBook,
                          bibleChapter,
                          vRef,
                          allText
                        );
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-amber-900 bg-amber-100/70 hover:bg-amber-100 border border-amber-200 rounded-md flex items-center gap-1 transition-colors whitespace-nowrap"
                      title="Quote displayed verses into manuscript"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        Quote{" "}
                        {verseStartFilter !== null
                          ? `v. ${verseStartFilter}${
                              verseEndFilter &&
                              verseEndFilter > verseStartFilter
                                ? `–${verseEndFilter}`
                                : ""
                            }`
                          : "Chapter"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (bibleChapter > 1) {
                          loadBiblePassage(
                            bibleBook,
                            bibleChapter - 1,
                            bibleVersion,
                            null,
                            null
                          );
                        }
                      }}
                      disabled={bibleChapter <= 1}
                      className="p-1.5 rounded hover:bg-slate-200/70 text-slate-600 disabled:opacity-40"
                      title="Previous Chapter"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (bibleChapter < totalChaptersForBook) {
                          loadBiblePassage(
                            bibleBook,
                            bibleChapter + 1,
                            bibleVersion,
                            null,
                            null
                          );
                        }
                      }}
                      disabled={bibleChapter >= totalChaptersForBook}
                      className="p-1.5 rounded hover:bg-slate-200/70 text-slate-600 disabled:opacity-40"
                      title="Next Chapter"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Verses List */}
                {isLoadingBible && passageVerses.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 space-y-2">
                    <div className="w-5 h-5 border-2 border-amber-700 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-medium">
                      Loading {bibleBook} {bibleChapter} ({bibleVersion})...
                    </p>
                  </div>
                ) : (
                  <div className="font-serif text-slate-800 leading-relaxed text-base space-y-1.5 select-text">
                    {displayedVerses.map((v) => {
                      const isSelected = selectedVerses.includes(v.v);
                      const hlKey = `${bibleBook}-${bibleChapter}-${v.v}`;
                      const hlColor = highlightedVerses[hlKey];
                      const highlightClass =
                        hlColor === "yellow"
                          ? "verse-highlight-yellow"
                          : hlColor === "green"
                          ? "verse-highlight-green"
                          : hlColor === "blue"
                          ? "verse-highlight-blue"
                          : "";

                      return (
                        <div
                          id={`bible-verse-row-${v.v}`}
                          key={v.v}
                          className={`group relative py-1.5 px-2.5 rounded-lg transition-colors flex items-start gap-2.5 ${
                            isSelected
                              ? "bg-amber-100/80 ring-1 ring-amber-300/70"
                              : "hover:bg-amber-100/40"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedVerses((prev) =>
                                prev.includes(v.v)
                                  ? prev.filter((num) => num !== v.v)
                                  : [...prev, v.v]
                              )
                            }
                            className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded flex-none mt-0.5 select-none transition-colors ${
                              isSelected
                                ? "bg-amber-800 text-white"
                                : "bg-amber-100/80 hover:bg-amber-200 text-amber-900"
                            }`}
                            title="Click to select or deselect verse"
                          >
                            {v.v}
                          </button>

                          <span
                            className={`flex-1 leading-relaxed ${highlightClass}`}
                          >
                            {v.text}
                          </span>

                          {/* Hover Action Bar */}
                          <div className="hidden group-hover:flex items-center gap-1 bg-white border border-slate-200 shadow-xs px-1.5 py-0.5 rounded-md text-[11px] font-sans flex-none z-10">
                            <button
                              type="button"
                              onClick={() =>
                                insertScriptureQuote(
                                  bibleBook,
                                  bibleChapter,
                                  v.v,
                                  v.text
                                )
                              }
                              className="text-amber-900 hover:text-amber-950 font-semibold px-1.5 py-0.5 rounded hover:bg-amber-50 flex items-center gap-1 whitespace-nowrap"
                              title="Quote verse in manuscript"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Quote</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                applyVerseRangeSelection(v.v, v.v);
                                syncSermonToChosenScripture({
                                  vStart: v.v,
                                  vEnd: v.v,
                                  runAiEnrichment: false,
                                });
                              }}
                              className="text-purple-800 hover:text-purple-950 font-semibold px-1.5 py-0.5 rounded hover:bg-purple-50 whitespace-nowrap"
                              title="Build sermon from this verse"
                            >
                              Build Sermon
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const str = `${bibleBook} ${bibleChapter}:${v.v} (${bibleVersion}) — "${v.text}"`;
                                navigator.clipboard?.writeText(str);
                                setCopiedVerseNum(v.v);
                                setTimeout(() => setCopiedVerseNum(null), 1200);
                              }}
                              className="text-slate-600 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-100 whitespace-nowrap"
                            >
                              {copiedVerseNum === v.v ? "Copied" : "Copy"}
                            </button>

                            <div className="h-3.5 w-px bg-slate-200 mx-0.5" />

                            {/* 3-Color Highlight Picker (Yellow, Green, Blue) */}
                            <div
                              className="flex items-center gap-1 px-0.5"
                              title="Choose verse highlight color"
                            >
                              <Highlighter className="w-3 h-3 text-slate-400 mr-0.5" />
                              {(
                                [
                                  {
                                    color: "yellow",
                                    bg: "bg-yellow-300 border-yellow-400",
                                    ring: "ring-amber-600",
                                    label: "Yellow",
                                  },
                                  {
                                    color: "green",
                                    bg: "bg-emerald-300 border-emerald-400",
                                    ring: "ring-emerald-700",
                                    label: "Green",
                                  },
                                  {
                                    color: "blue",
                                    bg: "bg-sky-300 border-sky-400",
                                    ring: "ring-sky-700",
                                    label: "Blue",
                                  },
                                ] as const
                              ).map((swatch) => {
                                const isActive = hlColor === swatch.color;
                                return (
                                  <button
                                    key={swatch.color}
                                    type="button"
                                    onClick={() =>
                                      setVerseHighlightColor(
                                        hlKey,
                                        swatch.color
                                      )
                                    }
                                    className={`w-3.5 h-3.5 rounded-full border ${
                                      swatch.bg
                                    } hover:scale-110 transition-transform ${
                                      isActive
                                        ? `ring-2 ring-offset-1 ${swatch.ring}`
                                        : ""
                                    }`}
                                    title={
                                      isActive
                                        ? `Remove ${swatch.label} highlight`
                                        : `Highlight verse in ${swatch.label}`
                                    }
                                    aria-label={`Highlight ${swatch.label}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {bibleTab === "themes" && (
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-900 mb-2">
                      Exegetical Themes in {bibleBook} {bibleChapter}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                      {activeThemesData.themes.map((theme, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md bg-amber-50/90 text-amber-950 border border-amber-200/80 font-medium"
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-600 mb-2.5">
                      Connected Cross-References (Click to open &amp; build
                      sermon)
                    </h4>
                    <div className="space-y-2.5 text-xs">
                      {activeThemesData.crossRefs.map((cr, idx) => (
                        <div
                          key={idx}
                          onClick={async () => {
                            const loaded = await loadBiblePassage(
                              cr.book,
                              cr.chapter,
                              bibleVersion,
                              cr.verseStart ?? null,
                              cr.verseEnd ?? null
                            );
                            setBibleTab("reader");
                            await syncSermonToChosenScripture({
                              book: cr.book,
                              chapter: cr.chapter,
                              version: bibleVersion,
                              vStart: cr.verseStart ?? null,
                              vEnd: cr.verseEnd ?? null,
                              versesList: loaded,
                              runAiEnrichment: false,
                            });
                          }}
                          className="p-3 bg-slate-50 hover:bg-amber-50/50 rounded-lg border border-slate-200/80 hover:border-amber-300 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-900">
                              {cr.ref}
                            </span>
                            <span className="text-[11px] text-amber-800 font-medium">
                              Open &amp; Sync Sermon &rarr;
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1 italic font-serif">
                            "{cr.quote}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {bibleTab === "scratchpad" && (
              <div className="h-full flex flex-col max-w-2xl mx-auto">
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex-1 flex flex-col min-h-[360px]">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold text-slate-700">
                      Passage Study Notes &amp; Greek/Hebrew Insights (
                      {currentSermon.passageTag})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAiWordStudy}
                        disabled={!!aiLoadingTask}
                        className="text-xs text-purple-800 hover:text-purple-950 font-semibold flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate Word Study</span>
                      </button>
                      <span className="text-slate-300">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          const text = (currentSermon.scratchpad || "").trim();
                          if (!text) {
                            showToast("Scratchpad is empty");
                            return;
                          }
                          const formatted = text.replace(/\n/g, "<br>");
                          insertHtmlAtCursor(
                            `<blockquote class="illustration-box"><strong>Exegesis Insight (${currentSermon.passageTag}):</strong><br>${formatted}</blockquote><p></p>`
                          );
                        }}
                        className="text-xs text-amber-800 hover:text-amber-950 font-semibold"
                      >
                        Insert into Manuscript &rarr;
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={currentSermon.scratchpad || ""}
                    onChange={(e) =>
                      updateCurrentSermon({ scratchpad: e.target.value })
                    }
                    className="w-full flex-1 p-3 text-xs sm:text-sm font-sans bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700 resize-none leading-relaxed select-text"
                    placeholder="Record original language nuances, historical context, or click 'Generate Word Study' above..."
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============================================== */}
        {/* RIGHT PANE: SERMON NOTES & MANUSCRIPT BUILDER  */}
        {/* ============================================== */}
        <section
          style={{
            width:
              typeof window !== "undefined" && window.innerWidth >= 1024
                ? `${100 - bibleSplitPercent}%`
                : undefined,
          }}
          className="w-full lg:h-full flex-1 flex flex-col bg-white overflow-hidden"
        >
          {/* Sermon Metadata Header */}
          <div className="p-4 bg-white border-b border-slate-200 flex-none space-y-2.5">
            {/* Title & View Switcher */}
            <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={currentSermon.title}
                    onChange={(e) =>
                      updateCurrentSermon({ title: e.target.value })
                    }
                    className="w-full font-display text-xl sm:text-2xl font-bold text-slate-900 placeholder:text-slate-300 border-none p-0 focus:outline-none focus:ring-0 select-text"
                    placeholder="Untitled Sermon"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTitleSuggestions((v) => !v)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-900 border border-slate-200 text-[11px] font-medium whitespace-nowrap shrink-0"
                    title="Show or hide sermon title suggestions for the chosen Scripture"
                  >
                    Title Ideas
                  </button>
                </div>

                {/* Clickable Title Suggestions Bar Based on Chosen Scripture */}
                {showTitleSuggestions && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Suggestions for {currentSermon.passageTag}:
                    </span>
                    {activeTitleSuggestions.map((t, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          updateCurrentSermon({ title: t });
                          showToast(`Applied sermon title: "${t}"`);
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded border transition-colors truncate max-w-[240px] ${
                          currentSermon.title === t
                            ? "bg-amber-100/90 border-amber-300 text-amber-950 font-semibold"
                            : "bg-slate-50 hover:bg-amber-50 border-slate-200 text-slate-600 hover:text-slate-900"
                        }`}
                        title={`Click to use title: ${t}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Text:</span>
                    <input
                      type="text"
                      value={currentSermon.passageTag}
                      onChange={(e) =>
                        updateCurrentSermon({ passageTag: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          parseAndLoadReference(
                            currentSermon.passageTag,
                            true
                          );
                        }
                      }}
                      placeholder="e.g. Romans 8:1-17"
                      className="border-b border-dashed border-slate-300 focus:border-amber-700 focus:outline-none pb-0.5 text-amber-900 font-semibold bg-transparent select-text w-32"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        parseAndLoadReference(currentSermon.passageTag, true)
                      }
                      className="px-2 py-0.5 rounded bg-amber-800 hover:bg-amber-900 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
                      title="Load this Scripture passage and update Title, Big Idea, Intro Illustration & Manuscript"
                    >
                      <Wand2 className="w-3 h-3" />
                      <span>Build from Text</span>
                    </button>
                  </div>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Series:</span>
                    <input
                      type="text"
                      value={currentSermon.series}
                      onChange={(e) =>
                        updateCurrentSermon({ series: e.target.value })
                      }
                      placeholder="e.g. Unstoppable Grace"
                      className="border-b border-dashed border-slate-300 focus:border-amber-700 focus:outline-none pb-0.5 text-slate-700 font-medium bg-transparent select-text"
                    />
                  </div>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Date:</span>
                    <input
                      type="date"
                      value={currentSermon.date}
                      onChange={(e) =>
                        updateCurrentSermon({ date: e.target.value })
                      }
                      className="border-b border-dashed border-slate-300 focus:border-amber-700 focus:outline-none pb-0.5 text-slate-700 font-mono text-xs bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Manuscript vs Notes Organizer vs Outline View Segmented Control */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditorViewMode("manuscript")}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                    editorViewMode === "manuscript"
                      ? "bg-white shadow-xs text-amber-950 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Manuscript
                </button>
                <button
                  type="button"
                  onClick={() => setEditorViewMode("organizer")}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                    editorViewMode === "organizer"
                      ? "bg-white shadow-xs text-amber-950 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-800" />
                  <span>Notes Organizer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorViewMode("outline")}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                    editorViewMode === "outline"
                      ? "bg-white shadow-xs text-amber-950 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Outline View
                </button>
              </div>
            </div>

            {/* Homiletical Mode Selector Row */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="text-slate-400 font-medium">
                  Homiletical Approach:
                </span>
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
                  {(
                    [
                      { id: "expository", label: "Expository" },
                      { id: "textual", label: "Textual" },
                      { id: "topical", label: "Topical" },
                    ] as { id: HomileticalMode; label: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        updateCurrentSermon({ homileticalMode: m.id });
                        showToast(`Switched to ${m.label} preaching mode`);
                      }}
                      className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                        currentSermon.homileticalMode === m.id
                          ? "bg-white text-amber-950 font-semibold shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowHomileticGuide(true)}
                  className="p-1 text-slate-400 hover:text-amber-800 rounded transition-colors"
                  title="Compare Expository, Textual & Topical frameworks"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={applyHomileticModeTemplate}
                  className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-medium transition-colors whitespace-nowrap"
                >
                  Rebuild for {activeReferenceBadge}
                </button>
                <button
                  type="button"
                  onClick={handleAiGenerateFullSermonFromText}
                  disabled={!!aiLoadingTask}
                  className="px-2.5 py-1 rounded-md bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap disabled:opacity-50"
                  title="Use Gemini AI to craft Title Suggestions, Big Idea, Intro Illustration, and Manuscript from your chosen Scripture text"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Generate All from Text</span>
                </button>
              </div>
            </div>

            {/* Topical Cross-References Bar (When Topical mode is selected) */}
            {currentSermon.homileticalMode === "topical" && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-700 mr-1">
                    Topical Passages:
                  </span>
                  {(currentSermon.topicalRefs || []).map((ref, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-800 px-2 py-0.5 rounded-md text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => parseAndLoadReference(ref, true)}
                        className="font-medium hover:text-amber-800 hover:underline"
                      >
                        {ref}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = (currentSermon.topicalRefs || []).filter(
                            (_, i) => i !== idx
                          );
                          updateCurrentSermon({ topicalRefs: next });
                        }}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTopicalRef}
                    onChange={(e) => setNewTopicalRef(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTopicalRef.trim()) {
                        updateCurrentSermon({
                          topicalRefs: [
                            ...(currentSermon.topicalRefs || []),
                            newTopicalRef.trim(),
                          ],
                        });
                        setNewTopicalRef("");
                      }
                    }}
                    placeholder="Add ref (e.g. John 3:16)"
                    className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-800 w-36 focus:outline-none focus:ring-1 focus:ring-amber-700 select-text"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTopicalRef.trim()) return;
                      updateCurrentSermon({
                        topicalRefs: [
                          ...(currentSermon.topicalRefs || []),
                          newTopicalRef.trim(),
                        ],
                      });
                      setNewTopicalRef("");
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* The Big Idea (Homiletical Core Proposition Rooted in Scripture) */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg px-3 py-2 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-semibold text-amber-950 whitespace-nowrap shrink-0">
                  Big Idea ({currentSermon.passageTag}):
                </span>
                <input
                  type="text"
                  value={currentSermon.bigIdea}
                  onChange={(e) =>
                    updateCurrentSermon({ bigIdea: e.target.value })
                  }
                  className="w-full text-xs font-medium text-amber-950 bg-transparent border-none p-0 focus:outline-none focus:ring-0 placeholder:text-amber-800/40 select-text"
                  placeholder="State your sermon's single core biblical proposition in one clear sentence..."
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const pkg = buildSermonPackageFromPassage({
                    book: bibleBook,
                    chapter: bibleChapter,
                    version: bibleVersion,
                    verses: passageVerses,
                    mode: currentSermon.homileticalMode,
                    verseStart: verseStartFilter,
                    verseEnd: verseEndFilter,
                  });
                  updateCurrentSermon({ bigIdea: pkg.bigIdea });
                  showToast(`Updated Big Idea from ${pkg.passageTag}`);
                }}
                className="text-[11px] font-semibold text-amber-900 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200/80 px-2 py-0.5 rounded whitespace-nowrap shrink-0"
                title="Derive Big Idea from the selected Scripture passage"
              >
                Derive from Text
              </button>
            </div>
          </div>

          {/* Rich Text Formatting Toolbar */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-1.5 flex-wrap text-xs text-slate-600 flex-none">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => execEditorFormat("bold")}
                className="p-1.5 rounded hover:bg-slate-200 font-bold text-slate-700"
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => execEditorFormat("italic")}
                className="p-1.5 rounded hover:bg-slate-200 italic font-serif text-slate-700"
                title="Italic"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => execEditorFormat("underline")}
                className="p-1.5 rounded hover:bg-slate-200 underline text-slate-700"
                title="Underline"
              >
                U
              </button>

              <div className="h-4 w-px bg-slate-300 mx-1" />

              <button
                type="button"
                onClick={() => execEditorFormat("formatBlock", "h1")}
                className="px-2 py-1 rounded hover:bg-slate-200 font-bold text-slate-700"
                title="Main Point Heading (H1)"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => execEditorFormat("formatBlock", "h2")}
                className="px-2 py-1 rounded hover:bg-slate-200 font-bold text-slate-700"
                title="Sub-Point Heading (H2)"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => execEditorFormat("formatBlock", "p")}
                className="px-2 py-1 rounded hover:bg-slate-200 font-bold text-slate-700"
                title="Body Paragraph"
              >
                P
              </button>

              <div className="h-4 w-px bg-slate-300 mx-1" />

              <button
                type="button"
                onClick={() => execEditorFormat("insertUnorderedList")}
                className="p-1.5 rounded hover:bg-slate-200 text-slate-700"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execEditorFormat("insertOrderedList")}
                className="p-1.5 rounded hover:bg-slate-200 text-slate-700"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const snippet = displayedVerses
                    .slice(0, 3)
                    .map((v) => `(${v.v}) ${v.text}`)
                    .join(" ");
                  insertHtmlAtCursor(
                    `<blockquote class="scripture-quote">${activeReferenceBadge} (${bibleVersion}) — "${snippet}"</blockquote><p></p>`
                  );
                }}
                className="p-1.5 rounded hover:bg-slate-200 text-amber-800"
                title={`Insert Scripture Quote Block (${activeReferenceBadge})`}
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const pkg = buildSermonPackageFromPassage({
                    book: bibleBook,
                    chapter: bibleChapter,
                    version: bibleVersion,
                    verses: passageVerses,
                    mode: currentSermon.homileticalMode,
                    verseStart: verseStartFilter,
                    verseEnd: verseEndFilter,
                  });
                  insertHtmlAtCursor(
                    `<blockquote class="illustration-box"><strong>Opening Illustration (${pkg.passageTag}):</strong> ${pkg.introIllustration}</blockquote><p></p>`
                  );
                  showToast(
                    `Inserted intro illustration for ${pkg.passageTag}`
                  );
                }}
                className="px-2 py-1 rounded hover:bg-blue-50 text-blue-700 font-medium flex items-center gap-1"
                title="Insert Opening Intro Illustration based on chosen Scripture"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Intro Illustration</span>
              </button>
            </div>

            {/* Pulpit Cue Badges */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 font-medium">
                Cue:
              </span>
              <button
                type="button"
                onClick={() =>
                  insertHtmlAtCursor(
                    ` <span class="cue-badge cue-slide">[SLIDE]</span> `
                  )
                }
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
              >
                [SLIDE]
              </button>
              <button
                type="button"
                onClick={() =>
                  insertHtmlAtCursor(
                    ` <span class="cue-badge cue-pause">[PAUSE 3s]</span> `
                  )
                }
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200"
              >
                [PAUSE]
              </button>
              <button
                type="button"
                onClick={() =>
                  insertHtmlAtCursor(
                    ` <span class="cue-badge cue-response">[RESPONSE]</span> `
                  )
                }
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
              >
                [RESPONSE]
              </button>
            </div>

            {/* Voice Dictation, Transcription Studio & AI Homiletics */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  isDictating ? stopLiveDictation() : startLiveDictation()
                }
                className={`px-2.5 py-1 rounded-md border font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  isDictating
                    ? "bg-rose-50 border-rose-300 text-rose-800"
                    : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-950"
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isDictating ? "Listening..." : "Dictate"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTranscribeModal(true)}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap"
              >
                Transcribe Studio
              </button>

              {/* AI Homiletics Menu */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setShowAiMenu((v) => !v)}
                  disabled={!!aiLoadingTask}
                  className="px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                  <span>{aiLoadingTask || "AI Homiletics"}</span>
                  <ChevronDown className="w-3 h-3 text-purple-500" />
                </button>

                {showAiMenu && (
                  <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-100">
                      Gemini Assistant ({currentSermon.passageTag})
                    </div>
                    <button
                      type="button"
                      onClick={handleAiGenerateFullSermonFromText}
                      className="w-full text-left px-3 py-2 hover:bg-purple-50/70 text-slate-800 border-b border-slate-50"
                    >
                      <div className="font-semibold text-purple-950">
                        Generate Full Sermon from {activeReferenceBadge}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Title ideas, Big Idea, Intro Illustration &amp;
                        Manuscript
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAiOrganizeNotes()}
                      className="w-full text-left px-3 py-2 hover:bg-purple-50/70 text-slate-800 border-b border-slate-50"
                    >
                      <div className="font-semibold text-amber-900">
                        Organize My Sermon Notes
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Arrange raw brainstormed notes into logical preaching
                        order
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleAiGenerateOutline}
                      className="w-full text-left px-3 py-2 hover:bg-purple-50/70 text-slate-800"
                    >
                      <div className="font-semibold text-slate-900">
                        Generate Sermon Outline
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Build {currentSermon.homileticalMode} structure from{" "}
                        {currentSermon.passageTag}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleAiWordStudy}
                      className="w-full text-left px-3 py-2 hover:bg-purple-50/70 text-slate-800"
                    >
                      <div className="font-semibold text-slate-900">
                        Original Language Word Study
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Greek &amp; Hebrew lexical nuances in{" "}
                        {currentSermon.passageTag}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleAiIllustration}
                      className="w-full text-left px-3 py-2 hover:bg-purple-50/70 text-slate-800"
                    >
                      <div className="font-semibold text-slate-900">
                        Generate Intro Illustration &amp; Story
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Opening hook &amp; metaphor tailored to{" "}
                        {currentSermon.passageTag}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleAiPolish}
                      className="w-full text-left px-3 py-2 hover:bg-purple-50/70 text-slate-800"
                    >
                      <div className="font-semibold text-slate-900">
                        Pacing &amp; Flow Check
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Evaluate transitions and spoken cadence
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Editor Scroll Viewport */}
          <div
            ref={editorScrollRef}
            className="flex-1 overflow-y-auto p-6 sm:p-10 relative bg-white"
          >
            {/* Active Voice Dictation Bar */}
            {isDictating && (
              <div className="max-w-2xl mx-auto mb-5 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs flex items-center justify-between gap-3 text-amber-950">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <Mic className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold shrink-0">Dictating:</span>
                  <input
                    type="text"
                    value={dictationText}
                    onChange={(e) => setDictationText(e.target.value)}
                    placeholder="Speak into your microphone or type dictated thoughts..."
                    className="w-full bg-transparent border-none focus:outline-none italic text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (dictationText.trim()) {
                        insertHtmlAtCursor(`<p>${dictationText.trim()}</p>`);
                        setDictationText("");
                        showToast("Inserted dictated text into manuscript");
                      }
                      stopLiveDictation();
                    }}
                    className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded text-xs font-semibold"
                  >
                    Insert Text
                  </button>
                  <button
                    type="button"
                    onClick={stopLiveDictation}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium"
                  >
                    Stop
                  </button>
                </div>
              </div>
            )}

            {/* Manuscript Rich Text Editor */}
            <div
              className={
                editorViewMode === "manuscript"
                  ? "max-w-2xl mx-auto min-h-full"
                  : "hidden"
              }
            >
              <div
                id="editor"
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onKeyUp={saveEditorSelection}
                onMouseUp={saveEditorSelection}
                className="editor-content min-h-[520px] outline-none font-serif text-slate-800 text-base leading-relaxed select-text"
                spellCheck
              />
            </div>

            {/* Outline Builder & Time Budget View */}
            {editorViewMode === "outline" && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Homiletical Structure &amp; Time Budget (
                      {currentSermon.passageTag})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Plan sermon movements, pacing allocations, and core
                      transitions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAiGenerateOutline}
                      disabled={!!aiLoadingTask}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Generate</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = [
                          ...(currentSermon.outline || []),
                          {
                            name: "New Sermon Movement",
                            minutes: 5,
                            notes: "",
                          },
                        ];
                        updateCurrentSermon({ outline: next });
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Section</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {(currentSermon.outline || []).map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1">
                          <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={sec.name}
                            onChange={(e) => {
                              const next = [...(currentSermon.outline || [])];
                              next[idx] = {
                                ...next[idx],
                                name: e.target.value,
                              };
                              updateCurrentSermon({ outline: next });
                            }}
                            className="font-semibold text-sm text-slate-900 bg-transparent border-none p-0 focus:outline-none flex-1 select-text"
                            placeholder="Section Heading"
                          />
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={sec.minutes}
                              onChange={(e) => {
                                const next = [...(currentSermon.outline || [])];
                                next[idx] = {
                                  ...next[idx],
                                  minutes: parseInt(e.target.value, 10) || 1,
                                };
                                updateCurrentSermon({ outline: next });
                              }}
                              className="w-12 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center text-xs font-mono font-semibold text-slate-800"
                            />
                            <span>min</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = (currentSermon.outline || []).filter(
                                (_, i) => i !== idx
                              );
                              updateCurrentSermon({ outline: next });
                            }}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                            title="Remove section"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={sec.notes || ""}
                        onChange={(e) => {
                          const next = [...(currentSermon.outline || [])];
                          next[idx] = { ...next[idx], notes: e.target.value };
                          updateCurrentSermon({ outline: next });
                        }}
                        placeholder="Exegetical focus, key sub-points, or transition note..."
                        className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5 focus:bg-white focus:outline-none focus:border-amber-600 select-text"
                      />
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-950 flex-wrap gap-2">
                  <span className="font-semibold">
                    Total Planned Preaching Time:{" "}
                    <span className="font-mono font-bold">
                      {outlineTotalMinutes}
                    </span>{" "}
                    minutes
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentSermon.outline?.length) return;
                      const html = currentSermon.outline
                        .map(
                          (sec) =>
                            `<h1>${sec.name} (${sec.minutes} mins)</h1><p>${
                              sec.notes ? `<em>${sec.notes}</em>` : ""
                            }</p><p></p>`
                        )
                        .join("");
                      insertHtmlAtCursor(html);
                      setEditorViewMode("manuscript");
                      showToast("Inserted outline headings into manuscript");
                    }}
                    className="font-semibold text-amber-900 hover:text-amber-950 underline"
                  >
                    Generate Outline Headings into Manuscript &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* NOTES ORGANIZER VIEW: RAW NOTES -> LOGICAL ORDER   */}
            {/* ================================================== */}
            {editorViewMode === "organizer" && (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Header & Framework Selector */}
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-800" />
                      <h3 className="font-display text-base font-bold text-slate-900">
                        Sermon Notes Organizer ({currentSermon.passageTag})
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Type or paste your full, unstructured sermon notes,
                      illustrations, and verse observations below—AI will
                      arrange them into a logical preaching sequence.
                    </p>
                  </div>

                  {/* Organization Framework Picker */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Order Style:
                    </span>
                    <select
                      value={notesFramework}
                      onChange={(e) =>
                        setNotesFramework(
                          e.target.value as NotesOrganizationFramework
                        )
                      }
                      className="text-xs font-medium bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-700"
                    >
                      <option value="expository-flow">
                        Expository Flow (Verse-by-Verse Sequence)
                      </option>
                      <option value="problem-gospel-response">
                        Redemptive Arc (Problem &rarr; Gospel &rarr; Response)
                      </option>
                      <option value="classic-three-point">
                        Classic 3-Point Homiletical Structure
                      </option>
                    </select>
                  </div>
                </div>

                {/* Step 1: Pastor's Raw Unstructured Sermon Notes Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label
                      htmlFor="raw-sermon-notes-input"
                      className="text-xs font-bold text-slate-800 flex items-center gap-1.5"
                    >
                      <span className="w-5 h-5 rounded-md bg-amber-800 text-white font-mono text-[11px] flex items-center justify-center">
                        1
                      </span>
                      <span>Your Full Sermon Notes &amp; Brainstorm</span>
                    </label>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const sample = getSampleRawNotesForPassage(
                            currentSermon.passageTag ||
                              `${bibleBook} ${bibleChapter}`,
                            currentSermon.bigIdea
                          );
                          updateCurrentSermon({ rawNotes: sample });
                          showToast(
                            `Loaded sample sermon notes for ${currentSermon.passageTag}`
                          );
                        }}
                        className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-950 border border-slate-200 font-medium transition-colors"
                      >
                        Load Sample Notes
                      </button>
                      <button
                        type="button"
                        onClick={importCurrentManuscriptIntoOrganizer}
                        className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium transition-colors"
                        title="Pull your current manuscript and exegesis scratchpad into this box to reorganize"
                      >
                        Import Current Draft
                      </button>
                      {currentSermon.rawNotes && (
                        <button
                          type="button"
                          onClick={() => updateCurrentSermon({ rawNotes: "" })}
                          className="px-2 py-1 text-slate-400 hover:text-rose-600 font-medium"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    id="raw-sermon-notes-input"
                    value={currentSermon.rawNotes || ""}
                    onChange={(e) =>
                      updateCurrentSermon({ rawNotes: e.target.value })
                    }
                    rows={8}
                    placeholder={`Type or paste all your raw sermon thoughts, bullet points, verse observations, illustrations, quotes, and application ideas for ${currentSermon.passageTag} in any order...\n\nExample:\n- Opening story about a courtroom verdict...\n- Verse observation on ${currentSermon.passageTag}...\n- Main struggle the congregation faces on Monday morning...\n- How Jesus fulfills this promise...\n- Practical takeaway for families this week...`}
                    className="w-full p-3.5 text-sm font-sans bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700/30 focus:border-amber-700 resize-y leading-relaxed text-slate-800 select-text"
                  />

                  <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                    <span className="text-[11px] text-slate-500">
                      Tip: Don&apos;t worry about order as you type—include
                      illustrations, verse notes, and applications freely.
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleAiOrganizeNotes(currentSermon.rawNotes)
                      }
                      disabled={aiLoadingTask === "Organizing Notes..."}
                      className="px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {aiLoadingTask === "Organizing Notes..."
                          ? "Organizing into Logical Order..."
                          : "AI Organize into Logical Order"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Step 2: AI-Organized Logical Sermon Flow */}
                {currentSermon.organizedSections &&
                currentSermon.organizedSections.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-purple-700 text-white font-mono text-[11px] font-bold flex items-center justify-center">
                          2
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            Logical Preaching Order (
                            {currentSermon.organizedSections.length} Movements ·{" "}
                            <span className="font-mono">
                              {currentSermon.organizedSections.reduce(
                                (sum, s) =>
                                  sum + (Number(s.estimatedMinutes) || 0),
                                0
                              )}
                            </span>{" "}
                            mins)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Reorder movements, refine any section, or send the
                            organized structure directly to your Manuscript or
                            Outline
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={syncOrganizedSectionsToOutline}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                        >
                          Sync to Outline View
                        </button>
                        <button
                          type="button"
                          onClick={applyOrganizedSectionsToManuscript}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Build Full Manuscript from Organized Notes</span>
                        </button>
                      </div>
                    </div>

                    {/* Synthesized Title & Big Idea Suggestion Banner */}
                    {(organizerSuggestedTitle || organizerSuggestedBigIdea) && (
                      <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 flex items-center justify-between gap-3 flex-wrap text-xs">
                        <div className="space-y-1 flex-1 min-w-[220px]">
                          {organizerSuggestedTitle && (
                            <div className="text-slate-800">
                              <span className="font-semibold text-amber-950">
                                Suggested Title:{" "}
                              </span>
                              <span className="font-medium">
                                {organizerSuggestedTitle}
                              </span>
                            </div>
                          )}
                          {organizerSuggestedBigIdea && (
                            <div className="text-slate-700">
                              <span className="font-semibold text-amber-950">
                                Synthesized Big Idea:{" "}
                              </span>
                              <span>{organizerSuggestedBigIdea}</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentSermon({
                              ...(organizerSuggestedTitle
                                ? { title: organizerSuggestedTitle }
                                : {}),
                              ...(organizerSuggestedBigIdea
                                ? { bigIdea: organizerSuggestedBigIdea }
                                : {}),
                            });
                            showToast(
                              "Applied suggested Title & Big Idea from organized notes"
                            );
                          }}
                          className="px-2.5 py-1 rounded-md bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs shrink-0"
                        >
                          Apply Title &amp; Big Idea
                        </button>
                      </div>
                    )}

                    {/* Ordered Section Cards */}
                    <div className="space-y-3">
                      {currentSermon.organizedSections.map((sec, idx) => {
                        const totalSecs =
                          currentSermon.organizedSections?.length || 0;
                        return (
                          <div
                            key={sec.id || idx}
                            className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs"
                          >
                            {/* Card Top Row: Step Number, Category, Reorder & Actions */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-950 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded">
                                  {sec.category}
                                </span>
                                {sec.scriptureConnection && (
                                  <span className="text-[11px] text-slate-500 truncate max-w-[260px]">
                                    · {sec.scriptureConnection}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <div className="flex items-center gap-1 text-xs text-slate-500 mr-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={45}
                                    value={sec.estimatedMinutes}
                                    onChange={(e) => {
                                      const next = [
                                        ...(currentSermon.organizedSections ||
                                          []),
                                      ];
                                      next[idx] = {
                                        ...next[idx],
                                        estimatedMinutes:
                                          parseInt(e.target.value, 10) || 5,
                                      };
                                      updateCurrentSermon({
                                        organizedSections: next,
                                      });
                                    }}
                                    className="w-11 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-mono text-xs font-semibold text-slate-800"
                                  />
                                  <span className="text-[11px]">min</span>
                                </div>

                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveOrganizedSection(idx, -1)}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30"
                                  title="Move section earlier in logical order"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === totalSecs - 1}
                                  onClick={() => moveOrganizedSection(idx, 1)}
                                  className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30"
                                  title="Move section later in logical order"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const bulletsHtml =
                                      sec.keyBullets &&
                                      sec.keyBullets.length > 0
                                        ? `<ul>${sec.keyBullets
                                            .map((b) => `<li>${b}</li>`)
                                            .join("")}</ul>`
                                        : "";
                                    const block = `<h1>${sec.heading}</h1><p>${sec.organizedContent}</p>${bulletsHtml}${
                                      sec.transitionToNext
                                        ? `<p><em>${sec.transitionToNext}</em></p>`
                                        : ""
                                    }`;
                                    insertHtmlAtCursor(block);
                                    setEditorViewMode("manuscript");
                                    showToast(
                                      `Inserted "${sec.heading}" into manuscript`
                                    );
                                  }}
                                  className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-semibold"
                                >
                                  Insert into Manuscript
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = (
                                      currentSermon.organizedSections || []
                                    ).filter((_, i) => i !== idx);
                                    updateCurrentSermon({
                                      organizedSections: next,
                                    });
                                  }}
                                  className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                  title="Remove section"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Editable Section Heading */}
                            <input
                              type="text"
                              value={sec.heading}
                              onChange={(e) => {
                                const next = [
                                  ...(currentSermon.organizedSections || []),
                                ];
                                next[idx] = {
                                  ...next[idx],
                                  heading: e.target.value,
                                };
                                updateCurrentSermon({
                                  organizedSections: next,
                                });
                              }}
                              className="w-full font-display font-bold text-sm sm:text-base text-slate-900 bg-transparent border-b border-transparent focus:border-amber-700 focus:outline-none pb-0.5 select-text"
                              placeholder="Section Heading"
                            />

                            {/* Editable Organized Content */}
                            <textarea
                              value={sec.organizedContent}
                              onChange={(e) => {
                                const next = [
                                  ...(currentSermon.organizedSections || []),
                                ];
                                next[idx] = {
                                  ...next[idx],
                                  organizedContent: e.target.value,
                                };
                                updateCurrentSermon({
                                  organizedSections: next,
                                });
                              }}
                              rows={3}
                              className="w-full p-2.5 text-xs sm:text-sm font-serif text-slate-800 bg-slate-50 border border-slate-200/80 rounded-lg focus:bg-white focus:outline-none focus:border-amber-700 resize-y leading-relaxed select-text"
                            />

                            {/* Key Bullets from Pastor's Notes */}
                            {sec.keyBullets && sec.keyBullets.length > 0 && (
                              <div className="pl-3 border-l-2 border-slate-200 space-y-1">
                                <span className="text-[11px] font-semibold text-slate-500 block">
                                  Key Takeaways &amp; Supporting Points:
                                </span>
                                <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5">
                                  {sec.keyBullets.map((b, bIdx) => (
                                    <li key={bIdx}>{b}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Transition to Next Movement */}
                            {sec.transitionToNext && (
                              <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-500 italic">
                                <span className="font-semibold not-italic text-slate-600">
                                  Bridge to next point:
                                </span>
                                <input
                                  type="text"
                                  value={sec.transitionToNext}
                                  onChange={(e) => {
                                    const next = [
                                      ...(currentSermon.organizedSections ||
                                        []),
                                    ];
                                    next[idx] = {
                                      ...next[idx],
                                      transitionToNext: e.target.value,
                                    };
                                    updateCurrentSermon({
                                      organizedSections: next,
                                    });
                                  }}
                                  className="flex-1 bg-transparent border-none p-0 focus:outline-none focus:ring-0 italic text-slate-600 select-text"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 text-center space-y-2.5">
                    <Layers className="w-6 h-6 text-amber-800 mx-auto" />
                    <div className="text-sm font-semibold text-slate-800">
                      Ready to Organize Your Sermon Notes
                    </div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Type or paste your raw sermon thoughts above (or click{" "}
                      <strong>Load Sample Notes</strong>), then click{" "}
                      <strong>AI Organize into Logical Order</strong> to build a
                      structured preaching flow.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Metrics & Pacing Bar */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 flex-none">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Words:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {wordCount.toLocaleString()}
                </span>
              </div>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Est. Preach Time:</span>
                <span className="font-mono font-semibold text-amber-900">
                  ~{estMinutes} {estMinutes === 1 ? "min" : "mins"}
                </span>
              </div>
              <span
                aria-hidden="true"
                className="hidden sm:inline text-slate-300"
              >
                ·
              </span>
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-slate-400">Cadence:</span>
                <select
                  value={speakingPace}
                  onChange={(e) =>
                    setSpeakingPace(parseInt(e.target.value, 10) || 140)
                  }
                  className="bg-transparent border-none text-xs font-medium text-slate-700 focus:outline-none p-0 cursor-pointer"
                >
                  <option value={120}>Reflective (120 wpm)</option>
                  <option value={140}>Standard (140 wpm)</option>
                  <option value={160}>Dynamic (160 wpm)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-[11px] text-slate-400">
                Select any passage on left &amp; click "Use for Sermon"
              </span>
              <button
                type="button"
                onClick={() =>
                  editorScrollRef.current?.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  })
                }
                className="p-1 rounded hover:bg-slate-200 text-slate-500"
                title="Scroll Manuscript to Top"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================== */}
      {/* MODAL: PREACH / PULPIT TELEPROMPTER            */}
      {/* ============================================== */}
      {showPreachModal && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-serif">
          <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-none font-sans gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-base font-bold text-white tracking-wide">
                {currentSermon.title || "Untitled Sermon"}
              </h2>
              <p className="text-xs text-slate-400">
                {currentSermon.passageTag || "No passage"} ·{" "}
                {currentSermon.series || "Standalone"} · Est. ~{estMinutes} mins
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Pulpit Stopwatch */}
              <div className="flex items-center bg-slate-800 px-3.5 py-1.5 rounded-xl border border-slate-700">
                <Clock className="w-4 h-4 text-amber-400 mr-2" />
                <span className="font-mono text-lg font-bold text-amber-300 tabular-nums">
                  {formatTimer(preachSeconds)}
                </span>
                <div className="flex items-center gap-1 ml-3">
                  <button
                    type="button"
                    onClick={() => setIsPreachTimerRunning((v) => !v)}
                    className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white"
                    title={
                      isPreachTimerRunning ? "Pause Timer" : "Start Timer"
                    }
                  >
                    {isPreachTimerRunning ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPreachTimerRunning(false);
                      setPreachSeconds(0);
                    }}
                    className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 text-xs text-slate-200">
                <button
                  type="button"
                  onClick={() =>
                    setPreachFontSize((s) => Math.max(0.95, s - 0.15))
                  }
                  className="px-2.5 py-1 rounded hover:bg-slate-700 font-bold"
                >
                  A-
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPreachFontSize((s) => Math.min(2.4, s + 0.15))
                  }
                  className="px-2.5 py-1 rounded hover:bg-slate-700 font-bold"
                >
                  A+
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsPreachTimerRunning(false);
                  setShowPreachModal(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-semibold border border-rose-800/60 flex items-center gap-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Exit Pulpit</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-12 flex justify-center bg-slate-950 select-text">
            <div className="max-w-3xl w-full space-y-6">
              {currentSermon.bigIdea && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-700/40 text-amber-200 text-sm font-sans">
                  <span className="font-bold uppercase tracking-wider text-xs text-amber-400 block mb-1">
                    The Big Idea ({currentSermon.passageTag})
                  </span>
                  {currentSermon.bigIdea}
                </div>
              )}
              <div
                style={{ fontSize: `${preachFontSize}rem` }}
                className="preach-dark-content leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html:
                    currentSermon.notes || "<p>No manuscript notes drafted.</p>",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* MODAL: SERMON LIBRARY & ARCHIVES               */}
      {/* ============================================== */}
      {showLibraryModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowLibraryModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Sermon Library &amp; Archives
                </h3>
                <p className="text-xs text-slate-500">
                  Switch between manuscripts, duplicate templates, or start a
                  new sermon from {activeReferenceBadge}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={createNewSermon}
                  className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New from {activeReferenceBadge}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLibraryModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto divide-y divide-slate-100 flex-1">
              {sermons.map((s) => {
                const isCurrent = s.id === currentSermon.id;
                return (
                  <div
                    key={s.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 truncate">
                          {s.title || "Untitled Sermon"}
                        </h4>
                        {isCurrent && (
                          <span className="text-[11px] font-semibold text-amber-800">
                            · Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {s.passageTag || "No reference"} ·{" "}
                        {s.series || "Standalone"} · {s.date || "No date"} ·{" "}
                        <span className="capitalize">{s.homileticalMode}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentSermonId(s.id);
                            setShowLibraryModal(false);
                            if (s.passageTag) {
                              parseAndLoadReference(s.passageTag, false);
                            }
                          }}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs rounded-lg transition-colors"
                        >
                          Open
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => duplicateSermon(s)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                        title="Duplicate Sermon"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {sermons.length > 1 && (
                        <button
                          type="button"
                          onClick={() => deleteSermon(s.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                          title="Delete Sermon"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* MODAL: AUDIO TRANSCRIPTION & VOICE STUDIO      */}
      {/* ============================================== */}
      {showTranscribeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowTranscribeModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
                    Audio Transcription &amp; Voice Studio
                  </h3>
                  <p className="text-xs text-slate-500">
                    Record voice memos, upload pastoral audio files, or generate
                    spoken reflections on {currentSermon.passageTag}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopStudioAudioRecording();
                  setShowTranscribeModal(false);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {isStudioRecording
                        ? "Recording Microphone Audio..."
                        : isTranscribingAi
                        ? "Transcribing with Gemini..."
                        : "Audio Studio Ready"}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {formatTimer(studioRecordSeconds)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        isStudioRecording
                          ? stopStudioAudioRecording()
                          : startStudioAudioRecording()
                      }
                      className={`px-3 py-1.5 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        isStudioRecording
                          ? "bg-rose-700 hover:bg-rose-800"
                          : "bg-amber-800 hover:bg-amber-900"
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>
                        {isStudioRecording
                          ? "Stop & Transcribe"
                          : "Record Audio"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={triggerGeminiVoiceDraft}
                      disabled={isTranscribingAi}
                      className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {isTranscribingAi
                          ? "Processing..."
                          : `Gemini Memo (${currentSermon.passageTag})`}
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Transcribed Text
                  </label>
                  <textarea
                    value={studioTranscript}
                    onChange={(e) => setStudioTranscript(e.target.value)}
                    className="w-full h-36 p-3 text-xs sm:text-sm font-sans bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-700 resize-none leading-relaxed text-slate-800 select-text"
                    placeholder="Record microphone audio, upload an audio file below, or click 'Gemini Memo' to generate spoken sermon notes..."
                  />
                </div>
              </div>

              {/* Upload Audio File */}
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-amber-800">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Upload Audio Recording (.mp3, .wav, .m4a, .webm)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Transcribed server-side using Gemini multimodal audio
                      transcription
                    </p>
                  </div>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isTranscribingAi}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    Choose Audio File
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStudioTranscript("")}
                className="px-3 py-1.5 text-xs text-rose-700 hover:text-rose-900 font-medium"
              >
                Clear Text
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!studioTranscript.trim()) return;
                    const updated =
                      (currentSermon.scratchpad
                        ? currentSermon.scratchpad + "\n\n"
                        : "") +
                      `[Voice Studio Transcript]:\n${studioTranscript.trim()}`;
                    updateCurrentSermon({ scratchpad: updated });
                    setBibleTab("scratchpad");
                    setShowTranscribeModal(false);
                    showToast("Saved transcript to Exegesis Scratchpad");
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                >
                  Save to Exegesis Notes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!studioTranscript.trim()) {
                      showToast("No transcript text to insert");
                      return;
                    }
                    insertHtmlAtCursor(`<p>${studioTranscript.trim()}</p>`);
                    setShowTranscribeModal(false);
                    showToast("Inserted transcript into manuscript");
                  }}
                  className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-semibold"
                >
                  Insert into Manuscript &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================== */}
      {/* MODAL: HOMILETICAL PREACHING MODES GUIDE       */}
      {/* ============================================== */}
      {showHomileticGuide && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowHomileticGuide(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Homiletical Preaching Frameworks
                </h3>
                <p className="text-xs text-slate-500">
                  Choose the structural methodology that fits your sermon
                  assignment
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHomileticGuide(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">
                    01. Expository Preaching (Verse-by-Verse)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      updateCurrentSermon({ homileticalMode: "expository" });
                      setShowHomileticGuide(false);
                    }}
                    className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded text-xs font-semibold"
                  >
                    Use Expository
                  </button>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  <strong>Core Principle:</strong> The continuous biblical
                  passage governs the entire sermon outline. Main points follow
                  the original author's sequential units of thought (e.g. Romans
                  8:1–4, 5–8, 9–17).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">
                    02. Textual Preaching (Single Verse / Clause-by-Clause)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      updateCurrentSermon({ homileticalMode: "textual" });
                      setShowHomileticGuide(false);
                    }}
                    className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs font-semibold"
                  >
                    Use Textual
                  </button>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  <strong>Core Principle:</strong> A single anchor verse (such
                  as John 3:16 or Psalm 23:1) provides both the central theme
                  and the major structural divisions derived from its clauses.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">
                    03. Topical Preaching (Thematic Synthesis)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      updateCurrentSermon({ homileticalMode: "topical" });
                      setShowHomileticGuide(false);
                    }}
                    className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded text-xs font-semibold"
                  >
                    Use Topical
                  </button>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  <strong>Core Principle:</strong> A specific doctrine or
                  pastoral question governs the outline, drawing together
                  multiple supporting passages across the Old and New
                  Testaments.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT CONTAINER */}
      <div id="printArea" className="hidden p-8 font-serif text-slate-900">
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold font-display">
            {currentSermon.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {currentSermon.series ? `Series: ${currentSermon.series} · ` : ""}
            Scripture: {currentSermon.passageTag} · Date: {currentSermon.date}
          </p>
          {currentSermon.bigIdea && (
            <div className="mt-3 p-3 bg-slate-100 italic rounded">
              <strong>The Big Idea:</strong> {currentSermon.bigIdea}
            </div>
          )}
        </div>
        <div
          className="leading-relaxed text-base space-y-4"
          dangerouslySetInnerHTML={{ __html: currentSermon.notes }}
        />
      </div>

      {/* TOAST BANNER */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg border border-slate-700">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
