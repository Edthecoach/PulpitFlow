/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Bookmark,
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
  Link2,
  Volume2,
  Square,
  SkipBack,
  SkipForward,
  AlertTriangle,
  Moon,
  Sun,
} from "lucide-react";
import {
  BIBLE_BOOK_CHAPTERS,
  BIBLE_BOOK_GROUPS,
  buildScholarlyCommentariesForPassage,
  buildSermonPackageFromPassage,
  buildVerseSpecificCommentary,
  CommentaryExcerpt,
  ContextSearchPassage,
  DEFAULT_SERMONS,
  EMBEDDED_BIBLE,
  getSampleRawNotesForPassage,
  HomileticalMode,
  NotesOrganizationFramework,
  OrganizedNoteSection,
  organizeRawNotesLocally,
  PASSAGE_THEMES_MAP,
  QUICK_JUMP_REFS,
  searchScriptureContextByTopic,
  SermonDocument,
  VerseCommentaryNote,
  VerseItem,
} from "./data/bibleData";

const STORAGE_KEY = "pulpitflow_sermons_v3";
const BOOKMARKS_STORAGE_KEY = "pulpitflow_verse_bookmarks_v1";
const ACTIVE_PASSAGE_STORAGE_KEY = "pulpitflow_active_passage_v1";
const BIBLE_SCROLL_STORAGE_KEY = "pulpitflow_bible_scroll_positions_v1";
const VERSE_NOTES_STORAGE_KEY = "pulpitflow_personal_verse_notes_v1";

function formatPassageReference(
  book: string,
  chapter: number,
  vStart: number | null,
  vEnd: number | null
): string {
  if (vStart === null) {
    return `${book} ${chapter}`;
  }
  const cleanEnd = vEnd !== null && vEnd > vStart ? `-${vEnd}` : "";
  return `${book} ${chapter}:${vStart}${cleanEnd}`;
}

function parseReferenceParts(refStr: string): {
  book: string;
  chapter: number;
  vStart: number | null;
  vEnd: number | null;
} | null {
  const trimmed = (refStr || "").trim();
  const match = trimmed.match(
    /^([1-3]?\s?[A-Za-z\s]+?)\s*(\d+)(?::(\d+)(?:[-–](\d+))?)?$/
  );
  if (!match) return null;
  const rawBook = match[1].trim();
  const ch = parseInt(match[2], 10) || 1;
  const vStart = match[3] ? parseInt(match[3], 10) : null;
  const vEnd = match[4] ? parseInt(match[4], 10) : vStart;
  const allBooks = BIBLE_BOOK_GROUPS.flatMap((g) => g.books);
  const matchedBook =
    allBooks.find((b) => b.toLowerCase() === rawBook.toLowerCase()) ||
    allBooks.find((b) => b.toLowerCase().startsWith(rawBook.toLowerCase())) ||
    rawBook;
  return { book: matchedBook, chapter: ch, vStart, vEnd };
}

export interface BookmarkedVerse {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  version: string;
  text: string;
  note?: string;
  createdAt: string;
}

const DEFAULT_BOOKMARKS: BookmarkedVerse[] = [
  {
    id: "Romans-8-1",
    book: "Romans",
    chapter: 8,
    verse: 1,
    version: "WEB",
    text: "There is therefore now no condemnation to those who are in Christ Jesus, who don't walk according to the flesh, but according to the Spirit.",
    note: "Anchor gospel declaration for Romans 8 exposition",
    createdAt: "2026-11-01",
  },
  {
    id: "Romans-8-28",
    book: "Romans",
    chapter: 8,
    verse: 28,
    version: "WEB",
    text: "We know that all things work together for good for those who love God, to those who are called according to his purpose.",
    note: "Divine providence and covenant assurance",
    createdAt: "2026-11-01",
  },
];

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

  // Layout & Split State (Tablet/Desktop Side-by-Side or Top/Bottom & Mobile Top/Bottom)
  const [bibleSplitPercent, setBibleSplitPercent] = useState<number>(50);
  const [workspaceSplitDirection, setWorkspaceSplitDirection] = useState<
    "side-by-side" | "top-bottom"
  >(() => {
    try {
      const saved = localStorage.getItem("pulpitflow_workspace_split_dir_v1");
      if (saved === "side-by-side" || saved === "top-bottom") {
        return saved;
      }
    } catch {}
    // Default portrait tablets (< 960px width) to top-bottom so neither pane feels narrow or cramped
    if (
      typeof window !== "undefined" &&
      window.innerWidth >= 768 &&
      window.innerWidth < 960
    ) {
      return "top-bottom";
    }
    return "side-by-side";
  });
  const [showClassicBibleDropdowns, setShowClassicBibleDropdowns] =
    useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("pulpitflow_dark_mode_v1") === "true";
    } catch {}
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem("pulpitflow_dark_mode_v1", String(darkMode));
    } catch {}
  }, [darkMode]);
  type MobileSplitMode =
    | "50-50"
    | "65-35"
    | "35-65"
    | "bible-only"
    | "notes-only";
  const [mobileSplitMode, setMobileSplitMode] = useState<MobileSplitMode>(
    () => {
      try {
        const saved = localStorage.getItem("pulpitflow_mobile_split_mode_v2");
        if (
          saved &&
          ["50-50", "65-35", "35-65", "bible-only", "notes-only"].includes(saved)
        ) {
          return saved as MobileSplitMode;
        }
      } catch {}
      return "50-50";
    }
  );
  const [mobileBiblePercent, setMobileBiblePercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("pulpitflow_mobile_split_percent_v2");
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 20 && val <= 80) return val;
      }
    } catch {}
    return 50;
  });
  const [showMobileSplitMenu, setShowMobileSplitMenu] =
    useState<boolean>(false);
  const [isDraggingMobileSplit, setIsDraggingMobileSplit] =
    useState<boolean>(false);
  const [showMobileQuickJumps, setShowMobileQuickJumps] =
    useState<boolean>(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const mainContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "pulpitflow_workspace_split_dir_v1",
        workspaceSplitDirection
      );
    } catch {}
  }, [workspaceSplitDirection]);

  useEffect(() => {
    try {
      localStorage.setItem("pulpitflow_mobile_split_mode_v2", mobileSplitMode);
    } catch {}
  }, [mobileSplitMode]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "pulpitflow_mobile_split_percent_v2",
        String(mobileBiblePercent)
      );
    } catch {}
  }, [mobileBiblePercent]);

  const isStackedSplit =
    viewportWidth < 768 || workspaceSplitDirection === "top-bottom";

  // Mobile Top/Bottom Touch/Mouse Drag Resizing
  const handleDividerTouchStart = (_e: React.TouchEvent) => {
    setIsDraggingMobileSplit(true);
  };

  const handleDividerTouchMove = (e: React.TouchEvent) => {
    if (!mainContainerRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = mainContainerRef.current.getBoundingClientRect();
    if (rect.height <= 0) return;
    const relY = touch.clientY - rect.top;
    const percent = Math.min(
      80,
      Math.max(20, Math.round((relY / rect.height) * 100))
    );
    setMobileBiblePercent(percent);
    if (mobileSplitMode === "bible-only" || mobileSplitMode === "notes-only") {
      setMobileSplitMode("50-50");
    }
  };

  const handleDividerTouchEnd = () => {
    setIsDraggingMobileSplit(false);
  };

  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingMobileSplit(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!mainContainerRef.current) return;
      const rect = mainContainerRef.current.getBoundingClientRect();
      if (rect.height <= 0) return;
      const relY = moveEvent.clientY - rect.top;
      const percent = Math.min(
        80,
        Math.max(20, Math.round((relY / rect.height) * 100))
      );
      setMobileBiblePercent(percent);
      if (
        mobileSplitMode === "bible-only" ||
        mobileSplitMode === "notes-only"
      ) {
        setMobileSplitMode("50-50");
      }
    };

    const onMouseUp = () => {
      setIsDraggingMobileSplit(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Dropdowns & Modals
  const [showSermonMenu, setShowSermonMenu] = useState<boolean>(false);
  const [showQuickJumpMenu, setShowQuickJumpMenu] = useState<boolean>(false);
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

  // Initial Active Passage Resolution (from localStorage or currentSermon.passageTag)
  const initialPassageConfig = (() => {
    try {
      const saved = localStorage.getItem(ACTIVE_PASSAGE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.book && parsed.chapter) {
          return {
            book: String(parsed.book),
            chapter: Number(parsed.chapter) || 1,
            version: String(parsed.version || "WEB"),
            vStart:
              parsed.vStart !== undefined && parsed.vStart !== null
                ? Number(parsed.vStart)
                : null,
            vEnd:
              parsed.vEnd !== undefined && parsed.vEnd !== null
                ? Number(parsed.vEnd)
                : null,
          };
        }
      }
    } catch {}
    const fromSermon = parseReferenceParts(currentSermon?.passageTag || "");
    if (fromSermon) {
      return {
        book: fromSermon.book,
        chapter: fromSermon.chapter,
        version: "WEB",
        vStart: fromSermon.vStart,
        vEnd: fromSermon.vEnd,
      };
    }
    return {
      book: "Romans",
      chapter: 8,
      version: "WEB",
      vStart: 1 as number | null,
      vEnd: 17 as number | null,
    };
  })();

  // Bible Reader State
  const [bibleBook, setBibleBook] = useState<string>(initialPassageConfig.book);
  const [bibleChapter, setBibleChapter] = useState<number>(
    initialPassageConfig.chapter
  );
  const [bibleVersion, setBibleVersion] = useState<string>(
    initialPassageConfig.version
  );
  const [passageVerses, setPassageVerses] = useState<VerseItem[]>(
    EMBEDDED_BIBLE[
      `${initialPassageConfig.book} ${initialPassageConfig.chapter}`
    ] ||
      EMBEDDED_BIBLE["Romans 8"] ||
      []
  );
  const [isLoadingBible, setIsLoadingBible] = useState<boolean>(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>("");
  const [bibleTab, setBibleTab] = useState<
    "reader" | "bookmarks" | "commentaries" | "themes" | "scratchpad"
  >("reader");

  // Scripture Reader Font Size State (14px to 28px, default 18px for tablet readability)
  const [bibleFontSize, setBibleFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("pulpitflow_bible_font_size_v1");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 14 && parsed <= 28) {
          return parsed;
        }
      }
    } catch {}
    return 18;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "pulpitflow_bible_font_size_v1",
        String(bibleFontSize)
      );
    } catch {}
  }, [bibleFontSize]);

  const decreaseBibleFontSize = () => {
    setBibleFontSize((prev) => Math.max(14, prev - 2));
  };

  const increaseBibleFontSize = () => {
    setBibleFontSize((prev) => Math.min(28, prev + 2));
  };

  const resetBibleFontSize = () => {
    setBibleFontSize(18);
    showToast("Scripture font size reset to 18px");
  };

  // Verse Range Filter & Selection State (null = All Verses)
  const [verseStartFilter, setVerseStartFilter] = useState<number | null>(
    initialPassageConfig.vStart
  );
  const [verseEndFilter, setVerseEndFilter] = useState<number | null>(
    initialPassageConfig.vEnd
  );
  const [filterOnlyRange, setFilterOnlyRange] = useState<boolean>(false);

  // Refs to prevent stale async fetches from reverting Book/Chapter/Verse selections
  const latestPassageRequestIdRef = useRef<number>(0);
  const activeVerseRangeRef = useRef<{
    start: number | null;
    end: number | null;
  }>({
    start: initialPassageConfig.vStart,
    end: initialPassageConfig.vEnd,
  });

  // Scholarly Commentaries State for Current Scripture Passage
  const [passageCommentaries, setPassageCommentaries] = useState<
    CommentaryExcerpt[]
  >(() =>
    buildScholarlyCommentariesForPassage({
      book: "Romans",
      chapter: 8,
      verseStart: 1,
      verseEnd: 17,
      verses: EMBEDDED_BIBLE["Romans 8"] || [],
    })
  );
  const [isLoadingCommentaries, setIsLoadingCommentaries] =
    useState<boolean>(false);
  const [commentaryLensFilter, setCommentaryLensFilter] =
    useState<string>("All");
  const [savedCommentaryIds, setSavedCommentaryIds] = useState<
    Record<string, boolean>
  >({});

  // Scripture Context Search State (Exegesis Pane)
  const [contextSearchQuery, setContextSearchQuery] = useState<string>("");
  const [activeContextTopic, setActiveContextTopic] =
    useState<string>("Grace & Assurance");
  const [contextSearchResults, setContextSearchResults] = useState<
    ContextSearchPassage[]
  >(() => searchScriptureContextByTopic("grace", "Romans 8:1-17"));
  const [isSearchingContext, setIsSearchingContext] = useState<boolean>(false);

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
  const [bookmarkedVerses, setBookmarkedVerses] = useState<BookmarkedVerse[]>(
    () => {
      try {
        const saved = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
      return DEFAULT_BOOKMARKS;
    }
  );
  const [bookmarkFilterQuery, setBookmarkFilterQuery] = useState<string>("");
  const [copiedVerseNum, setCopiedVerseNum] = useState<number | null>(null);

  // Granular Verse-Specific Commentary Popover State
  const [activeVersePopoverNum, setActiveVersePopoverNum] = useState<
    number | null
  >(null);
  const [verseCommentaryCache, setVerseCommentaryCache] = useState<
    Record<string, VerseCommentaryNote>
  >({});
  const [loadingVerseCommentaryKey, setLoadingVerseCommentaryKey] = useState<
    string | null
  >(null);
  const [savedVerseCommentaryKeys, setSavedVerseCommentaryKeys] = useState<
    Record<string, boolean>
  >({});
  const [personalVerseNotes, setPersonalVerseNotes] = useState<
    Record<string, string>
  >(() => {
    try {
      const saved = localStorage.getItem(VERSE_NOTES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        VERSE_NOTES_STORAGE_KEY,
        JSON.stringify(personalVerseNotes)
      );
    } catch {}
  }, [personalVerseNotes]);

  // Close verse commentary popover when switching Book or Chapter
  useEffect(() => {
    setActiveVersePopoverNum(null);
  }, [bibleBook, bibleChapter]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "pulpitflow_verse_highlights_v1",
        JSON.stringify(highlightedVerses)
      );
    } catch {}
  }, [highlightedVerses]);

  useEffect(() => {
    try {
      localStorage.setItem(
        BOOKMARKS_STORAGE_KEY,
        JSON.stringify(bookmarkedVerses)
      );
    } catch {}
  }, [bookmarkedVerses]);

  const toggleVerseBookmark = (
    book: string,
    chapter: number,
    verse: number,
    text: string,
    version: string = bibleVersion
  ) => {
    const id = `${book}-${chapter}-${verse}`;
    const exists = bookmarkedVerses.some((b) => b.id === id);
    if (exists) {
      setBookmarkedVerses((prev) => prev.filter((b) => b.id !== id));
      showToast(`Removed bookmark for ${book} ${chapter}:${verse}`);
    } else {
      const newEntry: BookmarkedVerse = {
        id,
        book,
        chapter,
        verse,
        version,
        text,
        note: "",
        createdAt: new Date().toISOString().split("T")[0],
      };
      setBookmarkedVerses((prev) => [newEntry, ...prev]);
      showToast(`Bookmarked ${book} ${chapter}:${verse}`);
    }
  };

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

  // Sync baseline scholarly commentaries whenever the active Scripture passage or verse range changes
  useEffect(() => {
    const localExcerpts = buildScholarlyCommentariesForPassage({
      book: bibleBook,
      chapter: bibleChapter,
      verseStart: verseStartFilter,
      verseEnd: verseEndFilter,
      verses: passageVerses,
    });
    setPassageCommentaries(localExcerpts);
  }, [
    bibleBook,
    bibleChapter,
    verseStartFilter,
    verseEndFilter,
    passageVerses,
  ]);

  const fetchScholarlyCommentaries = async () => {
    const passageRef =
      verseStartFilter !== null
        ? `${bibleBook} ${bibleChapter}:${verseStartFilter}${
            verseEndFilter && verseEndFilter > verseStartFilter
              ? `-${verseEndFilter}`
              : ""
          }`
        : `${bibleBook} ${bibleChapter}`;

    setIsLoadingCommentaries(true);
    try {
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
      const versesText = (target.length > 0 ? target : passageVerses)
        .slice(0, 18)
        .map((v) => `(${v.v}) ${v.text}`)
        .join(" ");

      const res = await fetch("/api/gemini/commentaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage: passageRef,
          version: bibleVersion,
          versesText,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to fetch commentaries");

      if (Array.isArray(data.commentaries) && data.commentaries.length > 0) {
        const mapped: CommentaryExcerpt[] = data.commentaries.map(
          (item: any, idx: number) => ({
            id: `ai-comm-${passageRef}-${Date.now()}-${idx}`,
            lens: item.lens || "Exegetical & Lexical",
            scholarOrTradition:
              item.scholarOrTradition || "Scholarly Commentary",
            verseFocus: item.verseFocus || passageRef,
            thesis: item.thesis || `Exegetical Insight on ${passageRef}`,
            excerpt: item.excerpt || "",
            lexicalOrContextNote: item.lexicalOrContextNote || "",
          })
        );
        setPassageCommentaries(mapped);
        showToast(`Loaded scholarly commentary excerpts for ${passageRef}`);
      }
    } catch {
      const fallback = buildScholarlyCommentariesForPassage({
        book: bibleBook,
        chapter: bibleChapter,
        verseStart: verseStartFilter,
        verseEnd: verseEndFilter,
        verses: passageVerses,
      });
      setPassageCommentaries(fallback);
      showToast(`Displayed scholarly commentary insights for ${passageRef}`);
    } finally {
      setIsLoadingCommentaries(false);
    }
  };

  const saveCommentaryToScratchpad = (item: CommentaryExcerpt) => {
    const entryBlock = `[Commentary · ${item.lens} — ${item.verseFocus}]\n${item.thesis} (${item.scholarOrTradition})\n"${item.excerpt}"\nNote: ${item.lexicalOrContextNote}`;
    const existing = (currentSermon.scratchpad || "").trim();
    const updated = existing ? `${existing}\n\n${entryBlock}` : entryBlock;
    updateCurrentSermon({ scratchpad: updated });
    setSavedCommentaryIds((prev) => ({ ...prev, [item.id]: true }));
    showToast(`Saved "${item.thesis}" to Exegesis Scratchpad`);
  };

  const saveAllCommentariesToScratchpad = () => {
    if (passageCommentaries.length === 0) return;
    const combinedBlock = passageCommentaries
      .map(
        (item) =>
          `[Commentary · ${item.lens} — ${item.verseFocus}]\n${item.thesis} (${item.scholarOrTradition})\n"${item.excerpt}"\nNote: ${item.lexicalOrContextNote}`
      )
      .join("\n\n");
    const existing = (currentSermon.scratchpad || "").trim();
    const updated = existing
      ? `${existing}\n\n${combinedBlock}`
      : combinedBlock;
    updateCurrentSermon({ scratchpad: updated });
    const nextSaved: Record<string, boolean> = { ...savedCommentaryIds };
    passageCommentaries.forEach((c) => {
      nextSaved[c.id] = true;
    });
    setSavedCommentaryIds(nextSaved);
    showToast(
      `Saved all ${passageCommentaries.length} commentary excerpts to Exegesis Scratchpad`
    );
  };

  // Get or build granular verse-specific commentary note for a single verse
  const getVerseCommentaryNote = (
    book: string,
    chapter: number,
    verse: number,
    verseText: string
  ): VerseCommentaryNote => {
    const cacheKey = `${book} ${chapter}:${verse}`;
    if (verseCommentaryCache[cacheKey]) {
      return verseCommentaryCache[cacheKey];
    }
    return buildVerseSpecificCommentary({
      book,
      chapter,
      verse,
      verseText,
      surroundingVerses: passageVerses,
    });
  };

  // Fetch AI-enriched granular single-verse commentary from Gemini
  const fetchSingleVerseCommentary = async (
    book: string,
    chapter: number,
    verse: number,
    verseText: string
  ) => {
    const cacheKey = `${book} ${chapter}:${verse}`;
    setLoadingVerseCommentaryKey(cacheKey);
    try {
      const surroundingContext = passageVerses
        .filter((v) => Math.abs(v.v - verse) <= 3)
        .map((v) => `(${v.v}) ${v.text}`)
        .join(" ");

      const res = await fetch("/api/gemini/verse-commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book,
          chapter,
          verse,
          version: bibleVersion,
          verseText,
          surroundingContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed verse commentary");

      const enriched: VerseCommentaryNote = {
        reference: cacheKey,
        book,
        chapter,
        verse,
        headline:
          data.headline || `Granular Exegetical Focus on ${cacheKey}`,
        exegeticalNote:
          data.exegeticalNote ||
          buildVerseSpecificCommentary({
            book,
            chapter,
            verse,
            verseText,
            surroundingVerses: passageVerses,
          }).exegeticalNote,
        keyTerm:
          data.keyTerm ||
          buildVerseSpecificCommentary({
            book,
            chapter,
            verse,
            verseText,
            surroundingVerses: passageVerses,
          }).keyTerm,
        crossReferences:
          Array.isArray(data.crossReferences) &&
          data.crossReferences.length > 0
            ? data.crossReferences
            : ["Romans 8:28", "John 15:5"],
        preachingAngle:
          data.preachingAngle ||
          "Drive home the theological assurance of this verse in pastoral application.",
        source: "ai",
      };

      setVerseCommentaryCache((prev) => ({
        ...prev,
        [cacheKey]: enriched,
      }));
      showToast(`Generated granular AI verse exegesis for ${cacheKey}`);
    } catch {
      const fallback = buildVerseSpecificCommentary({
        book,
        chapter,
        verse,
        verseText,
        surroundingVerses: passageVerses,
      });
      setVerseCommentaryCache((prev) => ({
        ...prev,
        [cacheKey]: fallback,
      }));
      showToast(`Loaded scholarly verse commentary for ${cacheKey}`);
    } finally {
      setLoadingVerseCommentaryKey(null);
    }
  };

  const saveVerseCommentaryToScratchpad = (
    note: VerseCommentaryNote,
    verseText: string
  ) => {
    const personalNote = (personalVerseNotes[note.reference] || "").trim();
    const blockLines = [
      `[Verse Exegesis · ${note.reference} (${bibleVersion})]`,
      `"${verseText}"`,
      `Headline: ${note.headline}`,
      `Exegesis: ${note.exegeticalNote}`,
      `Key Term: ${note.keyTerm}`,
      `Preaching Angle: ${note.preachingAngle}`,
      note.crossReferences.length > 0
        ? `Cross-Refs: ${note.crossReferences.join(", ")}`
        : "",
      personalNote ? `Pastor's Verse Note: ${personalNote}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const existing = (currentSermon.scratchpad || "").trim();
    const updated = existing ? `${existing}\n\n${blockLines}` : blockLines;
    updateCurrentSermon({ scratchpad: updated });
    setSavedVerseCommentaryKeys((prev) => ({
      ...prev,
      [note.reference]: true,
    }));
    showToast(`Saved ${note.reference} verse commentary to Exegesis Scratchpad`);
  };

  // Scripture Context Search Handler (Gemini AI + Local Fallback)
  const handleScriptureContextSearch = async (topicOverride?: string) => {
    const query = (
      topicOverride !== undefined ? topicOverride : contextSearchQuery
    ).trim();
    if (!query) {
      showToast("Enter a theme or topic (e.g., 'suffering' or 'grace')");
      return;
    }

    setContextSearchQuery(query);
    setActiveContextTopic(query);
    setIsSearchingContext(true);

    const currentPassage =
      currentSermon.passageTag || `${bibleBook} ${bibleChapter}`;

    try {
      const res = await fetch("/api/gemini/context-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: query,
          currentPassage,
          sermonTitle: currentSermon.title,
          bigIdea: currentSermon.bigIdea,
          version: bibleVersion,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Context search failed");

      if (Array.isArray(data.passages) && data.passages.length > 0) {
        const mapped: ContextSearchPassage[] = data.passages.map(
          (p: any, idx: number) => ({
            id: `ai-ctx-${Date.now()}-${idx}`,
            reference:
              p.reference ||
              `${p.book || "Romans"} ${p.chapter || 8}:${p.verseStart || 1}`,
            book: p.book || "Romans",
            chapter: Number(p.chapter) || 8,
            verseStart: Number(p.verseStart) || 1,
            verseEnd: Number(p.verseEnd) || Number(p.verseStart) || 1,
            quote: p.quote || "",
            thematicConnection: p.thematicConnection || "",
            testamentOrGenre: p.testamentOrGenre || "Scripture Cross-Reference",
          })
        );
        setContextSearchResults(mapped);
        showToast(`Found ${mapped.length} biblical passages for "${query}"`);
      } else {
        const fallback = searchScriptureContextByTopic(query, currentPassage);
        setContextSearchResults(fallback);
        showToast(`Suggested biblical passages for "${query}"`);
      }
    } catch {
      const fallback = searchScriptureContextByTopic(query, currentPassage);
      setContextSearchResults(fallback);
      showToast(`Suggested biblical passages for "${query}"`);
    } finally {
      setIsSearchingContext(false);
    }
  };

  // Link a Suggested Context Passage to the Current Sermon (topicalRefs + Exegesis Scratchpad)
  const linkContextPassageToSermon = (item: ContextSearchPassage) => {
    const existingRefs = currentSermon.topicalRefs || [];
    const alreadyLinked = existingRefs.includes(item.reference);

    const nextRefs = alreadyLinked
      ? existingRefs
      : [...existingRefs, item.reference];

    const scratchEntry = `[Linked Context Passage · Theme: "${activeContextTopic}"]\n${item.reference} — "${item.quote}"\nSermon Connection: ${item.thematicConnection}`;
    const existingScratch = (currentSermon.scratchpad || "").trim();
    const nextScratch = existingScratch.includes(item.reference)
      ? existingScratch
      : existingScratch
      ? `${existingScratch}\n\n${scratchEntry}`
      : scratchEntry;

    updateCurrentSermon({
      topicalRefs: nextRefs,
      scratchpad: nextScratch,
    });

    showToast(
      alreadyLinked
        ? `${item.reference} is linked to your sermon`
        : `Linked ${item.reference} to sermon & saved to Exegesis Scratchpad`
    );
  };

  const bibleReaderScrollRef = useRef<HTMLDivElement | null>(null);
  const isRestoringBibleScrollRef = useRef<boolean>(false);
  const bibleScrollTimerRef = useRef<number | null>(null);
  const flashVerseTimerRef = useRef<number | null>(null);
  const [flashedVerseNum, setFlashedVerseNum] = useState<number | null>(null);
  const bibleChapterScrollPositionsRef = useRef<Record<string, number>>((() => {
    try {
      const saved = localStorage.getItem(BIBLE_SCROLL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}
    return {};
  })());

  const saveCurrentBibleChapterScroll = (
    bookName: string = bibleBook,
    chNum: number = bibleChapter
  ) => {
    if (
      bibleTab !== "reader" ||
      !bibleReaderScrollRef.current ||
      isRestoringBibleScrollRef.current
    ) {
      return;
    }
    const key = `${bookName} ${chNum}`;
    const top = bibleReaderScrollRef.current.scrollTop;
    bibleChapterScrollPositionsRef.current[key] = top;
    try {
      localStorage.setItem(
        BIBLE_SCROLL_STORAGE_KEY,
        JSON.stringify(bibleChapterScrollPositionsRef.current)
      );
    } catch {}
  };

  const restoreBibleChapterScrollPosition = (
    refKey: string,
    smooth: boolean = true
  ) => {
    const savedTop = bibleChapterScrollPositionsRef.current[refKey] ?? 0;
    isRestoringBibleScrollRef.current = true;
    if (bibleScrollTimerRef.current !== null) {
      window.clearTimeout(bibleScrollTimerRef.current);
    }
    window.requestAnimationFrame(() => {
      if (bibleReaderScrollRef.current) {
        bibleReaderScrollRef.current.scrollTo({
          top: savedTop,
          behavior: smooth ? "smooth" : "auto",
        });
      }
      bibleScrollTimerRef.current = window.setTimeout(() => {
        isRestoringBibleScrollRef.current = false;
      }, smooth ? 450 : 80);
    });
  };

  // Restore saved chapter scroll position when returning to the Scripture Reader tab
  useEffect(() => {
    if (bibleTab === "reader") {
      restoreBibleChapterScrollPosition(`${bibleBook} ${bibleChapter}`, true);
    }
  }, [bibleTab]);

  // Right Pane Mode
  const [editorViewMode, setEditorViewMode] = useState<
    "manuscript" | "organizer" | "outline" | "features" | "howto"
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
    useState<boolean>(false);
  const [showSermonSetupDetails, setShowSermonSetupDetails] =
    useState<boolean>(false);

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

  // Manuscript Text-to-Speech (TTS) & Awkward Phrasing Listener State
  const [showTtsPlayer, setShowTtsPlayer] = useState<boolean>(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState<boolean>(false);
  const [isTtsPaused, setIsTtsPaused] = useState<boolean>(false);
  const [isTtsSynthesizing, setIsTtsSynthesizing] = useState<boolean>(false);
  const [ttsVoice, setTtsVoice] = useState<
    "Charon" | "Kore" | "Fenrir" | "Zephyr" | "Puck"
  >("Charon");
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const [ttsActiveSectionIndex, setTtsActiveSectionIndex] = useState<number>(0);
  const [ttsCustomSelectionText, setTtsCustomSelectionText] = useState<
    string | null
  >(null);
  const [ttsPolishingSection, setTtsPolishingSection] =
    useState<boolean>(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<boolean>(false);

  interface TtsManuscriptSection {
    index: number;
    label: string;
    rawHtmlText: string;
    spokenText: string;
    wordCount: number;
    awkwardSentences: string[];
  }

  const parseManuscriptTtsSections = (html: string): TtsManuscriptSection[] => {
    if (typeof document === "undefined") return [];
    const container = document.createElement("div");
    container.innerHTML = html || "";

    const blocks = Array.from(
      container.querySelectorAll("h1, h2, h3, p, blockquote, li")
    );

    const rawBlocks: { tag: string; text: string }[] = [];
    if (blocks.length > 0) {
      blocks.forEach((el) => {
        const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (txt) {
          rawBlocks.push({ tag: el.tagName.toLowerCase(), text: txt });
        }
      });
    } else {
      const fallbackText = (container.textContent || "").trim();
      fallbackText
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((txt) => rawBlocks.push({ tag: "p", text: txt }));
    }

    return rawBlocks
      .map((blk, idx) => {
        const spokenText = blk.text
          .replace(
            /\[(?:SLIDE|PAUSE[^\]]*|RESPONSE|CONGREGATIONAL[^\]]*)\]/gi,
            " "
          )
          .replace(/\s+/g, " ")
          .trim();

        const words = spokenText.split(/\s+/).filter(Boolean);
        const sentences = spokenText
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter(Boolean);

        // Identify sentences that may sound winded or awkward when spoken aloud (>30 words or 4+ commas/semicolons)
        const awkwardSentences = sentences.filter((s) => {
          const wCount = s.split(/\s+/).filter(Boolean).length;
          const clauseCount = (s.match(/[,;—]/g) || []).length;
          return wCount >= 30 || (wCount >= 22 && clauseCount >= 4);
        });

        const tagLabel =
          blk.tag === "h1" || blk.tag === "h2"
            ? "Heading"
            : blk.tag === "blockquote"
            ? "Quote / Illustration"
            : `Paragraph ${idx + 1}`;

        return {
          index: idx,
          label: `${tagLabel}`,
          rawHtmlText: blk.text,
          spokenText,
          wordCount: words.length,
          awkwardSentences,
        };
      })
      .filter((sec) => sec.spokenText.length > 0);
  };

  const manuscriptTtsSections = parseManuscriptTtsSections(
    currentSermon.notes || ""
  );

  const stopTtsPlayback = () => {
    ttsAbortRef.current = true;
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = "";
      ttsAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsTtsPlaying(false);
    setIsTtsPaused(false);
    setIsTtsSynthesizing(false);
  };

  // Stop TTS if user switches sermons
  useEffect(() => {
    stopTtsPlayback();
    setTtsActiveSectionIndex(0);
    setTtsCustomSelectionText(null);
  }, [currentSermonId]);

  const speakWithBrowserFallback = (
    textToSpeak: string,
    onEndedCallback: () => void
  ) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsTtsPlaying(false);
      showToast("Audio playback is not supported in this browser");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = ttsSpeed;
    utterance.pitch = 0.98;
    utterance.onend = () => {
      if (!ttsAbortRef.current) {
        onEndedCallback();
      }
    };
    utterance.onerror = () => {
      setIsTtsPlaying(false);
      setIsTtsPaused(false);
    };
    setIsTtsPlaying(true);
    setIsTtsPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  const playManuscriptSectionAtIndex = async (
    targetIdx: number,
    customSelection: string | null = null
  ) => {
    const sections = parseManuscriptTtsSections(currentSermon.notes || "");
    if (!customSelection && sections.length === 0) {
      showToast("Your manuscript is empty — write or generate notes first");
      return;
    }

    const boundedIdx = Math.max(
      0,
      Math.min(targetIdx, Math.max(0, sections.length - 1))
    );

    // Stop previous audio before starting new section
    ttsAbortRef.current = true;
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = "";
      ttsAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    ttsAbortRef.current = false;
    setShowTtsPlayer(true);
    setTtsActiveSectionIndex(boundedIdx);
    setTtsCustomSelectionText(customSelection);

    const textToRead = customSelection
      ? customSelection
          .replace(
            /\[(?:SLIDE|PAUSE[^\]]*|RESPONSE|CONGREGATIONAL[^\]]*)\]/gi,
            " "
          )
          .replace(/\s+/g, " ")
          .trim()
      : sections[boundedIdx]?.spokenText || "";

    if (!textToRead) {
      setIsTtsPlaying(false);
      return;
    }

    const handleNextWhenFinished = () => {
      if (ttsAbortRef.current) return;
      if (!customSelection && boundedIdx + 1 < sections.length) {
        playManuscriptSectionAtIndex(boundedIdx + 1, null);
      } else {
        setIsTtsPlaying(false);
        setIsTtsPaused(false);
        showToast("Finished reading manuscript aloud");
      }
    };

    setIsTtsSynthesizing(true);
    setIsTtsPlaying(true);
    setIsTtsPaused(false);

    try {
      const res = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToRead,
          voiceName: ttsVoice,
          style:
            "Warm, clear, articulate pastoral speaker delivering a sermon manuscript at a measured preaching cadence so the author can hear phrasing and rhythm",
        }),
      });

      if (ttsAbortRef.current) return;

      if (!res.ok) {
        throw new Error("TTS API fallback");
      }
      const data = await res.json();
      if (ttsAbortRef.current) return;

      if (data?.audioBase64) {
        setIsTtsSynthesizing(false);
        const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audio.playbackRate = ttsSpeed;
        ttsAudioRef.current = audio;

        audio.onended = () => {
          handleNextWhenFinished();
        };
        audio.onerror = () => {
          speakWithBrowserFallback(textToRead, handleNextWhenFinished);
        };

        await audio.play();
      } else {
        setIsTtsSynthesizing(false);
        speakWithBrowserFallback(textToRead, handleNextWhenFinished);
      }
    } catch {
      if (ttsAbortRef.current) return;
      setIsTtsSynthesizing(false);
      speakWithBrowserFallback(textToRead, handleNextWhenFinished);
    }
  };

  const handleToggleTtsPlayPause = () => {
    if (editorViewMode !== "manuscript") {
      setEditorViewMode("manuscript");
    }

    if (isTtsPlaying && !isTtsPaused) {
      // Pause active playback
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.pause();
      }
      setIsTtsPaused(true);
      return;
    }

    if (isTtsPlaying && isTtsPaused) {
      // Resume active playback
      if (ttsAudioRef.current) {
        ttsAudioRef.current.playbackRate = ttsSpeed;
        ttsAudioRef.current.play().catch(() => {});
      } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.resume();
      }
      setIsTtsPaused(false);
      return;
    }

    // Check if the user has highlighted a specific phrase/paragraph in the editor
    let selectedEditorText = "";
    if (typeof window !== "undefined") {
      const sel = window.getSelection();
      if (
        sel &&
        sel.rangeCount > 0 &&
        editorRef.current &&
        editorRef.current.contains(sel.anchorNode)
      ) {
        selectedEditorText = sel.toString().trim();
      }
    }

    if (selectedEditorText.length >= 12) {
      showToast("Reading selected manuscript excerpt aloud...");
      playManuscriptSectionAtIndex(ttsActiveSectionIndex, selectedEditorText);
    } else {
      playManuscriptSectionAtIndex(ttsActiveSectionIndex, null);
    }
  };

  const handlePolishActiveTtsSection = async () => {
    const activeSec = manuscriptTtsSections[ttsActiveSectionIndex];
    if (!activeSec) return;

    setTtsPolishingSection(true);
    try {
      const res = await fetch("/api/gemini/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: activeSec.spokenText,
          passage: currentSermon.passageTag,
        }),
      });
      if (!res.ok) throw new Error("Failed to polish section");
      const data = await res.json();
      const rawReply = String(data?.result || "").trim();

      // Replace the raw text inside the manuscript if found, or append smoothed version
      if (rawReply) {
        const cleanFeedback = rawReply
          .replace(/```html|```/g, "")
          .trim();
        insertHtmlAtCursor(
          `<blockquote class="illustration-box"><strong>Smoothed Spoken Cadence (${activeSec.label}):</strong><br/>${cleanFeedback}</blockquote><p></p>`
        );
        showToast(`Inserted smoothed cadence suggestion for ${activeSec.label}`);
      }
    } catch {
      // Local cadence-splitting fallback: break long clauses into shorter spoken sentences
      const smoothed = activeSec.spokenText
        .replace(/;\s+/g, ". ")
        .replace(/,\s+(and|but|for|yet|so)\s+/gi, ". $1 ");
      if (
        currentSermon.notes &&
        currentSermon.notes.includes(activeSec.rawHtmlText)
      ) {
        const updatedHtml = currentSermon.notes.replace(
          activeSec.rawHtmlText,
          smoothed
        );
        isInternalEditorUpdate.current = false;
        updateCurrentSermon({ notes: updatedHtml });
        showToast(`Smoothed long sentence clauses in ${activeSec.label}`);
      }
    } finally {
      setTtsPolishingSection(false);
    }
  };

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

  // Wrap selected manuscript text (or insert a new block) in a [READ ALOUD] pulpit style block
  const insertReadAloudCueBlock = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    if (
      lastCursorRangeRef.current &&
      (!sel ||
        sel.rangeCount === 0 ||
        !editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer))
    ) {
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(lastCursorRangeRef.current);
      }
    }

    let selectedText = "";
    const activeSel = window.getSelection();
    if (
      activeSel &&
      activeSel.rangeCount > 0 &&
      editorRef.current.contains(activeSel.getRangeAt(0).commonAncestorContainer)
    ) {
      selectedText = activeSel.toString().trim();
    }

    if (selectedText) {
      const safeHtml = selectedText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n+/g, "<br/>");
      document.execCommand(
        "insertHTML",
        false,
        `<blockquote class="read-aloud-block"><span class="cue-badge cue-read-aloud">[READ ALOUD]</span> <span class="read-aloud-body">${safeHtml}</span></blockquote><p></p>`
      );
      showToast("Wrapped selected text in [READ ALOUD] pulpit block");
    } else {
      const defaultReadText =
        displayedVerses.length > 0
          ? `${activeReferenceBadge} — "${displayedVerses[0].text}"`
          : "Read this key statement aloud verbatim with slow, clear emphasis...";
      document.execCommand(
        "insertHTML",
        false,
        `<blockquote class="read-aloud-block"><span class="cue-badge cue-read-aloud">[READ ALOUD]</span> <span class="read-aloud-body">${defaultReadText}</span></blockquote><p></p>`
      );
      showToast(
        "Inserted [READ ALOUD] block (highlight manuscript text first to wrap selection)"
      );
    }

    isInternalEditorUpdate.current = true;
    updateCurrentSermon({ notes: editorRef.current.innerHTML });
    saveEditorSelection();
  };

  // Smoothly scroll to a specific verse in the Bible reader (used for verse jumps & chapter transitions)
  const scrollToVerseElement = (
    vNum: number,
    options?: {
      align?: "start" | "center";
      highlightPulse?: boolean;
    }
  ) => {
    const alignMode = options?.align ?? "center";
    const shouldPulse = options?.highlightPulse ?? vNum > 1;

    isRestoringBibleScrollRef.current = true;
    if (bibleScrollTimerRef.current !== null) {
      window.clearTimeout(bibleScrollTimerRef.current);
    }

    if (shouldPulse) {
      setFlashedVerseNum(vNum);
      if (flashVerseTimerRef.current !== null) {
        window.clearTimeout(flashVerseTimerRef.current);
      }
      flashVerseTimerRef.current = window.setTimeout(() => {
        setFlashedVerseNum(null);
      }, 1300);
    }

    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        const container = bibleReaderScrollRef.current;
        const el = document.getElementById(`bible-verse-row-${vNum}`);

        if (container && el) {
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const relativeTop =
            elRect.top - containerRect.top + container.scrollTop;
          const targetTop =
            alignMode === "start"
              ? Math.max(0, relativeTop - 16)
              : Math.max(
                  0,
                  relativeTop - container.clientHeight / 2 + elRect.height / 2
                );

          container.scrollTo({
            top: targetTop,
            behavior: "smooth",
          });
        } else if (el) {
          el.scrollIntoView({ behavior: "smooth", block: alignMode });
        } else if (container && vNum <= 1) {
          container.scrollTo({ top: 0, behavior: "smooth" });
        }

        bibleScrollTimerRef.current = window.setTimeout(() => {
          isRestoringBibleScrollRef.current = false;
          saveCurrentBibleChapterScroll();
        }, 480);
      });
    }, 65);
  };

  // Persist active Scripture selection and keep currentSermon.passageTag synchronized
  useEffect(() => {
    const newRefTag = formatPassageReference(
      bibleBook,
      bibleChapter,
      verseStartFilter,
      verseEndFilter
    );
    try {
      localStorage.setItem(
        ACTIVE_PASSAGE_STORAGE_KEY,
        JSON.stringify({
          book: bibleBook,
          chapter: bibleChapter,
          version: bibleVersion,
          vStart: verseStartFilter,
          vEnd: verseEndFilter,
        })
      );
    } catch {}

    setSermons((prev) =>
      prev.map((s) =>
        s.id === currentSermonId && s.passageTag !== newRefTag
          ? { ...s, passageTag: newRefTag }
          : s
      )
    );
  }, [
    bibleBook,
    bibleChapter,
    bibleVersion,
    verseStartFilter,
    verseEndFilter,
  ]);

  // Apply a verse or verse range selection
  const applyVerseRangeSelection = (
    startV: number | null,
    endV: number | null,
    versesList: VerseItem[] = passageVerses,
    shouldScrollToVerse: boolean = true
  ) => {
    activeVerseRangeRef.current = { start: startV, end: endV };
    setVerseStartFilter(startV);
    setVerseEndFilter(endV);

    if (startV === null) {
      setSelectedVerses([]);
      setFilterOnlyRange(false);
      scrollToVerseElement(1, { align: "start", highlightPulse: false });
      return;
    }

    const effectiveEnd = endV !== null && endV >= startV ? endV : startV;
    const rangeNums = versesList
      .filter((v) => v.v >= startV && v.v <= effectiveEnd)
      .map((v) => v.v);
    setSelectedVerses(rangeNums);
    if (shouldScrollToVerse) {
      scrollToVerseElement(startV, { align: "center", highlightPulse: true });
    }
  };

  // Load Bible Passage (Chapter + Optional Verse Range)
  const loadBiblePassage = async (
    book: string,
    chapter: number,
    version: string,
    targetVerseStart: number | null = null,
    targetVerseEnd: number | null = null,
    options?: { isInitialMount?: boolean }
  ): Promise<VerseItem[]> => {
    const requestId = ++latestPassageRequestIdRef.current;
    const maxCh = BIBLE_BOOK_CHAPTERS[book] || 150;
    const cleanChapter = Math.min(maxCh, Math.max(1, chapter || 1));

    // Save current Book/Chapter scroll offset before switching away
    if (bibleBook !== book || bibleChapter !== cleanChapter) {
      saveCurrentBibleChapterScroll(bibleBook, bibleChapter);
    }

    const refKey = `${book} ${cleanChapter}`;
    const hasSavedScrollForChapter =
      bibleChapterScrollPositionsRef.current[refKey] !== undefined &&
      bibleChapterScrollPositionsRef.current[refKey] > 0;
    const preferSavedScroll =
      Boolean(options?.isInitialMount) && hasSavedScrollForChapter;

    activeVerseRangeRef.current = {
      start: targetVerseStart,
      end: targetVerseEnd,
    };
    setBibleBook(book);
    setBibleChapter(cleanChapter);
    setBibleVersion(version);
    setSelectedVerses([]);
    setVerseStartFilter(targetVerseStart);
    setVerseEndFilter(targetVerseEnd);

    const performPassageScroll = (
      startVerse: number | null,
      endVerse: number | null,
      versesForChapter: VerseItem[]
    ) => {
      if (startVerse !== null) {
        applyVerseRangeSelection(
          startVerse,
          endVerse ?? startVerse,
          versesForChapter,
          !preferSavedScroll
        );
        if (preferSavedScroll) {
          restoreBibleChapterScrollPosition(refKey, false);
        }
      } else if (hasSavedScrollForChapter) {
        restoreBibleChapterScrollPosition(refKey, !options?.isInitialMount);
      } else {
        scrollToVerseElement(1, { align: "start", highlightPulse: false });
      }
    };

    // Show embedded immediately if available while fetching full chapter
    if (EMBEDDED_BIBLE[refKey]) {
      setPassageVerses(EMBEDDED_BIBLE[refKey]);
      performPassageScroll(
        targetVerseStart,
        targetVerseEnd,
        EMBEDDED_BIBLE[refKey]
      );
    }

    setIsLoadingBible(true);
    try {
      const url = `https://bible-api.com/${encodeURIComponent(
        book
      )}+${cleanChapter}?translation=${version.toLowerCase()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Lookup failed");
      const data = await res.json();

      // Ignore stale response if the user selected another Book/Chapter while fetching
      if (requestId !== latestPassageRequestIdRef.current) {
        return [];
      }

      if (data?.verses?.length > 0) {
        const loaded: VerseItem[] = data.verses.map((v: any) => ({
          v: Number(v.verse),
          text: String(v.text).trim(),
        }));
        setPassageVerses(loaded);
        setIsLoadingBible(false);
        const currentStart = activeVerseRangeRef.current.start;
        const currentEnd = activeVerseRangeRef.current.end;
        performPassageScroll(currentStart, currentEnd, loaded);
        return loaded;
      }
    } catch {
      // Fallback to embedded or synthesized chapter
    }

    if (requestId !== latestPassageRequestIdRef.current) {
      return [];
    }

    setIsLoadingBible(false);
    const currentStart = activeVerseRangeRef.current.start;
    const currentEnd = activeVerseRangeRef.current.end;

    if (EMBEDDED_BIBLE[refKey]) {
      const fallback = EMBEDDED_BIBLE[refKey];
      setPassageVerses(fallback);
      performPassageScroll(currentStart, currentEnd, fallback);
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
      performPassageScroll(currentStart, currentEnd, synthesized);
      return synthesized;
    }
  };

  // Load initial/persisted passage on mount (never overwrite with hardcoded Romans 8:1-17)
  useEffect(() => {
    loadBiblePassage(
      initialPassageConfig.book,
      initialPassageConfig.chapter,
      initialPassageConfig.version,
      initialPassageConfig.vStart,
      initialPassageConfig.vEnd,
      { isInitialMount: true }
    );
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
      className={`h-full bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden select-none transition-colors duration-200 ${
        darkMode ? "dark-theme" : ""
      }`}
      onClick={() => {
        setShowSermonMenu(false);
        setShowQuickJumpMenu(false);
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

          <span className="hidden lg:inline text-xs text-slate-400 whitespace-nowrap">
            {saveStatus}
          </span>
        </div>

        {/* Center: Uncrowded Tablet & Desktop Split Orientation + Ratio Controls */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 shrink-0">
          {/* 1-Tap Orientation Switcher (Side-by-Side vs Stacked Top/Bottom — ideal for Tablets) */}
          <button
            type="button"
            onClick={() =>
              setWorkspaceSplitDirection((prev) =>
                prev === "side-by-side" ? "top-bottom" : "side-by-side"
              )
            }
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 text-slate-800 border border-slate-200/80 shadow-2xs flex items-center gap-1.5 whitespace-nowrap transition-colors mr-0.5"
            title={
              workspaceSplitDirection === "side-by-side"
                ? "Switch to Top & Bottom Stacked Split (Great for Portrait Tablets)"
                : "Switch to Side-by-Side Left/Right Split (Great for Landscape Tablets)"
            }
          >
            <Columns
              className={`w-3.5 h-3.5 text-amber-800 transition-transform ${
                workspaceSplitDirection === "top-bottom" ? "rotate-90" : ""
              }`}
            />
            <span className="font-semibold text-amber-950">
              {workspaceSplitDirection === "top-bottom"
                ? "Top / Bottom"
                : "Side-by-Side"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBibleSplitPercent(65);
              setMobileSplitMode("65-35");
              setMobileBiblePercent(65);
            }}
            className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
              (isStackedSplit
                ? mobileSplitMode === "65-35"
                : bibleSplitPercent === 65)
                ? "bg-white shadow-xs text-amber-900 font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="65% Scripture / 35% Sermon Notes"
          >
            <span>65/35</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBibleSplitPercent(50);
              setMobileSplitMode("50-50");
              setMobileBiblePercent(50);
            }}
            className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
              (isStackedSplit
                ? mobileSplitMode === "50-50"
                : bibleSplitPercent === 50)
                ? "bg-white shadow-xs text-amber-900 font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Equal 50/50 Split"
          >
            <span>50/50</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBibleSplitPercent(35);
              setMobileSplitMode("35-65");
              setMobileBiblePercent(35);
            }}
            className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
              (isStackedSplit
                ? mobileSplitMode === "35-65"
                : bibleSplitPercent === 35)
                ? "bg-white shadow-xs text-amber-900 font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="35% Scripture / 65% Sermon Notes"
          >
            <span>35/65</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isStackedSplit) {
                setMobileSplitMode((prev) =>
                  prev === "bible-only" ? "50-50" : "bible-only"
                );
              } else {
                setBibleSplitPercent((prev) => (prev === 100 ? 50 : 100));
              }
            }}
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap ${
              (isStackedSplit
                ? mobileSplitMode === "bible-only"
                : bibleSplitPercent === 100)
                ? "bg-amber-800 text-white shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Maximize Scripture Reader to 100%"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Full</span>
            <span>Bible</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isStackedSplit) {
                setMobileSplitMode((prev) =>
                  prev === "notes-only" ? "50-50" : "notes-only"
                );
              } else {
                setBibleSplitPercent((prev) => (prev === 0 ? 50 : 0));
              }
            }}
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap ${
              (isStackedSplit
                ? mobileSplitMode === "notes-only"
                : bibleSplitPercent === 0)
                ? "bg-amber-800 text-white shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Maximize Sermon Notes & Outline to 100%"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Full</span>
            <span>Notes</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Scripture Reader Font Size Control in Top Toolbar */}
          <div
            className="flex items-center bg-white rounded-lg border border-slate-200/90 p-0.5 shadow-2xs"
            title="Adjust Scripture Reader Font Size"
          >
            <button
              type="button"
              onClick={decreaseBibleFontSize}
              disabled={bibleFontSize <= 14}
              aria-label="Decrease Scripture font size"
              title="Decrease Scripture text size (A-)"
              className="px-1.5 py-0.5 rounded text-[11px] font-serif font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 disabled:opacity-35 transition-colors"
            >
              A&minus;
            </button>
            <button
              type="button"
              onClick={resetBibleFontSize}
              title="Current Scripture text size (Tap to reset to 18px)"
              className="px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-900 hover:bg-amber-50 rounded transition-colors"
            >
              {bibleFontSize}px
            </button>
            <button
              type="button"
              onClick={increaseBibleFontSize}
              disabled={bibleFontSize >= 28}
              aria-label="Increase Scripture font size"
              title="Increase Scripture text size (A+)"
              className="px-1.5 py-0.5 rounded text-xs font-serif font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 disabled:opacity-35 transition-colors"
            >
              A+
            </button>
          </div>
        </div>

        {/* Right: Primary Workspace Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Top/Bottom Split Screen Mode Selector */}
          <div className="md:hidden relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setShowMobileSplitMenu((v) => !v);
                setShowQuickJumpMenu(false);
                setShowExportMenu(false);
                setShowSermonMenu(false);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 flex items-center gap-1.5 whitespace-nowrap shadow-2xs transition-colors"
              title="Mobile Top/Bottom Split Screen View Options"
            >
              <Columns className="w-3.5 h-3.5 text-amber-800 rotate-90" />
              <span>
                {mobileSplitMode === "bible-only"
                  ? "Full Bible"
                  : mobileSplitMode === "notes-only"
                  ? "Full Notes"
                  : mobileSplitMode === "65-35"
                  ? "Top 65%"
                  : mobileSplitMode === "35-65"
                  ? "Bottom 65%"
                  : "Split 50/50"}
              </span>
              <ChevronDown className="w-3 h-3 text-amber-800" />
            </button>

            {showMobileSplitMenu && (
              <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-sans">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Mobile Split Screen Layout
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileSplitMode("50-50");
                    setMobileBiblePercent(50);
                    setShowMobileSplitMenu(false);
                    showToast("Mobile view: Equal 50/50 Top & Bottom Split");
                  }}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-amber-50 ${
                    mobileSplitMode === "50-50"
                      ? "bg-amber-50/90 font-bold text-amber-950"
                      : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] px-1 rounded bg-slate-100 text-slate-700 font-bold">50/50</span>
                    <span>Equal Split (Top &amp; Bottom)</span>
                  </div>
                  {mobileSplitMode === "50-50" && <Check className="w-3.5 h-3.5 text-amber-800" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileSplitMode("65-35");
                    setMobileBiblePercent(65);
                    setShowMobileSplitMenu(false);
                    showToast("Mobile view: Top Focus (65% Scripture / 35% Notes)");
                  }}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-amber-50 ${
                    mobileSplitMode === "65-35"
                      ? "bg-amber-50/90 font-bold text-amber-950"
                      : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] px-1 rounded bg-amber-100 text-amber-900 font-bold">65/35</span>
                    <span>Top Focus (Scripture Reading)</span>
                  </div>
                  {mobileSplitMode === "65-35" && <Check className="w-3.5 h-3.5 text-amber-800" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileSplitMode("35-65");
                    setMobileBiblePercent(35);
                    setShowMobileSplitMenu(false);
                    showToast("Mobile view: Bottom Focus (35% Scripture / 65% Notes)");
                  }}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-amber-50 ${
                    mobileSplitMode === "35-65"
                      ? "bg-amber-50/90 font-bold text-amber-950"
                      : "text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] px-1 rounded bg-amber-100 text-amber-900 font-bold">35/65</span>
                    <span>Bottom Focus (Sermon Writing)</span>
                  </div>
                  {mobileSplitMode === "35-65" && <Check className="w-3.5 h-3.5 text-amber-800" />}
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setMobileSplitMode("bible-only");
                    setShowMobileSplitMenu(false);
                    showToast("Mobile view: Full Screen Scripture Reader");
                  }}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-amber-50 ${
                    mobileSplitMode === "bible-only"
                      ? "bg-amber-50/90 font-bold text-amber-950"
                      : "text-slate-700"
                  }`}
                >
                  <span>Full Screen Scripture (100% Top)</span>
                  {mobileSplitMode === "bible-only" && <Check className="w-3.5 h-3.5 text-amber-800" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileSplitMode("notes-only");
                    setShowMobileSplitMenu(false);
                    showToast("Mobile view: Full Screen Sermon Notes");
                  }}
                  className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-amber-50 ${
                    mobileSplitMode === "notes-only"
                      ? "bg-amber-50/90 font-bold text-amber-950"
                      : "text-slate-700"
                  }`}
                >
                  <span>Full Screen Notes (100% Bottom)</span>
                  {mobileSplitMode === "notes-only" && <Check className="w-3.5 h-3.5 text-amber-800" />}
                </button>
              </div>
            )}
          </div>

          {/* Quick Jump Workflow Dropdown Menu */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setShowQuickJumpMenu((v) => !v);
                setShowSermonMenu(false);
                setShowExportMenu(false);
              }}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                showQuickJumpMenu
                  ? "bg-amber-100 border-amber-300 text-amber-950 font-semibold"
                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
              }`}
              title="Quick Jump between Manuscript, Notes Organizer, Outline, Features, Guide, and Preach Mode"
            >
              <Layers className="w-3.5 h-3.5 text-amber-800" />
              <span>Quick Jump</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showQuickJumpMenu && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Workflow Quick Jump
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditorViewMode("manuscript");
                    setShowPreachModal(false);
                    setShowQuickJumpMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 hover:bg-amber-50/70 flex items-start justify-between gap-2 transition-colors ${
                    editorViewMode === "manuscript" && !showPreachModal
                      ? "bg-amber-50/90 text-amber-950 font-semibold"
                      : "text-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <FileText className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Manuscript
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Draft sermon text, cues &amp; TTS read-aloud
                      </div>
                    </div>
                  </div>
                  {editorViewMode === "manuscript" && !showPreachModal && (
                    <Check className="w-3.5 h-3.5 text-amber-800 shrink-0 mt-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditorViewMode("organizer");
                    setShowPreachModal(false);
                    setShowQuickJumpMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 hover:bg-amber-50/70 flex items-start justify-between gap-2 transition-colors ${
                    editorViewMode === "organizer" && !showPreachModal
                      ? "bg-amber-50/90 text-amber-950 font-semibold"
                      : "text-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Layers className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Notes Organizer
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        AI-powered logical sermon note structuring
                      </div>
                    </div>
                  </div>
                  {editorViewMode === "organizer" && !showPreachModal && (
                    <Check className="w-3.5 h-3.5 text-amber-800 shrink-0 mt-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPreachModal(true);
                    setShowQuickJumpMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 hover:bg-amber-50/70 flex items-start justify-between gap-2 transition-colors border-t border-slate-100 ${
                    showPreachModal
                      ? "bg-amber-50/90 text-amber-950 font-semibold"
                      : "text-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Play className="w-4 h-4 text-amber-800 fill-current shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-amber-950">
                        Preach Mode
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        Full-screen pulpit teleprompter &amp; live timer
                      </div>
                    </div>
                  </div>
                  {showPreachModal && (
                    <Check className="w-3.5 h-3.5 text-amber-800 shrink-0 mt-0.5" />
                  )}
                </button>

                <div className="border-t border-slate-100 mt-1 pt-1 px-2 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditorViewMode("outline");
                      setShowPreachModal(false);
                      setShowQuickJumpMenu(false);
                    }}
                    className="flex-1 text-center py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    Outline View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorViewMode("features");
                      setShowPreachModal(false);
                      setShowQuickJumpMenu(false);
                    }}
                    className="flex-1 text-center py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    Features
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorViewMode("howto");
                      setShowPreachModal(false);
                      setShowQuickJumpMenu(false);
                    }}
                    className="flex-1 text-center py-1.5 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  >
                    How To Use
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Standalone Features & How To Use buttons only on ultra-wide desktop (2xl+) so tablet header stays calm */}
          <button
            type="button"
            onClick={() =>
              setEditorViewMode((prev) =>
                prev === "features" ? "manuscript" : "features"
              )
            }
            className={`hidden 2xl:flex px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border items-center gap-1.5 transition-colors whitespace-nowrap ${
              editorViewMode === "features"
                ? "bg-amber-100 border-amber-300 text-amber-950 font-semibold"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            title="Explore All PulpitFlow Features"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-800" />
            <span>Features</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setEditorViewMode((prev) =>
                prev === "howto" ? "manuscript" : "howto"
              )
            }
            className={`hidden 2xl:flex px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border items-center gap-1.5 transition-colors whitespace-nowrap ${
              editorViewMode === "howto"
                ? "bg-amber-100 border-amber-300 text-amber-950 font-semibold"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            title="How To Use PulpitFlow"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-800" />
            <span>How To Use</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPreachModal(true)}
            className="bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs sm:text-sm px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Preach Mode</span>
          </button>

          {/* Dark / Light Background Toggle */}
          <button
            type="button"
            onClick={() => {
              setDarkMode((prev) => {
                const next = !prev;
                showToast(
                  next
                    ? "Switched to Dark Background"
                    : "Switched to Light Background"
                );
                return next;
              });
            }}
            aria-label={
              darkMode
                ? "Switch to Light Background"
                : "Switch to Dark Background"
            }
            title={
              darkMode
                ? "Switch to Light Background"
                : "Switch to Dark Background"
            }
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              darkMode
                ? "border-amber-500/40 bg-slate-800 text-amber-300 hover:bg-slate-700"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            {darkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden lg:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-600" />
                <span className="hidden lg:inline">Dark</span>
              </>
            )}
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

      {/* MAIN SPLIT WORKSPACE (Adaptive for Tablet/Desktop Side-by-Side or Top/Bottom Split) */}
      <main
        ref={mainContainerRef}
        className={`flex-1 min-h-0 flex ${
          isStackedSplit ? "flex-col" : "flex-row"
        } overflow-hidden relative`}
      >
        {/* ======================================================== */}
        {/* TOP PANE (STACKED) / LEFT PANE (SIDE-BY-SIDE): SCRIPTURE  */}
        {/* ======================================================== */}
        <section
          style={{
            width: !isStackedSplit ? `${bibleSplitPercent}%` : "100%",
            height: isStackedSplit
              ? mobileSplitMode === "notes-only"
                ? 0
                : mobileSplitMode === "bible-only"
                ? "100%"
                : `calc(${mobileBiblePercent}% - 14px)`
              : "100%",
          }}
          className={`${
            !isStackedSplit && bibleSplitPercent === 0
              ? "hidden"
              : isStackedSplit && mobileSplitMode === "notes-only"
              ? "hidden"
              : "flex"
          } min-h-0 flex-col bg-[#fcfaf7] ${
            isStackedSplit ? "border-b" : "border-r"
          } border-slate-200 overflow-hidden relative`}
        >
          {/* Bible Controls Header (Calm, Uncrowded Single-Row Navigation for Tablet & Desktop) */}
          <div className="px-3 py-2 bg-white border-b border-slate-200 flex flex-col gap-2 flex-none relative">
            {/* Unified Primary Scripture Navigation Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {/* Interactive Passage Picker Pill (Opens 3-Step Book / Chapter / Verse Grid) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGridPickerTab("chapter");
                    setShowGridPicker((v) => !v);
                  }}
                  className={`px-3 py-1.5 rounded-xl border font-serif font-bold text-xs sm:text-sm flex items-center gap-1.5 truncate shadow-2xs transition-colors ${
                    showGridPicker
                      ? "bg-amber-800 text-white border-amber-800"
                      : "bg-amber-50/90 hover:bg-amber-100/90 text-amber-950 border-amber-200"
                  }`}
                  title="Tap to pick Book, Chapter, or Verse Range"
                >
                  <BookOpen
                    className={`w-3.5 h-3.5 shrink-0 ${
                      showGridPicker ? "text-amber-200" : "text-amber-800"
                    }`}
                  />
                  <span className="truncate">{activeReferenceBadge}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 ${
                      showGridPicker ? "text-amber-200" : "text-amber-700"
                    }`}
                  />
                </button>

                {/* Prev / Next Chapter Buttons */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 shrink-0">
                  <button
                    type="button"
                    disabled={bibleChapter <= 1}
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
                    className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded-md hover:bg-white transition-colors"
                    title="Previous chapter"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={bibleChapter >= totalChaptersForBook}
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
                    className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 rounded-md hover:bg-white transition-colors"
                    title="Next chapter"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Compact Translation Selector */}
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
                  aria-label="Bible Translation Version"
                  className="text-xs font-semibold bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700 shrink-0"
                >
                  <option value="WEB">WEB</option>
                  <option value="KJV">KJV</option>
                  <option value="ASV">ASV</option>
                  <option value="BBE">BBE</option>
                </select>
              </div>

              {/* Right-Side Scripture Bar Actions (Includes Font Size Control + Search + Selects + Sync) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Scripture Reader Font Size Control (A- / Size / A+) */}
                <div
                  className="inline-flex items-center bg-slate-100 rounded-lg border border-slate-200 p-0.5"
                  title="Adjust Scripture Reader Font Size"
                >
                  <button
                    type="button"
                    onClick={decreaseBibleFontSize}
                    disabled={bibleFontSize <= 14}
                    aria-label="Decrease Scripture font size"
                    title="Decrease Scripture text size (A-)"
                    className="px-2 py-1 rounded-md text-xs font-serif font-bold text-slate-700 hover:bg-white hover:text-amber-950 disabled:opacity-35 transition-colors"
                  >
                    A&minus;
                  </button>
                  <button
                    type="button"
                    onClick={resetBibleFontSize}
                    title="Current Scripture text size (Tap to reset to 18px)"
                    className="px-1.5 py-1 text-[11px] font-mono font-semibold text-amber-950 hover:bg-white rounded-md transition-colors"
                  >
                    {bibleFontSize}
                  </button>
                  <button
                    type="button"
                    onClick={increaseBibleFontSize}
                    disabled={bibleFontSize >= 28}
                    aria-label="Increase Scripture font size"
                    title="Increase Scripture text size (A+)"
                    className="px-2 py-1 rounded-md text-xs font-serif font-bold text-slate-700 hover:bg-white hover:text-amber-950 disabled:opacity-35 transition-colors"
                  >
                    A+
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMobileQuickJumps((v) => !v)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    showMobileQuickJumps
                      ? "bg-amber-100 border-amber-300 text-amber-950 font-semibold"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                  title="Toggle Quick Passages & Reference Search"
                >
                  <Search className="w-3.5 h-3.5 text-amber-800" />
                  <span className="hidden sm:inline">Search</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClassicBibleDropdowns((v) => !v)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border flex items-center gap-1 transition-colors whitespace-nowrap ${
                    showClassicBibleDropdowns
                      ? "bg-amber-100 border-amber-300 text-amber-950 font-semibold"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                  title="Toggle Book, Chapter & Verse Range Dropdown Selectors"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden lg:inline">Selects</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    syncSermonToChosenScripture({ runAiEnrichment: false })
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors whitespace-nowrap"
                  title={`Use ${activeReferenceBadge} for Sermon`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Sync Sermon</span>
                </button>
              </div>
            </div>

            {/* Collapsible Classic Book, Chapter & Verse Range Dropdowns (Toggled on demand so Tablet stays uncrowded) */}
            {showClassicBibleDropdowns && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                {/* Book Selector */}
                <div className="flex-1 min-w-[130px]">
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
                <div className="w-22">
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
                <div className="w-24">
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
              </div>
            )}

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

            {/* Collapsible Quick Jump References & Free-form Reference Search */}
            {showMobileQuickJumps && (
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 flex-wrap">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
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
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 w-48 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700 select-text"
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
            )}

            {/* Bible Sub-Tabs & Active Verse Selection Actions (Clean, Tablet-Friendly Labels) */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 flex-wrap gap-2">
              <div className="flex items-center gap-3 sm:gap-4 text-xs font-medium overflow-x-auto no-scrollbar scroll-smooth">
                <button
                  type="button"
                  onClick={() => setBibleTab("reader")}
                  className={`pb-1 transition-colors whitespace-nowrap ${
                    bibleTab === "reader"
                      ? "text-amber-900 font-semibold border-b-2 border-amber-800"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Reader
                </button>
                <button
                  type="button"
                  onClick={() => setBibleTab("bookmarks")}
                  className={`pb-1 transition-colors whitespace-nowrap flex items-center gap-1 ${
                    bibleTab === "bookmarks"
                      ? "text-amber-900 font-semibold border-b-2 border-amber-800"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Bookmarks</span>
                  <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-amber-100/80 text-amber-900">
                    {bookmarkedVerses.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBibleTab("commentaries")}
                  className={`pb-1 transition-colors whitespace-nowrap flex items-center gap-1 ${
                    bibleTab === "commentaries"
                      ? "text-amber-900 font-semibold border-b-2 border-amber-800"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Commentaries</span>
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
                  Themes &amp; Refs
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
                  Exegesis
                </button>
              </div>

              {(verseStartFilter !== null || selectedVerses.length > 0) && (
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
                        {filterOnlyRange ? "Isolating Range" : "Isolate"}
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
                      onClick={() => {
                        let addedCount = 0;
                        setBookmarkedVerses((prev) => {
                          const existingIds = new Set(prev.map((b) => b.id));
                          const additions: BookmarkedVerse[] = [];
                          selectedVerses.forEach((vNum) => {
                            const id = `${bibleBook}-${bibleChapter}-${vNum}`;
                            const found = passageVerses.find((v) => v.v === vNum);
                            if (!existingIds.has(id) && found) {
                              addedCount++;
                              additions.push({
                                id,
                                book: bibleBook,
                                chapter: bibleChapter,
                                verse: vNum,
                                version: bibleVersion,
                                text: found.text,
                                note: "",
                                createdAt: new Date().toISOString().split("T")[0],
                              });
                            }
                          });
                          return [...additions, ...prev];
                        });
                        showToast(
                          addedCount > 0
                            ? `Bookmarked ${addedCount} selected verse(s)`
                            : "Selected verse(s) already bookmarked"
                        );
                      }}
                      className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap"
                      title="Bookmark selected verses"
                    >
                      <Bookmark className="w-3 h-3" />
                      <span>Bookmark ({selectedVerses.length})</span>
                    </button>
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
                </div>
              )}
            </div>
          </div>

          {/* Bible Content Body */}
          <div
            ref={bibleReaderScrollRef}
            onScroll={() => saveCurrentBibleChapterScroll()}
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6"
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
                  <div
                    style={{
                      fontSize: `${bibleFontSize}px`,
                      lineHeight: 1.75,
                    }}
                    className="font-serif text-slate-800 space-y-2 select-text transition-[font-size] duration-150"
                  >
                    {displayedVerses.map((v, vIdx) => {
                      const isSelected = selectedVerses.includes(v.v);
                      const isPopoverOpen = activeVersePopoverNum === v.v;
                      const verseRefKey = `${bibleBook} ${bibleChapter}:${v.v}`;
                      const hasPersonalNote = Boolean(
                        (personalVerseNotes[verseRefKey] || "").trim()
                      );
                      const hlKey = `${bibleBook}-${bibleChapter}-${v.v}`;
                      const isBookmarked = bookmarkedVerses.some(
                        (b) => b.id === hlKey
                      );
                      const hlColor = highlightedVerses[hlKey];
                      const highlightClass =
                        hlColor === "yellow"
                          ? "verse-highlight-yellow"
                          : hlColor === "green"
                          ? "verse-highlight-green"
                          : hlColor === "blue"
                          ? "verse-highlight-blue"
                          : "";

                      const verseNote = isPopoverOpen
                        ? getVerseCommentaryNote(
                            bibleBook,
                            bibleChapter,
                            v.v,
                            v.text
                          )
                        : null;
                      const isLoadingThisVerse =
                        loadingVerseCommentaryKey === verseRefKey;
                      const isSavedToScratchpad = Boolean(
                        savedVerseCommentaryKeys[verseRefKey]
                      );
                      const prevDisplayedVerse =
                        vIdx > 0 ? displayedVerses[vIdx - 1] : null;
                      const nextDisplayedVerse =
                        vIdx < displayedVerses.length - 1
                          ? displayedVerses[vIdx + 1]
                          : null;

                      return (
                        <div
                          id={`bible-verse-row-${v.v}`}
                          key={v.v}
                          className={`group relative py-1.5 px-2.5 rounded-lg transition-all duration-300 ${
                            flashedVerseNum === v.v
                              ? "bg-amber-100/95 ring-2 ring-amber-400 shadow-xs"
                              : isPopoverOpen
                              ? "bg-amber-50/95 ring-1 ring-amber-400/80 shadow-xs"
                              : isSelected
                              ? "bg-amber-100/80 ring-1 ring-amber-300/70"
                              : "hover:bg-amber-100/40"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="flex items-center gap-1 flex-none mt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (e.shiftKey) {
                                    setSelectedVerses((prev) =>
                                      prev.includes(v.v)
                                        ? prev.filter((num) => num !== v.v)
                                        : [...prev, v.v]
                                    );
                                    return;
                                  }
                                  setActiveVersePopoverNum((prev) => {
                                    const next = prev === v.v ? null : v.v;
                                    if (next !== null) {
                                      scrollToVerseElement(next, {
                                        align: "center",
                                        highlightPulse: false,
                                      });
                                    }
                                    return next;
                                  });
                                }}
                                className={`relative ${
                                  bibleFontSize >= 22 ? "text-sm" : "text-xs"
                                } font-mono font-bold px-1.5 py-0.5 rounded select-none transition-all cursor-pointer ${
                                  isPopoverOpen
                                    ? "bg-amber-900 text-white ring-2 ring-amber-400 shadow-xs"
                                    : isSelected
                                    ? "bg-amber-800 text-white"
                                    : "bg-amber-100/80 hover:bg-amber-200 text-amber-900"
                                }`}
                                title={`Click verse ${v.v} for granular verse commentary popover (Shift+Click to multi-select)`}
                                aria-expanded={isPopoverOpen}
                              >
                                {v.v}
                                {hasPersonalNote && (
                                  <span
                                    className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-purple-600 ring-1 ring-white"
                                    title="Has personal verse exegesis note"
                                  />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleVerseBookmark(
                                    bibleBook,
                                    bibleChapter,
                                    v.v,
                                    v.text,
                                    bibleVersion
                                  )
                                }
                                className={`p-1 rounded transition-colors ${
                                  isBookmarked
                                    ? "text-amber-700 bg-amber-100/70 hover:bg-amber-200/70"
                                    : "text-slate-300 opacity-0 group-hover:opacity-100 hover:text-amber-700 hover:bg-amber-50"
                                }`}
                                title={
                                  isBookmarked
                                    ? `Remove bookmark (${bibleBook} ${bibleChapter}:${v.v})`
                                    : `Bookmark ${bibleBook} ${bibleChapter}:${v.v}`
                                }
                                aria-label={
                                  isBookmarked
                                    ? "Remove verse bookmark"
                                    : "Bookmark verse"
                                }
                              >
                                <Bookmark
                                  className="w-3.5 h-3.5"
                                  fill={isBookmarked ? "currentColor" : "none"}
                                />
                              </button>
                            </div>

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
                                  setActiveVersePopoverNum((prev) =>
                                    prev === v.v ? null : v.v
                                  )
                                }
                                className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold whitespace-nowrap ${
                                  isPopoverOpen
                                    ? "bg-amber-900 text-white"
                                    : "text-amber-900 hover:bg-amber-50"
                                }`}
                                title="Open granular verse commentary popover"
                              >
                                <BookOpen className="w-3 h-3" />
                                <span>Exegesis</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleVerseBookmark(
                                    bibleBook,
                                    bibleChapter,
                                    v.v,
                                    v.text,
                                    bibleVersion
                                  )
                                }
                                className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold whitespace-nowrap ${
                                  isBookmarked
                                    ? "text-amber-900 bg-amber-100/80 hover:bg-amber-200/80"
                                    : "text-slate-600 hover:text-amber-900 hover:bg-amber-50"
                                }`}
                                title={
                                  isBookmarked
                                    ? "Remove from Bookmarks"
                                    : "Save to Bookmarks"
                                }
                              >
                                <Bookmark
                                  className="w-3 h-3"
                                  fill={isBookmarked ? "currentColor" : "none"}
                                />
                                <span>{isBookmarked ? "Saved" : "Bookmark"}</span>
                              </button>
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

                          {/* Granular Verse-Specific Commentary Popover */}
                          {isPopoverOpen && verseNote && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="mt-2.5 ml-1 sm:ml-6 bg-white border border-amber-300/90 rounded-xl shadow-lg p-3.5 sm:p-4 font-sans text-slate-800 space-y-3 relative z-20 animate-in fade-in duration-150"
                            >
                              {/* Small top pointer arrow */}
                              <div className=" -top-1.5 left-3 w-3 h-3 bg-white border-t border-l border-amber-300/90 rotate-45 hidden sm:block" />

                              {/* Popover Header */}
                              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-amber-900 text-white font-mono text-xs font-bold">
                                    {verseNote.reference}
                                  </span>
                                  <span
                                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                                      verseNote.source === "ai"
                                        ? "bg-purple-50 text-purple-900 border-purple-200"
                                        : "bg-amber-50 text-amber-900 border-amber-200"
                                    }`}
                                  >
                                    {verseNote.source === "ai"
                                      ? "Gemini Verse Exegesis"
                                      : "Verse Exegesis Note"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={!prevDisplayedVerse}
                                    onClick={() => {
                                      if (prevDisplayedVerse) {
                                        setActiveVersePopoverNum(
                                          prevDisplayedVerse.v
                                        );
                                        scrollToVerseElement(
                                          prevDisplayedVerse.v,
                                          {
                                            align: "center",
                                            highlightPulse: true,
                                          }
                                        );
                                      }
                                    }}
                                    className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-35"
                                    title={
                                      prevDisplayedVerse
                                        ? `Previous verse (v.${prevDisplayedVerse.v})`
                                        : "First displayed verse"
                                    }
                                  >
                                    ← v.{prevDisplayedVerse?.v ?? v.v}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!nextDisplayedVerse}
                                    onClick={() => {
                                      if (nextDisplayedVerse) {
                                        setActiveVersePopoverNum(
                                          nextDisplayedVerse.v
                                        );
                                        scrollToVerseElement(
                                          nextDisplayedVerse.v,
                                          {
                                            align: "center",
                                            highlightPulse: true,
                                          }
                                        );
                                      }
                                    }}
                                    className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded disabled:opacity-35"
                                    title={
                                      nextDisplayedVerse
                                        ? `Next verse (v.${nextDisplayedVerse.v})`
                                        : "Last displayed verse"
                                    }
                                  >
                                    v.{nextDisplayedVerse?.v ?? v.v} →
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      fetchSingleVerseCommentary(
                                        bibleBook,
                                        bibleChapter,
                                        v.v,
                                        v.text
                                      )
                                    }
                                    disabled={isLoadingThisVerse}
                                    className="ml-1 px-2 py-0.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                    title="Generate deeper AI verse-specific commentary for this single verse"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>
                                      {isLoadingThisVerse
                                        ? "Analyzing..."
                                        : "AI Deep Dive"}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setActiveVersePopoverNum(null)
                                    }
                                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                                    title="Close verse commentary popover"
                                    aria-label="Close verse commentary popover"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Headline & Exegetical Note */}
                              <div className="space-y-1.5">
                                <h4 className="font-display text-xs sm:text-sm font-bold text-slate-900">
                                  {verseNote.headline}
                                </h4>
                                <p className="text-xs text-slate-700 leading-relaxed">
                                  {verseNote.exegeticalNote}
                                </p>
                              </div>

                              {/* Key Term / Lexical Nuance */}
                              <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg px-3 py-2 space-y-0.5">
                                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-900 font-bold">
                                  Key Lexical / Grammatical Focus
                                </div>
                                <p className="text-xs text-amber-950 leading-snug">
                                  {verseNote.keyTerm}
                                </p>
                              </div>

                              {/* Pulpit / Preaching Angle */}
                              <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 flex items-start gap-2">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-700 flex-none mt-0.5" />
                                <p className="text-xs text-slate-700 leading-snug">
                                  <span className="font-semibold text-slate-900">
                                    Preaching Angle:{" "}
                                  </span>
                                  {verseNote.preachingAngle}
                                </p>
                              </div>

                              {/* Cross References */}
                              {verseNote.crossReferences.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                                    Cross-Refs:
                                  </span>
                                  {verseNote.crossReferences.map((cr) => (
                                    <button
                                      key={cr}
                                      type="button"
                                      onClick={() => {
                                        const parsed = parseReferenceParts(cr);
                                        if (parsed) {
                                          loadBiblePassage(
                                            parsed.book,
                                            parsed.chapter,
                                            bibleVersion,
                                            parsed.vStart,
                                            parsed.vEnd
                                          );
                                          showToast(`Jumped to ${cr}`);
                                        }
                                      }}
                                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-950 font-mono text-[11px] font-medium transition-colors"
                                      title={`Jump to ${cr} in Scripture Reader`}
                                    >
                                      {cr}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Personal Verse Note Input */}
                              <div className="pt-1">
                                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold mb-1">
                                  Your Exegetical Observation on{" "}
                                  {verseNote.reference}
                                </label>
                                <input
                                  type="text"
                                  value={personalVerseNotes[verseRefKey] || ""}
                                  onChange={(e) =>
                                    setPersonalVerseNotes((prev) => ({
                                      ...prev,
                                      [verseRefKey]: e.target.value,
                                    }))
                                  }
                                  placeholder={`Add a personal note on ${verseNote.reference}...`}
                                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700 select-text"
                                />
                              </div>

                              {/* Popover Footer Actions */}
                              <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      saveVerseCommentaryToScratchpad(
                                        verseNote,
                                        v.text
                                      )
                                    }
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                                      isSavedToScratchpad
                                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                        : "bg-amber-800 hover:bg-amber-900 text-white"
                                    }`}
                                  >
                                    {isSavedToScratchpad ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Saved to Scratchpad</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Save to Scratchpad</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const personal = (
                                        personalVerseNotes[verseRefKey] || ""
                                      ).trim();
                                      insertHtmlAtCursor(
                                        `<blockquote class="scripture-quote"><strong>${
                                          verseNote.reference
                                        } (${bibleVersion}):</strong> "${
                                          v.text
                                        }"<br/><em>Exegetical Note (${
                                          verseNote.headline
                                        }):</em> ${verseNote.exegeticalNote}${
                                          personal
                                            ? `<br/><em>Pastor's Note:</em> ${personal}`
                                            : ""
                                        }</blockquote><p></p>`
                                      );
                                      showToast(
                                        `Inserted ${verseNote.reference} & exegetical note into manuscript`
                                      );
                                    }}
                                    className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100/80 hover:bg-amber-200/80 text-amber-950 border border-amber-200 flex items-center gap-1 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Insert in Manuscript</span>
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedVerses((prev) =>
                                      prev.includes(v.v)
                                        ? prev.filter((num) => num !== v.v)
                                        : [...prev, v.v]
                                    )
                                  }
                                  className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                                    isSelected
                                      ? "bg-amber-100 text-amber-950 border-amber-300"
                                      : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {isSelected
                                    ? "✓ Selected for Batch Quote"
                                    : "Select Verse for Quote"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {bibleTab === "bookmarks" && (
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Bookmark className="w-4 h-4 text-amber-800" />
                        <span>Bookmarked Verses</span>
                        <span className="font-mono text-xs text-slate-500 font-normal">
                          ({bookmarkedVerses.length})
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Quick-reference verses saved in browser storage for
                        sermon study and quotation
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={bookmarkFilterQuery}
                        onChange={(e) => setBookmarkFilterQuery(e.target.value)}
                        placeholder="Filter bookmarks..."
                        className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 w-44 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-700 select-text"
                      />
                      {bookmarkedVerses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setBookmarkedVerses([]);
                            showToast("Cleared all bookmarked verses");
                          }}
                          className="text-xs text-slate-400 hover:text-rose-600 font-medium px-1.5 py-1"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  {bookmarkedVerses.length === 0 ? (
                    <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <Bookmark className="w-6 h-6 text-slate-400 mx-auto" />
                      <div className="text-xs font-semibold text-slate-700">
                        No Bookmarked Verses Yet
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        In the <strong>Scripture Reader</strong> tab, click the
                        bookmark icon next to any verse number to save it here
                        for quick reference.
                      </p>
                      <button
                        type="button"
                        onClick={() => setBibleTab("reader")}
                        className="mt-1 px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold"
                      >
                        Go to Scripture Reader
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookmarkedVerses
                        .filter((bm) => {
                          if (!bookmarkFilterQuery.trim()) return true;
                          const q = bookmarkFilterQuery.toLowerCase();
                          const ref =
                            `${bm.book} ${bm.chapter}:${bm.verse}`.toLowerCase();
                          return (
                            ref.includes(q) ||
                            bm.text.toLowerCase().includes(q) ||
                            (bm.note || "").toLowerCase().includes(q)
                          );
                        })
                        .map((bm) => {
                          const refLabel = `${bm.book} ${bm.chapter}:${bm.verse}`;
                          return (
                            <div
                              key={bm.id}
                              className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-amber-50/40 border border-slate-200/90 transition-colors space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await loadBiblePassage(
                                      bm.book,
                                      bm.chapter,
                                      bm.version || bibleVersion,
                                      bm.verse,
                                      bm.verse
                                    );
                                    setBibleTab("reader");
                                    showToast(`Opened ${refLabel}`);
                                  }}
                                  className="font-bold text-xs sm:text-sm text-amber-950 hover:text-amber-800 flex items-center gap-1.5"
                                  title="Open this verse in Scripture Reader"
                                >
                                  <Bookmark
                                    className="w-3.5 h-3.5 text-amber-700"
                                    fill="currentColor"
                                  />
                                  <span>{refLabel}</span>
                                  <span className="text-[11px] font-mono font-normal text-slate-500">
                                    ({bm.version || "WEB"})
                                  </span>
                                </button>

                                <div className="flex items-center gap-1.5 text-xs">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await loadBiblePassage(
                                        bm.book,
                                        bm.chapter,
                                        bm.version || bibleVersion,
                                        bm.verse,
                                        bm.verse
                                      );
                                      setBibleTab("reader");
                                    }}
                                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium"
                                  >
                                    Open in Reader
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      insertScriptureQuote(
                                        bm.book,
                                        bm.chapter,
                                        bm.verse,
                                        bm.text
                                      )
                                    }
                                    className="px-2 py-0.5 rounded bg-amber-100/80 hover:bg-amber-200/80 text-amber-950 text-[11px] font-semibold flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Quote</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const loaded = await loadBiblePassage(
                                        bm.book,
                                        bm.chapter,
                                        bm.version || bibleVersion,
                                        bm.verse,
                                        bm.verse
                                      );
                                      await syncSermonToChosenScripture({
                                        book: bm.book,
                                        chapter: bm.chapter,
                                        version: bm.version || bibleVersion,
                                        vStart: bm.verse,
                                        vEnd: bm.verse,
                                        versesList: loaded,
                                        runAiEnrichment: false,
                                      });
                                    }}
                                    className="px-2 py-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-semibold"
                                  >
                                    Use for Sermon
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setBookmarkedVerses((prev) =>
                                        prev.filter((item) => item.id !== bm.id)
                                      );
                                      showToast(
                                        `Removed bookmark for ${refLabel}`
                                      );
                                    }}
                                    className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                                    title="Remove bookmark"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="font-serif text-sm text-slate-800 leading-relaxed select-text">
                                &ldquo;{bm.text}&rdquo;
                              </p>

                              <input
                                type="text"
                                value={bm.note || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBookmarkedVerses((prev) =>
                                    prev.map((item) =>
                                      item.id === bm.id
                                        ? { ...item, note: val }
                                        : item
                                    )
                                  );
                                }}
                                placeholder="Add a quick study note or tag for this bookmark..."
                                className="w-full text-xs bg-white border border-slate-200/80 rounded-lg px-2.5 py-1 text-slate-700 focus:outline-none focus:border-amber-700 select-text"
                              />
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {bibleTab === "commentaries" && (
              <div className="space-y-4 max-w-2xl mx-auto">
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4">
                  {/* Commentaries Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-800" />
                        <span>
                          Scholarly Commentaries on {activeReferenceBadge}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Concise grammatical-historical, cultural, and
                        theological insights—save any excerpt directly to your
                        Exegesis Scratchpad
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={fetchScholarlyCommentaries}
                        disabled={isLoadingCommentaries}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        title="Generate fresh passage-specific scholarly commentary excerpts with Gemini"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {isLoadingCommentaries
                            ? "Fetching Insights..."
                            : "AI Refresh Excerpts"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={saveAllCommentariesToScratchpad}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-xs font-semibold transition-colors"
                      >
                        Save All to Scratchpad
                      </button>
                    </div>
                  </div>

                  {/* Lens Filter Bar & Quick Link to Scratchpad */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      {[
                        "All",
                        "Exegetical & Lexical",
                        "Historical-Cultural",
                        "Historical Theology",
                        "Pastoral & Christological",
                      ].map((lens) => (
                        <button
                          key={lens}
                          type="button"
                          onClick={() => setCommentaryLensFilter(lens)}
                          className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                            commentaryLensFilter === lens
                              ? "bg-amber-800 text-white border-amber-800 font-semibold"
                              : "bg-slate-50 hover:bg-amber-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {lens}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setBibleTab("scratchpad")}
                      className="text-xs font-semibold text-amber-800 hover:text-amber-950 hover:underline whitespace-nowrap"
                    >
                      Open Exegesis Scratchpad &rarr;
                    </button>
                  </div>

                  {/* Commentary Excerpt Cards */}
                  {isLoadingCommentaries ? (
                    <div className="py-12 text-center text-slate-500 space-y-2">
                      <div className="w-5 h-5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-medium">
                        Fetching scholarly commentary excerpts for{" "}
                        {activeReferenceBadge}...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {passageCommentaries
                        .filter(
                          (item) =>
                            commentaryLensFilter === "All" ||
                            item.lens === commentaryLensFilter
                        )
                        .map((item) => {
                          const isSaved = !!savedCommentaryIds[item.id];
                          return (
                            <div
                              key={item.id}
                              className="p-4 rounded-xl bg-slate-50/80 hover:bg-amber-50/30 border border-slate-200/90 space-y-2.5 transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-amber-100/90 text-amber-950 border border-amber-200 text-[11px] font-bold">
                                    {item.lens}
                                  </span>
                                  <span className="font-mono text-xs font-bold text-slate-800">
                                    {item.verseFocus}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    · {item.scholarOrTradition}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      saveCommentaryToScratchpad(item)
                                    }
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                                      isSaved
                                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                        : "bg-amber-800 hover:bg-amber-900 text-white"
                                    }`}
                                    title="Save this scholarly insight directly to your Exegesis Scratchpad"
                                  >
                                    {isSaved ? (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Saved to Scratchpad</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Save to Scratchpad</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      insertHtmlAtCursor(
                                        `<blockquote class="illustration-box"><strong>Scholarly Commentary (${item.verseFocus} — ${item.scholarOrTradition}):</strong><br><em>${item.thesis}:</em> ${item.excerpt}</blockquote><p></p>`
                                      );
                                      setEditorViewMode("manuscript");
                                      showToast(
                                        `Inserted commentary on ${item.verseFocus} into manuscript`
                                      );
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium"
                                    title="Insert this commentary excerpt directly into the sermon manuscript"
                                  >
                                    Insert in Manuscript
                                  </button>
                                </div>
                              </div>

                              <h4 className="font-display text-sm font-bold text-slate-900">
                                {item.thesis}
                              </h4>

                              <p className="font-serif text-sm text-slate-800 leading-relaxed select-text">
                                {item.excerpt}
                              </p>

                              {item.lexicalOrContextNote && (
                                <div className="pt-1.5 border-t border-slate-200/70 text-xs text-slate-600 flex items-center gap-1.5">
                                  <span className="font-semibold text-amber-900 shrink-0">
                                    Exegetical Note:
                                  </span>
                                  <span className="italic select-text">
                                    {item.lexicalOrContextNote}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {bibleTab === "themes" && (
              <div className="space-y-4 max-w-2xl mx-auto">
                {/* SCRIPTURE CONTEXT SEARCH CARD (Gemini AI Theme/Topic Search & Sermon Linking) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-700" />
                        <span>Scripture Context Search</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Type any theme or topic (e.g., &ldquo;suffering&rdquo;
                        or &ldquo;grace&rdquo;) to have Gemini suggest and link
                        relevant biblical passages to{" "}
                        <strong>{currentSermon.title || "your sermon"}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Search Input Bar */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={contextSearchQuery}
                        onChange={(e) => setContextSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleScriptureContextSearch();
                          }
                        }}
                        placeholder="Type a theme or topic (e.g., 'suffering', 'grace', 'forgiveness', 'hope')..."
                        className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-700/20 focus:border-purple-700 select-text"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleScriptureContextSearch()}
                      disabled={isSearchingContext}
                      className="px-3.5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {isSearchingContext
                          ? "Searching..."
                          : "Suggest Passages"}
                      </span>
                    </button>
                  </div>

                  {/* Quick Theme Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Try theme:
                    </span>
                    {[
                      "Grace",
                      "Suffering",
                      "Forgiveness",
                      "Assurance",
                      "Hope in Trials",
                      "Prayer & Peace",
                    ].map((themeChip) => (
                      <button
                        key={themeChip}
                        type="button"
                        onClick={() => handleScriptureContextSearch(themeChip)}
                        className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition-colors ${
                          activeContextTopic.toLowerCase() ===
                          themeChip.toLowerCase()
                            ? "bg-purple-100/90 border-purple-300 text-purple-950 font-semibold"
                            : "bg-slate-50 hover:bg-purple-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {themeChip}
                      </button>
                    ))}
                  </div>

                  {/* Currently Linked Sermon Passages Bar */}
                  {(currentSermon.topicalRefs || []).length > 0 && (
                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-amber-950 flex items-center gap-1">
                          <Link2 className="w-3.5 h-3.5 text-amber-800" />
                          <span>Linked to Sermon:</span>
                        </span>
                        {(currentSermon.topicalRefs || []).map((ref, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-white border border-amber-200 text-amber-950 px-2 py-0.5 rounded-md text-[11px] font-semibold"
                          >
                            <button
                              type="button"
                              onClick={() => parseAndLoadReference(ref, false)}
                              className="hover:underline"
                              title="Open this linked passage in the Scripture Reader"
                            >
                              {ref}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = (
                                  currentSermon.topicalRefs || []
                                ).filter((_, i) => i !== idx);
                                updateCurrentSermon({ topicalRefs: next });
                              }}
                              className="text-slate-400 hover:text-rose-600 ml-0.5"
                              title="Unlink passage from sermon"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Passages Results List */}
                  {isSearchingContext ? (
                    <div className="py-8 text-center text-slate-500 space-y-2">
                      <div className="w-5 h-5 border-2 border-purple-700 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-medium">
                        Searching Scripture context for &ldquo;
                        {activeContextTopic}&rdquo;...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          Suggested Passages for &ldquo;{activeContextTopic}
                          &rdquo;
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Click &ldquo;Link to Sermon&rdquo; to attach to{" "}
                          {currentSermon.passageTag}
                        </span>
                      </div>

                      {contextSearchResults.map((item) => {
                        const isLinked = (
                          currentSermon.topicalRefs || []
                        ).includes(item.reference);
                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-xl bg-slate-50/90 hover:bg-amber-50/30 border border-slate-200/90 space-y-2 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await loadBiblePassage(
                                      item.book,
                                      item.chapter,
                                      bibleVersion,
                                      item.verseStart,
                                      item.verseEnd
                                    );
                                    setBibleTab("reader");
                                    showToast(`Opened ${item.reference}`);
                                  }}
                                  className="font-bold text-xs sm:text-sm text-amber-950 hover:text-amber-800 hover:underline"
                                >
                                  {item.reference}
                                </button>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200/70 text-slate-700">
                                  {item.testamentOrGenre}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs">
                                <button
                                  type="button"
                                  onClick={() =>
                                    linkContextPassageToSermon(item)
                                  }
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                                    isLinked
                                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                      : "bg-amber-800 hover:bg-amber-900 text-white"
                                  }`}
                                  title="Link this passage to the current sermon and save to Exegesis Scratchpad"
                                >
                                  {isLinked ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Linked to Sermon</span>
                                    </>
                                  ) : (
                                    <>
                                      <Link2 className="w-3 h-3" />
                                      <span>Link to Sermon</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const vRef =
                                      item.verseEnd &&
                                      item.verseEnd > item.verseStart
                                        ? `${item.verseStart}-${item.verseEnd}`
                                        : `${item.verseStart}`;
                                    insertScriptureQuote(
                                      item.book,
                                      item.chapter,
                                      vRef,
                                      item.quote
                                    );
                                  }}
                                  className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium flex items-center gap-1"
                                  title="Quote this passage in the sermon manuscript"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Quote</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    await loadBiblePassage(
                                      item.book,
                                      item.chapter,
                                      bibleVersion,
                                      item.verseStart,
                                      item.verseEnd
                                    );
                                    setBibleTab("reader");
                                  }}
                                  className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium"
                                >
                                  Open
                                </button>
                              </div>
                            </div>

                            <p className="font-serif text-xs sm:text-sm text-slate-800 italic leading-relaxed select-text">
                              &ldquo;{item.quote}&rdquo;
                            </p>

                            {item.thematicConnection && (
                              <p className="text-xs text-slate-600 leading-relaxed select-text">
                                <strong className="text-slate-800">
                                  Sermon Connection:
                                </strong>{" "}
                                {item.thematicConnection}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Passage Themes & Cross-References Card */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-900 mb-2">
                      Exegetical Themes in {bibleBook} {bibleChapter}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                      {activeThemesData.themes.map((theme, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleScriptureContextSearch(theme)}
                          className="px-2.5 py-1 rounded-md bg-amber-50/90 hover:bg-amber-100 text-amber-950 border border-amber-200/80 font-medium transition-colors"
                          title={`Click to search Scripture context for "${theme}"`}
                        >
                          {theme}
                        </button>
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
              <div className="h-full flex flex-col max-w-2xl mx-auto space-y-3">
                {/* Compact Scripture Context Search Bar inside Exegesis Scratchpad */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <Sparkles className="w-4 h-4 text-purple-700 shrink-0" />
                    <input
                      type="text"
                      value={contextSearchQuery}
                      onChange={(e) => setContextSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setBibleTab("themes");
                          handleScriptureContextSearch();
                        }
                      }}
                      placeholder="Scripture Context Search: type a theme (e.g., 'suffering' or 'grace')..."
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:border-purple-700 select-text"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBibleTab("themes");
                      handleScriptureContextSearch();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Find &amp; Link Passages</span>
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 flex-1 flex flex-col min-h-[340px]">
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

          {/* Floating Pill when in Full Bible mode to restore split screen */}
          {((isStackedSplit && mobileSplitMode === "bible-only") ||
            (!isStackedSplit && bibleSplitPercent === 100)) && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30">
              <button
                type="button"
                onClick={() => {
                  setMobileSplitMode("50-50");
                  setMobileBiblePercent(50);
                  setBibleSplitPercent(50);
                  showToast("Restored 50/50 Split View");
                }}
                className="px-3.5 py-1.5 rounded-full bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold shadow-lg border border-amber-700 flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Open Sermon Notes (50/50 Split)</span>
              </button>
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* INTERACTIVE TOP/BOTTOM SPLIT RESIZER DIVIDER BAR          */}
        {/* ======================================================== */}
        {isStackedSplit &&
          mobileSplitMode !== "bible-only" &&
          mobileSplitMode !== "notes-only" && (
            <div
              onMouseDown={handleDividerMouseDown}
              onTouchStart={handleDividerTouchStart}
              onTouchMove={handleDividerTouchMove}
              onTouchEnd={handleDividerTouchEnd}
              className={`h-7 bg-amber-50/95 border-y border-amber-200/90 flex items-center justify-between px-3 select-none touch-none cursor-row-resize shrink-0 z-20 shadow-2xs transition-colors ${
                isDraggingMobileSplit ? "bg-amber-100 ring-1 ring-amber-400" : ""
              }`}
              title="Drag up or down to adjust Top/Bottom split height"
            >
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileSplitMode("bible-only");
                    showToast("Maximized Scripture Reader");
                  }}
                  className="text-[10px] font-semibold text-amber-900 hover:text-amber-950 bg-white/90 border border-amber-200 rounded px-2 py-0.5 flex items-center gap-0.5 active:bg-amber-100"
                  title="Maximize Scripture to Full Screen"
                >
                  <ArrowUp className="w-2.5 h-2.5" />
                  <span>Full Bible</span>
                </button>
              </div>

              {/* Center Touch Drag Pill Handle */}
              <div className="flex items-center gap-1.5 py-0.5 px-2.5 rounded-full bg-amber-100/70 border border-amber-300/60">
                <div className="w-4 h-1 rounded-full bg-amber-700/50" />
                <span className="text-[10px] font-mono font-bold text-amber-950 tracking-tight">
                  {mobileBiblePercent}% Top · {100 - mobileBiblePercent}% Bottom
                </span>
                <div className="w-4 h-1 rounded-full bg-amber-700/50" />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileSplitMode("50-50");
                    setMobileBiblePercent(50);
                    showToast("Reset to 50/50 Top & Bottom Split");
                  }}
                  className={`text-[10px] font-semibold rounded px-2 py-0.5 border ${
                    mobileBiblePercent === 50 && mobileSplitMode === "50-50"
                      ? "bg-amber-800 text-white border-amber-800"
                      : "bg-white/90 border-amber-200 text-amber-900"
                  }`}
                  title="Reset to 50/50 Split"
                >
                  50/50
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileSplitMode("notes-only");
                    showToast("Maximized Sermon Notes");
                  }}
                  className="text-[10px] font-semibold text-amber-900 hover:text-amber-950 bg-white/90 border border-amber-200 rounded px-2 py-0.5 flex items-center gap-0.5 active:bg-amber-100"
                  title="Maximize Sermon Notes to Full Screen"
                >
                  <span>Full Notes</span>
                  <ArrowDown className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          )}

        {/* ======================================================== */}
        {/* BOTTOM PANE (STACKED) / RIGHT PANE (SIDE-BY-SIDE): STUDIO */}
        {/* ======================================================== */}
        <section
          style={{
            width: !isStackedSplit ? `${100 - bibleSplitPercent}%` : "100%",
            height: isStackedSplit
              ? mobileSplitMode === "bible-only"
                ? 0
                : mobileSplitMode === "notes-only"
                ? "100%"
                : `calc(${100 - mobileBiblePercent}% - 14px)`
              : "100%",
          }}
          className={`${
            !isStackedSplit && bibleSplitPercent === 100
              ? "hidden"
              : isStackedSplit && mobileSplitMode === "bible-only"
              ? "hidden"
              : "flex"
          } flex-1 min-h-0 flex-col bg-white overflow-hidden relative`}
        >
          {/* Floating Pill when in Full Notes mode to restore split screen */}
          {((isStackedSplit && mobileSplitMode === "notes-only") ||
            (!isStackedSplit && bibleSplitPercent === 0)) && (
            <div className="absolute top-2.5 right-3 z-30">
              <button
                type="button"
                onClick={() => {
                  setMobileSplitMode("50-50");
                  setMobileBiblePercent(50);
                  setBibleSplitPercent(50);
                  showToast("Restored 50/50 Split View");
                }}
                className="px-2.5 py-1 rounded-full bg-amber-100/90 text-amber-950 text-[11px] font-semibold shadow-xs border border-amber-300 flex items-center gap-1 hover:bg-amber-200"
              >
                <BookOpen className="w-3 h-3 text-amber-800" />
                <span>Show Bible (Split)</span>
              </button>
            </div>
          )}

          {/* Calm, Uncrowded Sermon Studio Header */}
          <div className="px-3.5 py-2 bg-white border-b border-slate-200 flex-none space-y-2">
            {/* Row 1: Sermon Title + Metadata Drawer Toggles */}
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={currentSermon.title}
                onChange={(e) =>
                  updateCurrentSermon({ title: e.target.value })
                }
                className="flex-1 min-w-[140px] font-display text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-300 border-none p-0 focus:outline-none focus:ring-0 select-text truncate"
                placeholder="Untitled Sermon"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Inline Scripture Passage Tag & Sync on wide screens (also inside Big Idea & Setup drawer) */}
                <div className="hidden xl:flex items-center gap-1 bg-amber-50/80 border border-amber-200/80 rounded-lg px-2 py-1 text-xs shrink-0">
                  <span className="text-[10px] font-semibold text-amber-800 uppercase">
                    Text:
                  </span>
                  <input
                    type="text"
                    value={currentSermon.passageTag}
                    onChange={(e) =>
                      updateCurrentSermon({ passageTag: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        parseAndLoadReference(currentSermon.passageTag, true);
                      }
                    }}
                    placeholder="e.g. Romans 8:1-17"
                    className="w-28 text-xs font-semibold text-amber-950 bg-transparent border-none p-0 focus:outline-none select-text"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      parseAndLoadReference(currentSermon.passageTag, true)
                    }
                    className="px-1.5 py-0.5 rounded bg-amber-800 hover:bg-amber-900 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
                    title="Load this Scripture passage and update Title, Big Idea, Intro Illustration & Manuscript"
                  >
                    <Wand2 className="w-2.5 h-2.5" />
                    <span>Sync</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTitleSuggestions((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    showTitleSuggestions
                      ? "bg-amber-100 border-amber-300 text-amber-950 font-semibold"
                      : "bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-900 border-slate-200"
                  }`}
                  title="Show or hide sermon title suggestions for the chosen Scripture"
                >
                  Title Ideas
                </button>

                <button
                  type="button"
                  onClick={() => setShowSermonSetupDetails((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors ${
                    showSermonSetupDetails
                      ? "bg-amber-100 border-amber-300 text-amber-950 font-semibold"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                  title="Toggle Passage Text, Big Idea, Homiletical Approach, Series & Date settings"
                >
                  <span>Setup &amp; Big Idea</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      showSermonSetupDetails ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Row 2: View Switcher Tabs (Left) + Voice & AI Homiletics Actions (Right, unclipped) */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100">
              {/* Segmented View Switcher with concise Tablet-friendly labels */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium border border-slate-200 shrink-0 overflow-x-auto no-scrollbar max-w-full">
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
                  <span>Organizer</span>
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
                  Outline
                </button>
                <button
                  type="button"
                  onClick={() => setEditorViewMode("features")}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                    editorViewMode === "features"
                      ? "bg-white shadow-xs text-amber-950 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                  <span>Features</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorViewMode("howto")}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                    editorViewMode === "howto"
                      ? "bg-white shadow-xs text-amber-950 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-800" />
                  <span>Guide</span>
                </button>
              </div>

              {/* Primary Voice, TTS Read-Aloud & AI Homiletics Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Manuscript Text-to-Speech (Listen / Pause / Stop) */}
                <div className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50/90 p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={handleToggleTtsPlayPause}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      isTtsPlaying && !isTtsPaused
                        ? "bg-amber-800 text-white"
                        : "text-amber-950 hover:bg-amber-100"
                    }`}
                    title="Listen to your drafted manuscript aloud to check spoken cadence and identify awkward phrasing"
                  >
                    {isTtsPlaying && !isTtsPaused ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-amber-800" />
                    )}
                    <span>
                      {isTtsSynthesizing
                        ? "Loading..."
                        : isTtsPlaying && !isTtsPaused
                        ? "Pause"
                        : isTtsPlaying && isTtsPaused
                        ? "Resume"
                        : "Listen"}
                    </span>
                  </button>
                  {(isTtsPlaying || showTtsPlayer) && (
                    <button
                      type="button"
                      onClick={() => {
                        stopTtsPlayback();
                        setShowTtsPlayer(false);
                      }}
                      className="p-1 rounded hover:bg-amber-200/70 text-amber-900"
                      title="Stop Audio & Close Listener"
                    >
                      <Square className="w-3 h-3 fill-current" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    isDictating ? stopLiveDictation() : startLiveDictation()
                  }
                  className={`px-2.5 py-1 rounded-lg border font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    isDictating
                      ? "bg-rose-50 border-rose-300 text-rose-800"
                      : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-950"
                  }`}
                  title="Voice Dictation into Manuscript"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isDictating ? "Listening..." : "Dictate"}</span>
                </button>

                {/* AI Homiletics Menu (Positioned outside overflow-x-auto so dropdown never clips) */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setShowAiMenu((v) => !v)}
                    disabled={!!aiLoadingTask}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 font-semibold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap"
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

            {/* Clickable Title Suggestions Bar (Collapsible) */}
            {showTitleSuggestions && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
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
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors truncate max-w-[260px] ${
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

            {/* Collapsible Sermon Setup Drawer (Passage Tag, Homiletical Mode, Series/Date & Big Idea) */}
            {showSermonSetupDetails && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Passage Text Input inside Setup Drawer for Tablet convenience */}
                    <div className="flex xl:hidden items-center gap-1 bg-amber-50/80 border border-amber-200/80 rounded-md px-2 py-0.5 text-xs">
                      <span className="text-[10px] font-semibold text-amber-800 uppercase">
                        Text:
                      </span>
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
                        className="w-28 text-xs font-semibold text-amber-950 bg-transparent border-none p-0 focus:outline-none select-text"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          parseAndLoadReference(currentSermon.passageTag, true)
                        }
                        className="px-1.5 py-0.5 rounded bg-amber-800 hover:bg-amber-900 text-white text-[10px] font-semibold flex items-center gap-1"
                      >
                        <Wand2 className="w-2.5 h-2.5" />
                        <span>Sync</span>
                      </button>
                    </div>

                    <span className="text-slate-400 font-medium">Approach:</span>
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
                          className={`px-2 py-0.5 rounded-md transition-colors whitespace-nowrap ${
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
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-slate-300">·</span>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">Series:</span>
                      <input
                        type="text"
                        value={currentSermon.series}
                        onChange={(e) =>
                          updateCurrentSermon({ series: e.target.value })
                        }
                        placeholder="e.g. Unstoppable Grace"
                        className="border-b border-dashed border-slate-300 focus:border-amber-700 focus:outline-none pb-0.5 text-slate-700 font-medium bg-transparent select-text w-28"
                      />
                    </div>
                    <span className="text-slate-300">·</span>
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

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={applyHomileticModeTemplate}
                      className="px-2 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      Rebuild for {activeReferenceBadge}
                    </button>
                    <button
                      type="button"
                      onClick={handleAiGenerateFullSermonFromText}
                      disabled={!!aiLoadingTask}
                      className="px-2 py-1 rounded-md bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap disabled:opacity-50"
                      title="Use Gemini AI to craft Title Suggestions, Big Idea, Intro Illustration, and Manuscript from your chosen Scripture text"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>AI Generate All</span>
                    </button>
                  </div>
                </div>

                {/* Topical Cross-References Bar (When Topical mode is selected) */}
                {currentSermon.homileticalMode === "topical" && (
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex items-center justify-between gap-2 flex-wrap">
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
                              const next = (
                                currentSermon.topicalRefs || []
                              ).filter((_, i) => i !== idx);
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
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
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
            )}
          </div>

          {/* Dedicated Manuscript Formatting & Pulpit Cues Bar (Uncrowded Single Line on Tablet) */}
          {editorViewMode === "manuscript" && (
            <div className="px-3 py-1 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar text-xs text-slate-600 flex-none whitespace-nowrap">
              <div className="flex items-center gap-1 shrink-0">
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
                  <span>Illustration</span>
                </button>
              </div>

              {/* Right: Pulpit Cue Badges & Audio Transcription Studio */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">
                  Cues:
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={insertReadAloudCueBlock}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-950 hover:bg-amber-200 border border-amber-300 shadow-2xs transition-colors"
                  title="Wrap selected manuscript text in a high-contrast [READ ALOUD] style block for Preach Mode"
                >
                  [READ ALOUD]
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    insertHtmlAtCursor(
                      ` <span class="cue-badge cue-response">[RESPONSE]</span> `
                    )
                  }
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                >
                  [RESPONSE]
                </button>

                <div className="h-4 w-px bg-slate-300 mx-0.5" />

                <button
                  type="button"
                  onClick={() => setShowTranscribeModal(true)}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-[11px] font-medium whitespace-nowrap"
                  title="Open Audio Transcription Studio"
                >
                  Transcribe Audio
                </button>
              </div>
            </div>
          )}

          {/* Editor Scroll Viewport */}
          <div
            ref={editorScrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-5 py-4 sm:px-8 sm:py-6 pb-32 relative bg-white"
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

            {/* Active Manuscript Text-to-Speech (TTS) & Awkward Phrasing Listener */}
            {showTtsPlayer && editorViewMode === "manuscript" && (
              <div className="max-w-2xl mx-auto mb-6 rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-800 text-white flex items-center justify-center shrink-0">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <span>Manuscript Read-Aloud &amp; Phrasing Check</span>
                        {ttsCustomSelectionText ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 text-[10px] font-semibold">
                            Selected Excerpt
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-white border border-amber-200 text-amber-900 text-[10px] font-mono">
                            Section {ttsActiveSectionIndex + 1} of{" "}
                            {Math.max(1, manuscriptTtsSections.length)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Listen to your drafted sermon aloud to catch breathless
                        clauses, tongue-twisters, or awkward transitions.
                      </p>
                    </div>
                  </div>

                  {/* Playback Transport Controls */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      disabled={
                        !!ttsCustomSelectionText || ttsActiveSectionIndex <= 0
                      }
                      onClick={() =>
                        playManuscriptSectionAtIndex(
                          Math.max(0, ttsActiveSectionIndex - 1),
                          null
                        )
                      }
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700"
                      title="Previous Paragraph"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleTtsPlayPause}
                      className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                    >
                      {isTtsPlaying && !isTtsPaused ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {isTtsPaused ? "Resume" : "Play Section"}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={
                        !!ttsCustomSelectionText ||
                        ttsActiveSectionIndex >=
                          manuscriptTtsSections.length - 1
                      }
                      onClick={() =>
                        playManuscriptSectionAtIndex(
                          Math.min(
                            manuscriptTtsSections.length - 1,
                            ttsActiveSectionIndex + 1
                          ),
                          null
                        )
                      }
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700"
                      title="Next Paragraph"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        stopTtsPlayback();
                        setShowTtsPlayer(false);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                      title="Close Read-Aloud Player"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Voice & Speed Selector Row */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-200/70 flex-wrap text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Voice:
                    </label>
                    <select
                      value={ttsVoice}
                      onChange={(e) => {
                        const nextV = e.target.value as
                          | "Charon"
                          | "Kore"
                          | "Fenrir"
                          | "Zephyr"
                          | "Puck";
                        setTtsVoice(nextV);
                        if (isTtsPlaying) {
                          setTimeout(() => {
                            playManuscriptSectionAtIndex(
                              ttsActiveSectionIndex,
                              ttsCustomSelectionText
                            );
                          }, 50);
                        }
                      }}
                      className="px-2 py-1 rounded-md border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-amber-700"
                    >
                      <option value="Charon">Charon (Deep Pastoral)</option>
                      <option value="Kore">Kore (Warm Articulate)</option>
                      <option value="Fenrir">Fenrir (Measured Baritone)</option>
                      <option value="Zephyr">Zephyr (Clear Narrative)</option>
                      <option value="Puck">Puck (Conversational)</option>
                    </select>

                    <label className="text-[11px] font-semibold text-slate-600 ml-1">
                      Pace:
                    </label>
                    <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                      {[0.9, 1.0, 1.15, 1.25].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => {
                            setTtsSpeed(spd);
                            if (ttsAudioRef.current) {
                              ttsAudioRef.current.playbackRate = spd;
                            }
                          }}
                          className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                            ttsSpeed === spd
                              ? "bg-amber-800 text-white font-semibold"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {ttsCustomSelectionText && (
                    <button
                      type="button"
                      onClick={() =>
                        playManuscriptSectionAtIndex(ttsActiveSectionIndex, null)
                      }
                      className="text-[11px] font-semibold text-amber-900 hover:underline"
                    >
                      Switch to Full Manuscript
                    </button>
                  )}
                </div>

                {/* Currently Reading Section Preview & Awkward Phrasing Alert */}
                {(() => {
                  const activeSec =
                    manuscriptTtsSections[ttsActiveSectionIndex];
                  const previewText =
                    ttsCustomSelectionText || activeSec?.spokenText || "";
                  const awkwardList = ttsCustomSelectionText
                    ? ttsCustomSelectionText
                        .split(/(?<=[.!?])\s+/)
                        .filter(
                          (s) => s.split(/\s+/).filter(Boolean).length >= 30
                        )
                    : activeSec?.awkwardSentences || [];

                  return (
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-lg bg-white border border-amber-200/80 text-xs text-slate-800 font-serif leading-relaxed">
                        <div className="flex items-center justify-between mb-1 font-sans">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">
                            {ttsCustomSelectionText
                              ? "Reading Highlighted Selection"
                              : activeSec?.label || "Section"}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {
                              previewText
                                .split(/\s+/)
                                .filter(Boolean).length
                            }{" "}
                            words
                          </span>
                        </div>
                        <p className="text-slate-800">{previewText}</p>
                      </div>

                      {/* Awkward / Long Sentence Warning */}
                      {awkwardList.length > 0 ? (
                        <div className="p-3 rounded-lg bg-amber-100/70 border border-amber-300/90 flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-start gap-2 flex-1 min-w-[220px]">
                            <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                            <div className="space-y-1 text-xs">
                              <div className="font-semibold text-amber-950">
                                Potential Awkward or Breathless Phrasing Detected
                              </div>
                              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                                This section has {awkwardList.length} long or
                                clause-heavy sentence
                                {awkwardList.length > 1 ? "s" : ""} (30+ words)
                                that may sound winded when spoken from the
                                pulpit:
                              </p>
                              <div className="text-[11px] italic text-amber-950 bg-white/80 px-2.5 py-1.5 rounded border border-amber-200/80">
                                &ldquo;{awkwardList[0]}&rdquo;
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={ttsPolishingSection}
                            onClick={handlePolishActiveTtsSection}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-2xs"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {ttsPolishingSection
                                ? "Smoothing..."
                                : "Smooth Phrasing with AI"}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50/80 border border-emerald-200/70 rounded-lg px-3 py-1.5">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Spoken cadence looks crisp — sentences in this
                            section are well-paced for preaching.
                          </span>
                          <button
                            type="button"
                            disabled={ttsPolishingSection}
                            onClick={handlePolishActiveTtsSection}
                            className="text-amber-900 font-semibold hover:underline"
                          >
                            {ttsPolishingSection
                              ? "Polishing..."
                              : "Polish Section Anyway"}
                          </button>
                        </div>
                      )}

                      {/* Quick Section Jump Pills */}
                      {manuscriptTtsSections.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
                          {manuscriptTtsSections.map((sec) => {
                            const hasAwkward = sec.awkwardSentences.length > 0;
                            const isCurrent =
                              !ttsCustomSelectionText &&
                              sec.index === ttsActiveSectionIndex;
                            return (
                              <button
                                key={sec.index}
                                type="button"
                                onClick={() =>
                                  playManuscriptSectionAtIndex(sec.index, null)
                                }
                                className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap border flex items-center gap-1 transition-colors ${
                                  isCurrent
                                    ? "bg-amber-800 text-white border-amber-800 font-semibold"
                                    : hasAwkward
                                    ? "bg-amber-100/80 text-amber-950 border-amber-300 hover:bg-amber-200/70"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                }`}
                                title={
                                  hasAwkward
                                    ? `${sec.label} (Contains long/complex sentence)`
                                    : sec.label
                                }
                              >
                                <span>{sec.index + 1}.</span>
                                <span className="max-w-[95px] truncate">
                                  {sec.spokenText.slice(0, 22)}...
                                </span>
                                {hasAwkward && (
                                  <AlertTriangle
                                    className={`w-2.5 h-2.5 ${
                                      isCurrent
                                        ? "text-amber-200"
                                        : "text-amber-700"
                                    }`}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
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

            {/* How To Use View */}
            {editorViewMode === "howto" && (
              <div className="max-w-3xl mx-auto py-8 px-6 sm:px-10 space-y-8">
                {/* Header Banner */}
                <div className="p-5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-stone-50 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-md">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-800" />
                        <span>PulpitFlow Studio Guide</span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight font-serif">
                        How to Navigate &amp; Use PulpitFlow
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                        PulpitFlow is designed around a unified{" "}
                        <strong>split-screen workflow</strong>: study Scripture,
                        commentaries, and theological themes on the{" "}
                        <strong>Left Pane</strong> while organizing notes,
                        structuring outlines, and crafting your preaching
                        manuscript on the <strong>Right Pane</strong>.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditorViewMode("manuscript")}
                      className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold shadow-2xs transition-colors shrink-0"
                    >
                      Back to Manuscript
                    </button>
                  </div>
                </div>

                {/* Section 1: 4-Step Sermon Preparation Workflow */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      1. Recommended 4-Step Sermon Prep Workflow
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      From Text to Pulpit
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded font-mono">
                          STEP 01
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Left Pane · Scripture Bar
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Select Your Scripture &amp; Sync Sermon
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Choose a <strong>Book, Chapter, and Verse range</strong>{" "}
                        using the dropdowns or the visual{" "}
                        <strong>Picker</strong> grid. Click{" "}
                        <strong>Set as Sermon Text</strong> to automatically
                        tailor your Title Ideas, Big Idea, Intro Illustration,
                        and Manuscript to that exact passage.
                      </p>
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setBibleTab("reader");
                            setShowGridPicker(true);
                          }}
                          className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2"
                        >
                          Open Passage Grid Picker →
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded font-mono">
                          STEP 02
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Left Pane · Study Tabs
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Highlight, Bookmark &amp; Research Exegesis
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Click any verse to highlight it in{" "}
                        <strong>Yellow, Green, or Blue</strong>, bookmark it for
                        quick reference, run a Greek/Hebrew{" "}
                        <strong>Word Study</strong>, read{" "}
                        <strong>Commentaries</strong>, or run a{" "}
                        <strong>Scripture Context Search</strong> by theme.
                      </p>
                      <div className="pt-1 flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setBibleTab("commentaries")}
                          className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2"
                        >
                          Open Commentaries →
                        </button>
                        <button
                          type="button"
                          onClick={() => setBibleTab("scratchpad")}
                          className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2"
                        >
                          Open Exegesis &amp; Context Search →
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded font-mono">
                          STEP 03
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Right Pane · Organizer &amp; Editor
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Organize Raw Notes &amp; Draft Manuscript
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Brain-dump unstructured thoughts in{" "}
                        <strong>Notes Organizer</strong> and let AI arrange them
                        into logical preaching order, or write directly in the{" "}
                        <strong>Manuscript</strong> editor with pulpits cues (
                        <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                          [PAUSE]
                        </code>
                        ,{" "}
                        <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                          [SLIDE]
                        </code>
                        ).
                      </p>
                      <div className="pt-1 flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setEditorViewMode("organizer")}
                          className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2"
                        >
                          Try Notes Organizer →
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorViewMode("outline")}
                          className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2"
                        >
                          Open Outline View →
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded font-mono">
                          STEP 04
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Top Bar · Delivery &amp; Export
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Preach Mode Teleprompter &amp; Export
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Launch <strong>Preach Mode</strong> for a high-contrast,
                        distraction-free pulpit teleprompter with a live timer,
                        adjustable font size, and auto-scroll, or export your
                        sermon to Markdown, Plain Text, or Print.
                      </p>
                      <div className="pt-1 flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setShowPreachModal(true)}
                          className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2"
                        >
                          Launch Preach Mode →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Navigating the Left Pane (Scripture & Exegesis Studio) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. Left Pane Guide — Scripture Reader &amp; Exegesis Tabs
                  </h3>

                  <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs">
                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Scripture Reader &amp; 3-Color Verse Highlighter
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/60">
                            Tab 1
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Click any verse to select it. Use the{" "}
                          <strong>Highlight toolbar</strong> or hover over a
                          verse to highlight in{" "}
                          <span className="px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-950 font-medium">
                            Yellow
                          </span>
                          ,{" "}
                          <span className="px-1.5 py-0.2 rounded bg-emerald-200/80 text-emerald-950 font-medium">
                            Green
                          </span>
                          , or{" "}
                          <span className="px-1.5 py-0.2 rounded bg-sky-200/80 text-sky-950 font-medium">
                            Blue
                          </span>
                          . Click <strong>Quote Verse into Sermon</strong> to
                          insert a formatted block-quote directly at your cursor
                          position in the manuscript.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBibleTab("reader")}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 shrink-0"
                      >
                        Open Reader
                      </button>
                    </div>

                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Bookmarks List (Saved in Browser Storage)
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/60">
                            Tab 2
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Click the <strong>Bookmark ribbon icon</strong> on any
                          verse in the reader to save it for quick reference.
                          Your bookmarks persist automatically in{" "}
                          <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                            localStorage
                          </code>{" "}
                          so you can jump back to any passage or quote it into
                          future sermons.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBibleTab("bookmarks")}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 shrink-0"
                      >
                        Open Bookmarks
                      </button>
                    </div>

                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Scholarly Commentaries
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/60">
                            Tab 3
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Automatically synthesizes concise scholarly commentary
                          excerpts (Historical/Contextual, Lexical/Grammatical,
                          and Patristic/Reformed) for your active passage. Click{" "}
                          <strong>Save to Exegesis Scratchpad</strong> on any
                          card to capture the insight.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBibleTab("commentaries")}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 shrink-0"
                      >
                        Open Commentaries
                      </button>
                    </div>

                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Cross-References &amp; Redemptive Themes
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/60">
                            Tab 4
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Explore curated canonical cross-references for your
                          active chapter and filter verses by theological themes
                          (Grace, Covenant, Suffering, Kingdom, Spirit).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBibleTab("themes")}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 shrink-0"
                      >
                        Open Cross-Refs
                      </button>
                    </div>

                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Exegesis Scratchpad &amp; Scripture Context Search
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/60">
                            Tab 5
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Type any theme or topic (e.g.,{" "}
                          <em>&ldquo;suffering&rdquo;</em>,{" "}
                          <em>&ldquo;grace&rdquo;</em>,{" "}
                          <em>&ldquo;hope&rdquo;</em>) in{" "}
                          <strong>Scripture Context Search</strong> to have
                          Gemini suggest relevant Old &amp; New Testament
                          passages and link them to your sermon, alongside your
                          freeform exegetical scratchpad.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBibleTab("scratchpad")}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 shrink-0"
                      >
                        Open Scratchpad
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 3: Navigating the Right Pane (Sermon Studio & AI Homiletics) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    3. Right Pane Guide — Sermon Studio, AI Tools &amp; Audio
                  </h3>

                  <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs">
                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-900">
                          Homiletical Approaches (Expository · Textual ·
                          Topical)
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Switch between <strong>Expository</strong>{" "}
                          (verse-by-verse progression), <strong>Textual</strong>{" "}
                          (centered on a specific phrase/clause pivot), and{" "}
                          <strong>Topical</strong> (thematic synthesis with
                          supporting scripture tags). Clicking{" "}
                          <strong>Sync Sermon to [Passage]</strong> regenerates
                          your title suggestions, Big Idea, intro illustration,
                          and manuscript for that passage.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditorViewMode("manuscript")}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 shrink-0"
                      >
                        Go to Editor
                      </button>
                    </div>

                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-900">
                          AI Homiletics Assistant Toolbar
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Inside the Manuscript toolbar, use{" "}
                          <strong>AI Outline</strong> to build a 3-point
                          expository structure, <strong>Word Study</strong> for
                          Greek/Hebrew lexical analysis,{" "}
                          <strong>Illustration</strong> for historical or modern
                          analogies, and <strong>Polish Note</strong> to refine
                          transitions for spoken cadence.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditorViewMode("manuscript")}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 shrink-0"
                      >
                        Use AI Toolbar
                      </button>
                    </div>

                    <div className="p-4 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-900">
                          Voice Dictation &amp; Audio Transcription Studio
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Click <strong>Dictate</strong> in the toolbar for live
                          microphone speech-to-text straight into your
                          manuscript, or click{" "}
                          <strong>Transcribe Studio</strong> to record a voice
                          memo or upload an audio file for Gemini transcription.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTranscribeModal(true)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 shrink-0"
                      >
                        Open Audio Studio
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 4: Pro Tips & Pulpit Cues Reference */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    4. Quick Reference — Pulpit Cues &amp; Pacing Calculator
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                    <div className="p-3 rounded-lg bg-white border border-slate-200/80">
                      <div className="font-mono font-bold text-amber-900 mb-1">
                        [PAUSE] · [SLIDE] · [RESPONSE]
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Insert delivery cues from the editor toolbar. They stand
                        out visually in Preach Mode so you never miss a slide
                        change or dramatic pause.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-slate-200/80">
                      <div className="font-mono font-bold text-amber-900 mb-1">
                        120 / 140 / 160 WPM Pacing
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Adjust your speaking pace in the bottom status bar to
                        see your real-time estimated preaching duration update
                        as you type.
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-slate-200/80">
                      <div className="font-mono font-bold text-amber-900 mb-1">
                        Sermon Series Switcher
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Use the top-left sermon selector dropdown to switch
                        between sermons in your series or create a new sermon
                        manuscript at any time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Features Directory View */}
            {editorViewMode === "features" && (
              <div className="max-w-3xl mx-auto py-8 px-6 sm:px-10 space-y-8">
                {/* Features Header Banner */}
                <div className="p-5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-stone-50 shadow-2xs space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-md">
                        <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                        <span>Complete Studio Capabilities</span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight font-serif">
                        PulpitFlow Features &amp; Capabilities
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                        Explore every tool built into{" "}
                        <strong>PulpitFlow — Sermon Prep &amp; Scripture Studio</strong>.
                        Click any feature below to jump directly to that tool in
                        your workspace.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditorViewMode("howto")}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        How To Use Guide
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorViewMode("manuscript")}
                        className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold shadow-2xs transition-colors"
                      >
                        Back to Manuscript
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category 1: Scripture Reader & Exegesis Studio */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      1. Scripture Reader &amp; Exegesis Studio (Left Pane)
                    </h3>
                    <span className="text-[11px] text-amber-900 font-mono font-semibold">
                      6 Features
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Grid className="w-3.5 h-3.5 text-amber-800" />
                            <span>Chapter &amp; Verse Range Picker</span>
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            66 Books
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Navigate any Book, Chapter, and exact Verse range
                          using quick dropdowns or the 3-step visual grid
                          selector, with one-click range isolation.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBibleTab("reader");
                          setShowGridPicker(true);
                        }}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Open Passage Grid Picker →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Highlighter className="w-3.5 h-3.5 text-amber-800" />
                            <span>3-Color Verse Highlighter</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-300 border border-amber-500" />
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 border border-emerald-500" />
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-300 border border-sky-500" />
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Highlight verses in <strong>Yellow</strong>,{" "}
                          <strong>Green</strong>, or <strong>Blue</strong>{" "}
                          directly inside the Bible Reader to color-code themes,
                          gospel promises, and imperatives.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBibleTab("reader")}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Try Verse Highlighter in Reader →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Bookmark className="w-3.5 h-3.5 text-amber-800" />
                            <span>Persistent Verse Bookmarks</span>
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/70">
                            {bookmarkedVerses.length} Saved
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Bookmark key verses from any chapter for rapid
                          reference. Stored automatically in{" "}
                          <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                            localStorage
                          </code>{" "}
                          with a dedicated Bookmarks sidebar tab.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBibleTab("bookmarks")}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Open Bookmarks Tab →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-amber-800" />
                            <span>Scholarly Commentaries Tab</span>
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200/70">
                            AI Exegesis
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Fetches concise Historical/Contextual,
                          Lexical/Grammatical, and Patristic/Reformed scholarly
                          commentary insights for your active passage and saves
                          them to your Exegesis Scratchpad.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBibleTab("commentaries")}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Open Commentaries Tab →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Search className="w-3.5 h-3.5 text-amber-800" />
                            <span>Scripture Context Search</span>
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200/70">
                            Gemini Search
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Type any theological theme or topic (e.g.,{" "}
                          <em>&ldquo;suffering&rdquo;</em> or{" "}
                          <em>&ldquo;grace&rdquo;</em>) in the Exegesis pane to
                          discover and link supporting Old &amp; New Testament
                          passages to your sermon.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBibleTab("scratchpad")}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Open Scripture Context Search →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Link2 className="w-3.5 h-3.5 text-amber-800" />
                            <span>Cross-References &amp; Theme Filters</span>
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            Canonical Links
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Explore curated canonical cross-references and filter
                          verses by redemptive-historical themes (Grace,
                          Covenant, Suffering, Kingdom, Spirit).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBibleTab("themes")}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Open Cross-References &amp; Themes →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category 2: Sermon Manuscript & Homiletics Studio */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      2. Sermon Manuscript &amp; Homiletics Studio (Right Pane)
                    </h3>
                    <span className="text-[11px] text-amber-900 font-mono font-semibold">
                      5 Features
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-amber-800" />
                          <span>Scripture-Synced Sermon Package</span>
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Automatically grounds your{" "}
                          <strong>Title Suggestions</strong>,{" "}
                          <strong>Big Idea</strong>,{" "}
                          <strong>Opening Intro Illustration</strong>, and{" "}
                          <strong>Full Manuscript</strong> in the exact
                          Scripture passage you select.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditorViewMode("manuscript");
                          handleAiGenerateFullSermonFromText();
                        }}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Generate Sermon from {activeReferenceBadge} →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-800" />
                          <span>AI Sermon Notes Organizer</span>
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Type or paste unstructured sermon thoughts and let AI
                          organize them into logical preaching order across 4
                          homiletical frameworks (Expository, Law &amp; Gospel,
                          Narrative, 3-Point).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditorViewMode("organizer")}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Open Notes Organizer →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Columns className="w-3.5 h-3.5 text-amber-800" />
                          <span>
                            Expository, Textual &amp; Topical Homiletical Modes
                          </span>
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Switch seamlessly between Verse-by-Verse Expository,
                          Textual Pivot Clause, and Topical Multi-Reference
                          modes with dedicated structure templates.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditorViewMode("manuscript")}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Switch Modes in Manuscript View →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-800" />
                          <span>Outline Builder &amp; Time Budget View</span>
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Plan sermon movements, allocate minutes per section,
                          and track total preaching time before stepping into
                          the pulpit.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditorViewMode("outline")}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Open Outline View →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category 3: Voice, Text-to-Speech & AI Homiletics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      3. Text-to-Speech, Voice Studio &amp; AI Homiletics
                    </h3>
                    <span className="text-[11px] text-amber-900 font-mono font-semibold">
                      4 Features
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-amber-800" />
                            <span>
                              Manuscript Text-to-Speech &amp; Phrasing Check
                            </span>
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950">
                            Gemini TTS
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Listen to your drafted manuscript aloud with 5
                          pastoral voices and variable playback speeds. Flags
                          breathless 30+ word sentences and smooths awkward
                          phrasing with AI.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditorViewMode("manuscript");
                          handleToggleTtsPlayPause();
                        }}
                        className="text-xs font-semibold text-amber-900 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Listen to Manuscript Now →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-amber-800" />
                          <span>
                            Live Voice Dictation &amp; Audio Transcription Studio
                          </span>
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Dictate sermon paragraphs hands-free or record/upload
                          voice memos for accurate pastoral transcription via{" "}
                          <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                            gemini-3.5-transcribe
                          </code>
                          .
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTranscribeModal(true)}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Open Audio Transcription Studio →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                          <span>Greek &amp; Hebrew Original Language Study</span>
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Generate lexical word studies (transliteration, root
                          morphology, and theological application) for key terms
                          in your chosen passage and insert them into your
                          manuscript.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditorViewMode("manuscript");
                          handleAiWordStudy();
                        }}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Run Word Study on {currentSermon.passageTag} →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-800" />
                          <span>
                            AI Intro Illustrations &amp; Spoken Cadence Polish
                          </span>
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Generate passage-specific opening illustrations,
                          historical snapshots, and spoken-flow transition
                          checks at any point in your manuscript.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditorViewMode("manuscript");
                          handleAiIllustration();
                        }}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Generate Intro Illustration →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category 4: Pulpit Delivery, Series Library & Export */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      4. Pulpit Delivery, Series Library &amp; Export
                    </h3>
                    <span className="text-[11px] text-amber-900 font-mono font-semibold">
                      3 Features
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Play className="w-3.5 h-3.5 text-amber-800 fill-current" />
                          <span>Preach Mode Teleprompter</span>
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Distraction-free dark pulpit view with live elapsed
                          timer, adjustable typography, auto-scroll, and
                          highlighted stage cues.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPreachModal(true)}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Launch Preach Mode →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-800" />
                          <span>Sermon Series Library</span>
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Manage multiple sermons across preaching series,
                          duplicate manuscripts, or start a fresh sermon from
                          any Bible passage.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowLibraryModal(true)}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Open Sermon Library →
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5 text-amber-800" />
                          <span>Markdown, Clipboard &amp; Print Export</span>
                        </span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Export your complete sermon manuscript, Big Idea, and
                          Scripture metadata to Markdown (
                          <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">
                            .md
                          </code>
                          ), Plain Text, or Print.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadMarkdown}
                        className="text-xs font-semibold text-amber-800 hover:text-amber-950 text-left underline underline-offset-2"
                      >
                        Export Markdown (.md) →
                      </button>
                    </div>
                  </div>
                </div>
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
