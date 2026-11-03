export interface VerseItem {
  v: number;
  text: string;
}

export interface OutlineSection {
  name: string;
  minutes: number;
  notes: string;
}

export interface OrganizedNoteSection {
  id: string;
  category: string;
  heading: string;
  scriptureConnection: string;
  organizedContent: string;
  keyBullets: string[];
  transitionToNext: string;
  estimatedMinutes: number;
}

export interface CommentaryExcerpt {
  id: string;
  lens:
    | "Exegetical & Lexical"
    | "Historical-Cultural"
    | "Historical Theology"
    | "Pastoral & Christological";
  scholarOrTradition: string;
  verseFocus: string;
  thesis: string;
  excerpt: string;
  lexicalOrContextNote: string;
}

export interface ContextSearchPassage {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  quote: string;
  thematicConnection: string;
  testamentOrGenre: string;
}

export type NotesOrganizationFramework =
  | "expository-flow"
  | "problem-gospel-response"
  | "classic-three-point";

export type HomileticalMode = "expository" | "textual" | "topical";

export interface SermonDocument {
  id: string;
  title: string;
  titleSuggestions?: string[];
  series: string;
  date: string;
  passageTag: string;
  homileticalMode: HomileticalMode;
  topicalRefs: string[];
  bigIdea: string;
  notes: string;
  outline: OutlineSection[];
  scratchpad: string;
  rawNotes?: string;
  organizedSections?: OrganizedNoteSection[];
}

export const BIBLE_BOOK_CHAPTERS: Record<string, number> = {
  // Pentateuch & History
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,
  Joshua: 24,
  Judges: 21,
  Ruth: 4,
  "1 Samuel": 31,
  "2 Samuel": 24,
  "1 Kings": 22,
  "2 Kings": 25,
  "1 Chronicles": 29,
  "2 Chronicles": 36,
  Ezra: 10,
  Nehemiah: 13,
  Esther: 10,
  // Poetry & Wisdom
  Job: 42,
  Psalms: 150,
  Proverbs: 31,
  Ecclesiastes: 12,
  "Song of Solomon": 8,
  // Major & Minor Prophets
  Isaiah: 66,
  Jeremiah: 52,
  Lamentations: 5,
  Ezekiel: 48,
  Daniel: 12,
  Hosea: 14,
  Joel: 3,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 4,
  // Gospels & Acts
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
  Acts: 28,
  // Epistles & Revelation
  Romans: 16,
  "1 Corinthians": 16,
  "2 Corinthians": 13,
  Galatians: 6,
  Ephesians: 6,
  Philippians: 4,
  Colossians: 4,
  "1 Thessalonians": 5,
  "2 Thessalonians": 3,
  "1 Timothy": 6,
  "2 Timothy": 4,
  Titus: 3,
  Philemon: 1,
  Hebrews: 13,
  James: 5,
  "1 Peter": 5,
  "2 Peter": 3,
  "1 John": 5,
  "2 John": 1,
  "3 John": 1,
  Jude: 1,
  Revelation: 22,
};

export const BIBLE_BOOK_GROUPS = [
  {
    label: "Gospels & Acts",
    books: ["Matthew", "Mark", "Luke", "John", "Acts"],
  },
  {
    label: "Epistles & Revelation",
    books: [
      "Romans",
      "1 Corinthians",
      "2 Corinthians",
      "Galatians",
      "Ephesians",
      "Philippians",
      "Colossians",
      "1 Thessalonians",
      "2 Thessalonians",
      "1 Timothy",
      "2 Timothy",
      "Titus",
      "Philemon",
      "Hebrews",
      "James",
      "1 Peter",
      "2 Peter",
      "1 John",
      "2 John",
      "3 John",
      "Jude",
      "Revelation",
    ],
  },
  {
    label: "Pentateuch & History",
    books: [
      "Genesis",
      "Exodus",
      "Leviticus",
      "Numbers",
      "Deuteronomy",
      "Joshua",
      "Judges",
      "Ruth",
      "1 Samuel",
      "2 Samuel",
      "1 Kings",
      "2 Kings",
      "1 Chronicles",
      "2 Chronicles",
      "Ezra",
      "Nehemiah",
      "Esther",
    ],
  },
  {
    label: "Poetry & Prophets",
    books: [
      "Job",
      "Psalms",
      "Proverbs",
      "Ecclesiastes",
      "Song of Solomon",
      "Isaiah",
      "Jeremiah",
      "Lamentations",
      "Ezekiel",
      "Daniel",
      "Hosea",
      "Joel",
      "Amos",
      "Obadiah",
      "Jonah",
      "Micah",
      "Nahum",
      "Habakkuk",
      "Zephaniah",
      "Haggai",
      "Zechariah",
      "Malachi",
    ],
  },
];

export const QUICK_JUMP_REFS = [
  { label: "Romans 8:1-17", book: "Romans", chapter: 8, verseStart: 1, verseEnd: 17 },
  { label: "Psalm 23:1-6", book: "Psalms", chapter: 23, verseStart: 1, verseEnd: 6 },
  { label: "John 3:16-18", book: "John", chapter: 3, verseStart: 16, verseEnd: 18 },
  { label: "Matt 5:1-12", book: "Matthew", chapter: 5, verseStart: 1, verseEnd: 12 },
  { label: "Eph 2:4-10", book: "Ephesians", chapter: 2, verseStart: 4, verseEnd: 10 },
  { label: "1 Cor 13:4-8", book: "1 Corinthians", chapter: 13, verseStart: 4, verseEnd: 8 },
  { label: "Phil 4:6-7", book: "Philippians", chapter: 4, verseStart: 6, verseEnd: 7 },
];

export const EMBEDDED_BIBLE: Record<string, VerseItem[]> = {
  "Romans 8": [
    { v: 1, text: "There is therefore now no condemnation to those who are in Christ Jesus, who don't walk according to the flesh, but according to the Spirit." },
    { v: 2, text: "For the law of the Spirit of life in Christ Jesus made me free from the law of sin and of death." },
    { v: 3, text: "For what the law couldn't do, in that it was weak through the flesh, God did, sending his own Son in the likeness of sinful flesh and for sin, he condemned sin in the flesh;" },
    { v: 4, text: "that the ordinance of the law might be fulfilled in us, who walk not according to the flesh, but according to the Spirit." },
    { v: 5, text: "For those who live according to the flesh set their minds on the things of the flesh, but those who live according to the Spirit, the things of the Spirit." },
    { v: 6, text: "For the mind of the flesh is death, but the mind of the Spirit is life and peace;" },
    { v: 7, text: "because the mind of the flesh is hostile towards God; for it is not subject to God's law, neither indeed can it be." },
    { v: 8, text: "Those who are in the flesh can't please God." },
    { v: 9, text: "But you are not in the flesh, but in the Spirit, if the Spirit of God really dwells in you. If anyone doesn't have the Spirit of Christ, he is not his." },
    { v: 10, text: "If Christ is in you, the body is dead because of sin, but the spirit is alive because of righteousness." },
    { v: 11, text: "But if the Spirit of him who raised up Jesus from the dead dwells in you, he who raised up Christ Jesus from the dead will also give life to your mortal bodies through his Spirit who dwells in you." },
    { v: 12, text: "So then, brothers, we are debtors, not to the flesh, to live after the flesh." },
    { v: 13, text: "For if you live after the flesh, you must die; but if by the Spirit you put to death the deeds of the body, you will live." },
    { v: 14, text: "For as many as are led by the Spirit of God, these are children of God." },
    { v: 15, text: "For you didn't receive the spirit of bondage again to fear, but you received the Spirit of adoption, by whom we cry, 'Abba! Father!'" },
    { v: 16, text: "The Spirit himself testifies with our spirit that we are children of God;" },
    { v: 17, text: "and if children, then heirs; heirs of God, and joint heirs with Christ; if indeed we suffer with him, that we may also be glorified with him." },
    { v: 18, text: "For I consider that the sufferings of this present time are not worthy to be compared with the glory which will be revealed toward us." },
    { v: 19, text: "For the eager expectation of the creation waits for the revealing of the children of God." },
    { v: 20, text: "For the creation was subjected to vanity, not of its own will, but because of him who subjected it, in hope" },
    { v: 21, text: "that the creation itself also will be delivered from the bondage of decay into the liberty of the glory of the children of God." },
    { v: 22, text: "For we know that the whole creation groans and travails in pain together until now." },
    { v: 23, text: "Not only so, but ourselves also, who have the first fruits of the Spirit, even we ourselves groan within ourselves, waiting for adoption, the redemption of our body." },
    { v: 24, text: "For we were saved in hope, but hope that is seen is not hope. For who hopes for that which he sees?" },
    { v: 25, text: "But if we hope for that which we don't see, we wait for it with patience." },
    { v: 26, text: "In the same way, the Spirit also helps our weaknesses, for we don't know how to pray as we ought. But the Spirit himself makes intercession for us with groanings which can't be uttered." },
    { v: 27, text: "He who searches the hearts knows what is on the Spirit's mind, because he makes intercession for the saints according to God." },
    { v: 28, text: "We know that all things work together for good for those who love God, to those who are called according to his purpose." },
    { v: 29, text: "For whom he foreknew, he also predestined to be conformed to the image of his Son, that he might be the firstborn among many brothers." },
    { v: 30, text: "Whom he predestined, those he also called. Whom he called, those he also justified. Whom he justified, those he also glorified." },
    { v: 31, text: "What then shall we say about these things? If God is for us, who can be against us?" },
    { v: 32, text: "He who didn't spare his own Son, but delivered him up for us all, how would he not also with him freely give us all things?" },
    { v: 33, text: "Who could bring a charge against God's chosen ones? It is God who justifies." },
    { v: 34, text: "Who is he who condemns? It is Christ who died, yes rather, who was raised from the dead, who is at the right hand of God, who also makes intercession for us." },
    { v: 35, text: "Who shall separate us from the love of Christ? Could oppression, or anguish, or persecution, or famine, or nakedness, or peril, or sword?" },
    { v: 36, text: "Even as it is written, 'For your sake we are killed all day long. We were accounted as sheep for the slaughter.'" },
    { v: 37, text: "No, in all these things, we are more than conquerors through him who loved us." },
    { v: 38, text: "For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers," },
    { v: 39, text: "nor height, nor depth, nor any other created thing, will be able to separate us from the love of God, which is in Christ Jesus our Lord." },
  ],
  "Psalms 23": [
    { v: 1, text: "Yahweh is my shepherd: I shall lack nothing." },
    { v: 2, text: "He makes me lie down in green pastures. He leads me beside still waters." },
    { v: 3, text: "He restores my soul. He guides me in the paths of righteousness for his name's sake." },
    { v: 4, text: "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me." },
    { v: 5, text: "You prepare a table before me in the presence of my enemies. You have anointed my head with oil. My cup runs over." },
    { v: 6, text: "Surely goodness and loving kindness shall follow me all the days of my life, and I will dwell in Yahweh's house forever." },
  ],
  "John 3": [
    { v: 1, text: "Now there was a man of the Pharisees named Nicodemus, a ruler of the Jews." },
    { v: 2, text: "The same came to him by night, and said to him, 'Rabbi, we know that you are a teacher come from God, for no one can do these signs that you do, unless God is with him.'" },
    { v: 3, text: "Jesus answered him, 'Most certainly, I tell you, unless one is born anew, he can't see the Kingdom of God.'" },
    { v: 4, text: "Nicodemus said to him, 'How can a man be born when he is old? Can he enter a second time into his mother's womb, and be born?'" },
    { v: 5, text: "Jesus answered, 'Most certainly I tell you, unless one is born of water and spirit, he can't enter into the Kingdom of God.'" },
    { v: 6, text: "That which is born of the flesh is flesh. That which is born of the Spirit is spirit." },
    { v: 7, text: "Don't marvel that I said to you, 'You must be born anew.'" },
    { v: 8, text: "The wind blows where it wants to, and you hear its sound, but don't know where it comes from and where it is going. So is everyone who is born of the Spirit." },
    { v: 14, text: "As Moses lifted up the serpent in the wilderness, even so must the Son of Man be lifted up," },
    { v: 15, text: "that whoever believes in him should not perish, but have eternal life." },
    { v: 16, text: "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life." },
    { v: 17, text: "For God didn't send his Son into the world to judge the world, but that the world should be saved through him." },
    { v: 18, text: "He who believes in him is not judged. He who doesn't believe has been judged already, because he has not believed in the name of the one and only Son of God." },
  ],
  "Matthew 5": [
    { v: 1, text: "Seeing the multitudes, he went up onto the mountain. When he had sat down, his disciples came to him." },
    { v: 2, text: "He opened his mouth and taught them, saying," },
    { v: 3, text: "'Blessed are the poor in spirit, for theirs is the Kingdom of Heaven.'" },
    { v: 4, text: "'Blessed are those who mourn, for they shall be comforted.'" },
    { v: 5, text: "'Blessed are the gentle, for they shall inherit the earth.'" },
    { v: 6, text: "'Blessed are those who hunger and thirst after righteousness, for they shall be filled.'" },
    { v: 7, text: "'Blessed are the merciful, for they shall obtain mercy.'" },
    { v: 8, text: "'Blessed are the pure in heart, for they shall see God.'" },
    { v: 9, text: "'Blessed are the peacemakers, for they shall be called children of God.'" },
    { v: 10, text: "'Blessed are those who have been persecuted for righteousness' sake, for theirs is the Kingdom of Heaven.'" },
    { v: 11, text: "'Blessed are you when people reproach you, persecute you, and say all kinds of evil against you falsely, for my sake.'" },
    { v: 12, text: "'Rejoice, and be exceedingly glad, for great is your reward in heaven. For that is how they persecuted the prophets who were before you.'" },
    { v: 13, text: "'You are the salt of the earth, but if the salt has lost its flavor, with what will it be salted?'" },
    { v: 14, text: "'You are the light of the world. A city located on a hill can't be hidden.'" },
    { v: 15, text: "'Neither do you light a lamp, and put it under a measuring basket, but on a stand; and it shines to all who are in the house.'" },
    { v: 16, text: "'Even so, let your light shine before men; that they may see your good works, and glorify your Father who is in heaven.'" },
  ],
  "Ephesians 2": [
    { v: 1, text: "You were made alive when you were dead in transgressions and sins," },
    { v: 2, text: "in which you once walked according to the course of this world, according to the prince of the power of the air," },
    { v: 3, text: "among whom we also all once lived in the lusts of our flesh, doing the desires of the flesh and of the mind," },
    { v: 4, text: "But God, being rich in mercy, for his great love with which he loved us," },
    { v: 5, text: "even when we were dead through our trespasses, made us alive together with Christ (by grace you have been saved)," },
    { v: 6, text: "and raised us up with him, and made us to sit with him in the heavenly places in Christ Jesus," },
    { v: 7, text: "that in the ages to come he might show the exceeding riches of his grace in kindness toward us in Christ Jesus;" },
    { v: 8, text: "for by grace you have been saved through faith, and that not of yourselves; it is the gift of God," },
    { v: 9, text: "not of works, that no one would boast." },
    { v: 10, text: "For we are his workmanship, created in Christ Jesus for good works, which God prepared before that we would walk in them." },
  ],
  "1 Corinthians 13": [
    { v: 1, text: "If I speak with the languages of men and of angels, but don't have love, I have become sounding brass, or a clanging cymbal." },
    { v: 2, text: "If I have the gift of prophecy, and know all mysteries and all knowledge; and if I have all faith, so as to remove mountains, but don't have love, I am nothing." },
    { v: 3, text: "If I dole out all my goods to feed the poor, and if I give my body to be burned, but don't have love, it profits me nothing." },
    { v: 4, text: "Love is patient and is kind; love doesn't envy; love doesn't brag, is not proud," },
    { v: 5, text: "doesn't behave itself inappropriately, doesn't seek its own way, is not provoked, takes no account of evil;" },
    { v: 6, text: "doesn't rejoice in unrighteousness, but rejoices with the truth;" },
    { v: 7, text: "bears all things, believes all things, hopes all things, and endures all things." },
    { v: 8, text: "Love never fails. But where there are prophecies, they will be done away with. Where there are various languages, they will cease." },
    { v: 13, text: "But now faith, hope, and love remain—these three. The greatest of these is love." },
  ],
  "Philippians 4": [
    { v: 4, text: "Rejoice in the Lord always! Again I will say, 'Rejoice!'" },
    { v: 5, text: "Let your gentleness be known to all men. The Lord is at hand." },
    { v: 6, text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God." },
    { v: 7, text: "And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus." },
    { v: 8, text: "Finally, brothers, whatever things are true, whatever things are honorable, whatever things are just, whatever things are pure, whatever things are lovely, whatever things are of good report: if there is any virtue and if there is anything worthy of praise, think about these things." },
    { v: 9, text: "The things which you learned, received, heard, and saw in me: do these things, and the God of peace will be with you." },
    { v: 11, text: "Not that I speak in respect to lack, for I have learned in whatever state I am, to be content in it." },
    { v: 12, text: "I know how to be humbled, and I know also how to abound. In everything and in all things I have learned the secret both to be filled and to be hungry, both to abound and to be in need." },
    { v: 13, text: "I can do all things through Christ, who strengthens me." },
  ],
  "Galatians 5": [
    { v: 1, text: "Stand firm therefore in the liberty by which Christ has made us free, and don't be entangled again with a yoke of bondage." },
    { v: 16, text: "But I say, walk by the Spirit, and you won't fulfill the lust of the flesh." },
    { v: 17, text: "For the flesh lusts against the Spirit, and the Spirit against the flesh; and these are contrary to one another, that you may not do the things that you desire." },
    { v: 22, text: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith," },
    { v: 23, text: "gentleness, and self-control. Against such things there is no law." },
    { v: 24, text: "Those who belong to Christ have crucified the flesh with its passions and lusts." },
    { v: 25, text: "If we live by the Spirit, let's also walk by the Spirit." },
  ],
};

export const PASSAGE_THEMES_MAP: Record<
  string,
  {
    themes: string[];
    crossRefs: {
      ref: string;
      book: string;
      chapter: number;
      verseStart?: number;
      verseEnd?: number;
      quote: string;
    }[];
  }
> = {
  "Romans 8": {
    themes: [
      "No Condemnation (v. 1)",
      "Life in the Spirit (vv. 2–11)",
      "Adoption as Heirs (vv. 14–17)",
      "Future Glory & Groaning (vv. 18–25)",
      "More Than Conquerors (vv. 31–39)",
    ],
    crossRefs: [
      {
        ref: "John 3:16–18",
        book: "John",
        chapter: 3,
        verseStart: 16,
        verseEnd: 18,
        quote:
          "For God didn't send his Son into the world to judge the world, but that the world should be saved through him.",
      },
      {
        ref: "Galatians 5:16–25",
        book: "Galatians",
        chapter: 5,
        verseStart: 16,
        verseEnd: 25,
        quote:
          "Walk by the Spirit, and you won't fulfill the lust of the flesh...",
      },
      {
        ref: "Ephesians 2:4–10",
        book: "Ephesians",
        chapter: 2,
        verseStart: 4,
        verseEnd: 10,
        quote:
          "For by grace you have been saved through faith, and that not of yourselves; it is the gift of God...",
      },
    ],
  },
  "Psalms 23": {
    themes: [
      "Divine Provision (v. 1)",
      "Rest & Restoration (vv. 2–3)",
      "Presence in the Valley (v. 4)",
      "Overflowing Banquet (vv. 5–6)",
    ],
    crossRefs: [
      {
        ref: "John 3:16",
        book: "John",
        chapter: 3,
        verseStart: 16,
        verseEnd: 16,
        quote:
          "For God so loved the world, that he gave his one and only Son...",
      },
      {
        ref: "Philippians 4:6–7",
        book: "Philippians",
        chapter: 4,
        verseStart: 6,
        verseEnd: 7,
        quote:
          "And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.",
      },
    ],
  },
};

/**
 * Builds a complete, Scripture-grounded sermon package (Title, Title Suggestions,
 * Big Idea, Intro Illustration, Manuscript, Outline, Scratchpad) directly from any
 * chosen Book, Chapter, and Verse range.
 */
export function buildSermonPackageFromPassage(params: {
  book: string;
  chapter: number;
  version: string;
  verses: VerseItem[];
  mode: HomileticalMode;
  verseStart: number | null;
  verseEnd: number | null;
}): {
  passageTag: string;
  title: string;
  titleSuggestions: string[];
  bigIdea: string;
  introIllustration: string;
  notes: string;
  outline: OutlineSection[];
  scratchpad: string;
} {
  const { book, chapter, version, verses, mode, verseStart, verseEnd } = params;

  const targetVerses =
    verseStart !== null
      ? verses.filter((v) => {
          const end =
            verseEnd !== null && verseEnd >= verseStart ? verseEnd : verseStart;
          return v.v >= verseStart && v.v <= end;
        })
      : verses;

  const effectiveVerses = targetVerses.length > 0 ? targetVerses : verses;
  const firstV = effectiveVerses[0]?.v ?? 1;
  const lastV = effectiveVerses[effectiveVerses.length - 1]?.v ?? firstV;

  const passageTag =
    verseStart !== null
      ? `${book} ${chapter}:${firstV}${lastV > firstV ? `-${lastV}` : ""}`
      : `${book} ${chapter}:1-${lastV}`;

  const firstText = effectiveVerses[0]?.text || "";
  const midVerse =
    effectiveVerses[Math.floor(effectiveVerses.length / 2)] ||
    effectiveVerses[0];
  const lastVerse =
    effectiveVerses[effectiveVerses.length - 1] || effectiveVerses[0];

  // Curated presets for major preaching texts + dynamic verse-driven builder for any passage
  const key = `${book} ${chapter}`;

  if (key === "John 3" && (verseStart === 16 || verseStart === null)) {
    const intro =
      "In 1968, as Apollo 8 rounded the far side of the moon and humanity saw Earth rising as a fragile blue marble against the vast darkness of space, people everywhere asked a timeless question: Does the Creator of this immense cosmos actually care about us? In John 3, in a quiet nighttime conversation on a Jerusalem rooftop with a religious scholar named Nicodemus, Jesus answers that question with a single sentence that has anchored weary souls for two millennia.";
    return {
      passageTag: verseStart ? passageTag : "John 3:16-18",
      title: "The Extravagant Love That Rescues the World",
      titleSuggestions: [
        "The Extravagant Love That Rescues the World",
        "Nighttime Questions, Eternal Answers (John 3)",
        "For God So Loved: The Heart of the Gospel",
        "From Perishing to Everlasting Life",
      ],
      bigIdea:
        "God's love is not a distant sentiment, but a costly rescue mission in which the Father gave His only Son so that whoever believes receives eternal life.",
      introIllustration: intro,
      notes: `<h1>Introduction: The Question in the Dark</h1>
<blockquote class="illustration-box"><strong>Opening Illustration (${passageTag}):</strong> ${intro}</blockquote>
<p>Nicodemus had credentials, morality, and religious authority—yet he came to Jesus by night because religion without new birth leaves the heart in the dark. Look at how Jesus reveals the very heartbeat of God in <strong>${passageTag}</strong>:</p>
<blockquote class="scripture-quote">${book} ${chapter}:${firstV}${
        lastV > firstV ? `-${lastV}` : ""
      } (${version}) — "${effectiveVerses
        .slice(0, 4)
        .map((v) => `(${v.v}) ${v.text}`)
        .join(" ")}"</blockquote>
<span class="cue-badge cue-pause">[PAUSE]</span>
<h1>Point 1: The Measure of Divine Love ("For God So Loved the World")</h1>
<p>In the Greek text, the word <em>houtos</em> ("so") does not merely mean "so much"—it means "in this way." How did God love a rebellious, broken world? He loved us by giving what was most precious to Him.</p>
<blockquote class="illustration-box"><strong>Word Study:</strong> <em>Monogenes</em> ("one and only Son") signifies unique,peerless, and beloved of a kind. The Father held nothing back for our redemption.</blockquote>
<h1>Point 2: The Gift That Replaces Judgment ("That He Gave His Only Son")</h1>
<p>Notice verse 17: God did not send His Son into the world to condemn the world, but that the world might be saved through Him. Religion tries to climb up to God; the Gospel declares that God came down to us.</p>
<h1>Point 3: The Open Door of Faith ("Whoever Believes in Him")</h1>
<p>"Whoever" is the widest word in human language. It excludes no past, no background, and no failure. To believe (<em>pisteuo</em>) is to transfer the full weight of your trust onto Christ alone.</p>
<h1>Conclusion &amp; Invitation</h1>
<p>Step out of the shadows of religious performance tonight and rest in the Father's saving love.</p>
<span class="cue-badge cue-response">[CONGREGATIONAL PRAYER]</span>`,
      outline: [
        {
          name: "Introduction & Opening Illustration",
          minutes: 5,
          notes: "Apollo 8 & Nicodemus's nighttime search for assurance",
        },
        {
          name: "Point 1: The Measure of God's Love (v. 16a)",
          minutes: 8,
          notes: "Houtos & Monogenes — how God loved the world",
        },
        {
          name: "Point 2: Rescue Instead of Condemnation (v. 17)",
          minutes: 8,
          notes: "The Son sent as Savior, not condemning judge",
        },
        {
          name: "Point 3: The Promise to Whoever Believes (v. 16b, 18)",
          minutes: 6,
          notes: "Moving from spiritual death to eternal life",
        },
        {
          name: "Conclusion & Gospel Invitation",
          minutes: 4,
          notes: "Call to personal trust in Christ",
        },
      ],
      scratchpad: `Exegetical Notes on ${passageTag}: Greek 'houtos' (οὕτως) emphasizes the manner and intensity of God's love. 'Monogenes' (μονογενής) highlights the uniqueness of the Son. Contrast with Numbers 21 bronze serpent in v. 14.`,
    };
  }

  if (key === "Psalms 23") {
    const intro =
      "High in the Judean wilderness, narrow limestone ravines—called wadis—cut deep between the cliffs. For most of the year, the sun only touches the floor of those canyons for a few minutes at high noon, earning them the name 'valleys of deep shadow.' A sheep would never enter that canyon on its own—unless it saw the silhouette of its shepherd walking directly ahead of it.";
    return {
      passageTag,
      title: "The Shepherd Who Walks the Valley With Us",
      titleSuggestions: [
        "The Shepherd Who Walks the Valley With Us",
        "No Lack in the Shepherd's Care (Psalm 23)",
        "From Green Pastures to the Overflowing Cup",
        "Presence in the Shadow: Why We Fear No Evil",
      ],
      bigIdea:
        "When we walk through life's darkest valleys, we fear no evil because the Good Shepherd is not watching from a distance—He is walking right beside us.",
      introIllustration: intro,
      notes: `<h1>Introduction: The Canyon of Deep Shadow</h1>
<blockquote class="illustration-box"><strong>Opening Illustration (${passageTag}):</strong> ${intro}</blockquote>
<p>David knew those Judean ravines firsthand, both as a boy tending his father Jesse's flock and as a king hunted by his enemies. Listen to the confession of trust in <strong>${passageTag}</strong>:</p>
<blockquote class="scripture-quote">${passageTag} (${version}) — "${effectiveVerses
        .map((v) => `(${v.v}) ${v.text}`)
        .join(" ")}"</blockquote>
<span class="cue-badge cue-pause">[PAUSE]</span>
<h1>Point 1: The Intimate Provision of the Shepherd (vv. 1-3)</h1>
<p>David begins with the covenant name of God: <em>"Yahweh is MY shepherd; I shall lack nothing."</em> Before we ever reach the dark valley, the Shepherd restores our soul beside quiet waters.</p>
<h1>Point 2: The Shift from "He" to "You" in the Valley (v. 4)</h1>
<p>Notice the remarkable pronoun shift in Psalm 23. In verses 1–3, David talks <em>about</em> God ("He makes me... He leads me"). But the moment he steps into the valley in verse 4, he talks <em>to</em> God: <strong>"For YOU are with me."</strong> Hardship drives us from theology in the third person to intimacy in the second person.</p>
<h1>Point 3: The Banquet Table &amp; The Father's House (vv. 5-6)</h1>
<p>The Hebrew verb for "follow" in verse 6 is <em>radaph</em>—meaning to pursue or chase down! Goodness and covenant mercy are actively pursuing you all the days of your life.</p>
<h1>Conclusion &amp; Pastoral Blessing</h1>
<p>You are not walking through this week alone. Look for the Shepherd's staff right beside you.</p>
<span class="cue-badge cue-response">[CONGREGATIONAL PRAYER]</span>`,
      outline: [
        {
          name: "Introduction: The Judean Ravines",
          minutes: 5,
          notes: "Opening illustration of the wadi and the shepherd's silhouette",
        },
        {
          name: "Point 1: Restoration in Green Pastures (vv. 1-3)",
          minutes: 7,
          notes: "Yahweh Rohi — personal provision and soul restoration",
        },
        {
          name: "Point 2: Intimacy in the Dark Valley (v. 4)",
          minutes: 9,
          notes: "The shift from 'He' to 'You'; rod and staff",
        },
        {
          name: "Point 3: Pursued by Goodness & Hesed (vv. 5-6)",
          minutes: 6,
          notes: "Hebrew 'radaph' — God's mercy chasing His people",
        },
        {
          name: "Conclusion & Benediction",
          minutes: 4,
          notes: "Resting in the Shepherd's presence today",
        },
      ],
      scratchpad: `Exegetical Notes on ${passageTag}: Hebrew 'Yahweh Rohi' (The Lord my Shepherd). In v. 4 'tsalmawet' means deep darkness/shadow of death. In v. 6 'radaph' (רדף) means to pursue with intensity, paired with 'hesed' (covenant love).`,
    };
  }

  if (key === "Matthew 5") {
    const intro =
      "Imagine walking into a jeweler's shop where someone has secretly swapped all the price tags—placing the highest diamond prices on ordinary pebbles and marking priceless royal crown jewels as worth pennies. When Jesus sat down on a Galilean hillside in Matthew 5, He announced that the world has swapped the price tags of human flourishing, and He turned the world's value system upside down.";
    return {
      passageTag,
      title: "The Upside-Down Kingdom: Citizens of Heaven's Joy",
      titleSuggestions: [
        "The Upside-Down Kingdom: Citizens of Heaven's Joy",
        "Blessed Are the Broken: The Beatitudes of Christ",
        "When Jesus Reverses the World's Price Tags (Matthew 5)",
        "Salt of the Earth, Light on the Hill",
      ],
      bigIdea:
        "True spiritual flourishing is found not in self-sufficiency or worldly applause, but in humble dependence on King Jesus and His upside-down Kingdom.",
      introIllustration: intro,
      notes: `<h1>Introduction: The Reversed Price Tags</h1>
<blockquote class="illustration-box"><strong>Opening Illustration (${passageTag}):</strong> ${intro}</blockquote>
<p>In <strong>${passageTag}</strong>, Jesus ascends the mountain as the greater Moses and delivers the manifesto of the Kingdom of Heaven:</p>
<blockquote class="scripture-quote">${passageTag} (${version}) — "${effectiveVerses
        .slice(0, 6)
        .map((v) => `(${v.v}) ${v.text}`)
        .join(" ")}"</blockquote>
<h1>Point 1: Emptied Hands Receive the Kingdom (vv. 3-5)</h1>
<p>To be "poor in spirit" (Greek <em>ptochos</em>) means to recognize our complete spiritual bankruptcy apart from God's grace. Only empty hands can receive the gift of the Kingdom.</p>
<h1>Point 2: A Transformed Appetite &amp; Heart (vv. 6-9)</h1>
<p>As Christ fills the empty heart, He gives us a new hunger for righteousness, a merciful spirit, and the calling of peacemakers who reflect our Father's character.</p>
<h1>Point 3: Visible Witness in a Dark World (vv. 10-16)</h1>
<p>Citizens of this Kingdom do not hide in isolation; they preserve the world like salt and shine like a city set on a hill to the glory of the Father.</p>
<h1>Conclusion</h1>
<p>Bring your poverty of spirit to Jesus today, and receive the riches of His Kingdom.</p>`,
      outline: [
        {
          name: "Introduction: The Reversed Price Tags",
          minutes: 5,
          notes: "Opening illustration of the swapped price tags",
        },
        {
          name: "Point 1: Blessed Are the Spiritually Bankrupt (vv. 3-5)",
          minutes: 8,
          notes: "Greek 'makarios' and 'ptochos'",
        },
        {
          name: "Point 2: Pure Hearts & Peacemakers (vv. 6-9)",
          minutes: 8,
          notes: "Internal transformation flowing into mercy",
        },
        {
          name: "Point 3: Salt and Light in Public Life (vv. 10-16)",
          minutes: 6,
          notes: "Radiating good works that glorify the Father",
        },
        {
          name: "Conclusion & Prayer",
          minutes: 4,
          notes: "Embracing Kingdom values this week",
        },
      ],
      scratchpad: `Exegetical Notes on ${passageTag}: Greek 'makarios' (μακάριος) describes deep covenantal flourishing, not fleeting emotion. 'Ptochos' (πτωχός) denotes one who crouches in total dependence on mercy.`,
    };
  }

  if (key === "Ephesians 2") {
    const intro =
      "A ship's captain can throw a life preserver to a swimmer who is treading water, but a life preserver does no good to someone lying lifeless on the ocean floor. They don't need a swimming lesson; they need resurrection. In Ephesians 2, Paul reminds us that before God's grace reached us, we were not merely spiritually sick—we were spiritually dead, until two words changed everything: 'But God.'";
    return {
      passageTag,
      title: "Two Words That Changed Eternity: 'But God'",
      titleSuggestions: [
        "Two Words That Changed Eternity: 'But God'",
        "By Grace Through Faith: God's Masterpiece (Ephesians 2)",
        "From Dead in Trespasses to Seated with Christ",
        "Saved by Grace, Created for Good Works",
      ],
      bigIdea:
        "Salvation is entirely God's merciful resurrection work from start to finish—rescuing us by grace alone through faith so that our lives become His workmanship.",
      introIllustration: intro,
      notes: `<h1>Introduction: Resurrection, Not Renovation</h1>
<blockquote class="illustration-box"><strong>Opening Illustration (${passageTag}):</strong> ${intro}</blockquote>
<p>Read how the Apostle Paul traces our spiritual biography in <strong>${passageTag}</strong>:</p>
<blockquote class="scripture-quote">${passageTag} (${version}) — "${effectiveVerses
        .map((v) => `(${v.v}) ${v.text}`)
        .join(" ")}"</blockquote>
<h1>Point 1: The Great Hinge of Mercy — "But God" (vv. 4-7)</h1>
<p>Rich in mercy and motivated by His great love, God made us alive together with Christ and raised us up to sit with Him in the heavenly places.</p>
<h1>Point 2: The Gift That Silences All Boasting (vv. 8-9)</h1>
<p>Salvation is not a cooperative project where God provides 90% and we supply 10%. Even faith itself is part of the gift so that no human heart can boast.</p>
<h1>Point 3: God's Poiema — His Living Masterpiece (v. 10)</h1>
<p>The word translated "workmanship" is <em>poiema</em>—from which we get our English word "poem." You are God's handcrafted work of art, designed to walk in good works.</p>
<h1>Conclusion</h1>
<p>Rest in the finished work of grace, and step boldly into the good works God prepared for you.</p>`,
      outline: [
        {
          name: "Introduction: Lifeless on the Ocean Floor",
          minutes: 5,
          notes: "Resurrection vs self-improvement illustration",
        },
        {
          name: "Point 1: 'But God, Being Rich in Mercy' (vv. 4-7)",
          minutes: 8,
          notes: "Co-resurrected and co-seated with Christ",
        },
        {
          name: "Point 2: Grace Alone Through Faith Alone (vv. 8-9)",
          minutes: 8,
          notes: "Eliminating pride and religious boasting",
        },
        {
          name: "Point 3: His Workmanship (Poiema) (v. 10)",
          minutes: 6,
          notes: "Saved not by good works, but for good works",
        },
        {
          name: "Conclusion & Benediction",
          minutes: 4,
          notes: "Gratitude for unmerited grace",
        },
      ],
      scratchpad: `Exegetical Notes on ${passageTag}: Notice the three 'syn-' compound verbs in vv. 5-6: synezoopoiesen (made alive together), synegeiren (raised up together), synekathisen (seated together). In v. 10 'poiema' (ποίημα) means artistic masterpiece.`,
    };
  }

  // Dynamic Scripture-Grounded Builder for ANY Book, Chapter, and Verse Selection
  const intro = `Every week we walk through doors carrying unspoken questions—wondering if God's Word speaks directly to the pressures, hopes, and burdens of our real lives. When we open ${passageTag}, we discover that the living God does not offer us clichés; He meets us with timeless covenant truth: "${firstText}"`;

  const mainTitle =
    verseStart !== null
      ? `Living in the Truth of ${passageTag}`
      : `The Message of ${book} ${chapter}: Anchored in God's Word`;

  const suggestions = [
    mainTitle,
    `Unpacking ${passageTag}: Hearing the Voice of God`,
    `When Scripture Speaks: ${book} ${chapter}${
      verseStart ? `:${firstV}` : ""
    }`,
    `Walking by Faith in ${passageTag}`,
  ];

  const bigIdea = `In ${passageTag}, God calls His people to anchor their hearts in His faithful Word—moving from human striving into obedient trust as we hear: "${firstText.slice(
    0,
    110
  )}${firstText.length > 110 ? "..." : ""}"`;

  const quotedSnippet = effectiveVerses
    .slice(0, 6)
    .map((v) => `(${v.v}) ${v.text}`)
    .join(" ");

  const notes = `<h1>Introduction: Hearing God's Voice in ${passageTag}</h1>
<blockquote class="illustration-box"><strong>Opening Illustration (${passageTag}):</strong> ${intro}</blockquote>
<p>Let us read our primary preaching text together from <strong>${passageTag} (${version})</strong>:</p>
<blockquote class="scripture-quote">${passageTag} (${version}) — "${quotedSnippet}"</blockquote>
<span class="cue-badge cue-pause">[PAUSE]</span>

<h1>Point 1: The Foundation Revealed in the Text (${book} ${chapter}:${firstV})</h1>
<p>Look closely at how this passage opens in verse ${firstV}: <em>"${firstText}"</em></p>
<p>Here the biblical author establishes the foundational reality of who God is and how He addresses His people in their immediate context.</p>

<span class="cue-badge cue-slide">[SLIDE: Key Exegetical Insight — ${passageTag}]</span>
<blockquote class="illustration-box"><strong>Exegetical Focus:</strong> In the flow of ${book} chapter ${chapter}, every clause builds upon God's covenant character, calling the listener from passive hearing to active faith.</blockquote>

<h1>Point 2: The Central Turning Point (${book} ${chapter}:${midVerse.v})</h1>
<p>As the passage progresses to verse ${midVerse.v}, notice the core emphasis:</p>
<blockquote class="scripture-quote">${book} ${chapter}:${midVerse.v} (${version}) — "${midVerse.text}"</blockquote>
<p>When we align our minds with this truth, our perspective shifts from anxious self-reliance to confident dependence on the Lord.</p>

<h1>Point 3: Walking Out the Promise (${book} ${chapter}:${lastVerse.v})</h1>
<p>Finally, look at how our text culminates in verse ${lastVerse.v}: <em>"${lastVerse.text}"</em></p>
<p>This is not merely information to study; it is a summons to transformation in our homes, our church, and our daily witness.</p>

<h1>Conclusion &amp; Pastoral Invitation</h1>
<p>As we respond to <strong>${passageTag}</strong> today, where is the Holy Spirit inviting you to trust Him anew? Let us bring our hearts before the Lord in prayer.</p>
<span class="cue-badge cue-response">[CONGREGATIONAL PRAYER]</span>`;

  const outline: OutlineSection[] = [
    {
      name: `Introduction & Opening Illustration (${passageTag})`,
      minutes: 5,
      notes: `Connecting human tension to the opening declaration of ${book} ${chapter}:${firstV}`,
    },
    {
      name: `Point 1: The Biblical Foundation (v. ${firstV})`,
      minutes: 8,
      notes: `Exposition of "${firstText.slice(0, 65)}..."`,
    },
    {
      name: `Point 2: The Heart of the Passage (v. ${midVerse.v})`,
      minutes: 8,
      notes: `Unpacking the theological center in v. ${midVerse.v}`,
    },
    {
      name: `Point 3: Living the Truth (v. ${lastVerse.v})`,
      minutes: 6,
      notes: `Practical application from v. ${lastVerse.v} (${mode} approach)`,
    },
    {
      name: "Conclusion & Prayer Response",
      minutes: 4,
      notes: `Summarizing the Big Idea of ${passageTag} and calling for response`,
    },
  ];

  const scratchpad = `Study Notes for ${passageTag} (${version}):
• Opening Verse (${book} ${chapter}:${firstV}): "${firstText}"
• Closing Verse (${book} ${chapter}:${lastVerse.v}): "${lastVerse.text}"
• Homiletical Mode: ${mode.toUpperCase()} — Trace how ${passageTag} reveals God's character and points to Christ's redemptive work.`;

  return {
    passageTag,
    title: mainTitle,
    titleSuggestions: suggestions,
    bigIdea,
    introIllustration: intro,
    notes,
    outline,
    scratchpad,
  };
}

export const DEFAULT_SERMONS: SermonDocument[] = [
  {
    id: "sermon-1",
    title: "Life in the Spirit: Freedom from Condemnation",
    titleSuggestions: [
      "Life in the Spirit: Freedom from Condemnation",
      "No Condemnation Now: The Verdict of Grace (Romans 8)",
      "From Slaves of Fear to Heirs of God",
      "Walking According to the Spirit of Life",
    ],
    series: "Unstoppable Grace",
    date: "2026-11-08",
    passageTag: "Romans 8:1-17",
    homileticalMode: "expository",
    topicalRefs: ["Romans 8:1", "Galatians 5:16", "Ephesians 2:8"],
    bigIdea:
      "Because of Christ's sacrifice, believers are free from the crushing weight of condemnation and empowered by the Spirit to live as God's beloved children.",
    notes: `<h1>Introduction: The Weight of Condemnation</h1>
<blockquote class="illustration-box"><strong>Opening Illustration (Romans 8:1-17):</strong> In ancient Roman courts, when a prisoner was acquitted of all charges, the magistrate would shatter the wooden tablet bearing the indictment so it could never be brought against the accused again. Yet many believers still walk around trying to glue the fragments of their old guilt back together. In Romans 8, the Apostle Paul declares that in Christ Jesus, the tablet of condemnation has been shattered forever.</blockquote>
<p>In our modern world, we are told constantly to perform, produce, and validate ourselves. But in Romans 8, the Apostle Paul issues a declaration that tears the roof off religious performance.</p>

<blockquote class="scripture-quote">Romans 8:1 (WEB) — "There is therefore now no condemnation to those who are in Christ Jesus, who don't walk according to the flesh, but according to the Spirit."</blockquote>

<span class="cue-badge cue-pause">[PAUSE]</span>
<p>Notice the timing of that verse: Not "there will one day be no condemnation when you finally get your act together." The word is <strong>NOW</strong>.</p>

<span class="cue-badge cue-slide">[SLIDE: Greek Word Study - Katakrima]</span>
<blockquote class="illustration-box"><strong>Word Study:</strong> The Greek word for condemnation is <em>katakrima</em>. It refers to the punitive penalty following a guilty verdict. Paul is telling us the gavel has dropped, and the sentence has already been absorbed by Jesus!</blockquote>

<h1>Point 1: The Law of Life Has Set You Free (vv. 2-4)</h1>
<p>Religion says: <em>"If you obey, God will love you."</em><br>The Gospel says: <em>"God loves you in Christ, therefore you can walk in freedom."</em></p>
<p>Paul contrasts two laws: the law of sin and death (like the law of gravity pulling us downward), and the law of the Spirit of life (like aerodynamics lifting an aircraft into the sky).</p>

<h1>Point 2: Two Ways to Set Your Mind (vv. 5-8)</h1>
<p>What captures your thoughts when your mind is in neutral? Paul tells us that setting the mind on the flesh produces spiritual death and chronic anxiety, but setting the mind on the Spirit yields life and peace.</p>

<blockquote class="scripture-quote">Romans 8:6 (WEB) — "For the mind of the flesh is death, but the mind of the Spirit is life and peace;"</blockquote>

<h1>Point 3: From Slaves to Heirs (vv. 14-17)</h1>
<p>We are not employees trying to earn our supervisor's approval. We are sons and daughters who have been given the Spirit of adoption!</p>

<blockquote class="scripture-quote">Romans 8:15 (WEB) — "For you didn't receive the spirit of bondage again to fear, but you received the Spirit of adoption, by whom we cry, 'Abba! Father!'"</blockquote>

<span class="cue-badge cue-slide">[SLIDE: Roman Adoption Custom]</span>
<p>In the first-century Greco-Roman world, an adopted child was wiped completely clean of past debts. All legal claims against them were canceled forever.</p>

<h1>Conclusion &amp; Invitation</h1>
<p>Whatever guilt you brought into this room today, lay it at the foot of the Cross. Hear the Father's voice saying: <em>"You are mine. You are forgiven. Walk in the Spirit."</em></p>
<span class="cue-badge cue-response">[CONGREGATIONAL PRAYER]</span>`,
    outline: [
      { name: "Hook / Opening Illustration", minutes: 4, notes: "The shattered Roman indictment tablet & religious guilt" },
      { name: "Context & Passage Reading", minutes: 3, notes: "Romans 8:1-4 declaration of freedom" },
      { name: "Point 1: Condemnation Canceled", minutes: 7, notes: "Katakrima explained; Christ absorbed our penalty" },
      { name: "Point 2: The Mindset of Peace", minutes: 6, notes: "Flesh vs Spirit mindset; managing mental focus" },
      { name: "Point 3: Adopted into the Family", minutes: 5, notes: "Abba Father; Roman adoption heritage" },
      { name: "Invitation & Final Prayer", minutes: 4, notes: "Call to surrender guilt; closing blessing" },
    ],
    scratchpad:
      "Historical context: Nero was ruling in Rome; Jewish-Gentile tensions in the Roman house churches. The Greek term 'katakrima' (κατάκριμα) is a forensic legal term signifying the execution of a sentence following a verdict.",
  },
  {
    id: "sermon-2",
    title: "The Good Shepherd in the Valley",
    titleSuggestions: [
      "The Good Shepherd in the Valley",
      "The Shepherd Who Walks the Valley With Us",
      "No Lack in the Shepherd's Care (Psalm 23)",
      "Presence in the Shadow: Why We Fear No Evil",
    ],
    series: "Psalms of Comfort",
    date: "2026-11-15",
    passageTag: "Psalms 23:1-6",
    homileticalMode: "textual",
    topicalRefs: ["Psalms 23:1", "John 3:16", "Philippians 4:6"],
    bigIdea:
      "When we walk through life's darkest valleys, we fear no evil because the Shepherd is not watching from afar—He is walking beside us.",
    notes: `<h1>Introduction: Our Need for a Guide</h1>
<blockquote class="illustration-box"><strong>Opening Illustration (Psalms 23:1-6):</strong> High in the Judean wilderness, narrow limestone ravines—called wadis—cut deep between the cliffs. A sheep would never enter that dark canyon on its own—unless it saw the silhouette of its shepherd walking directly ahead of it.</blockquote>
<p>Every person in this room has either just walked through a dark valley, is currently in one, or will soon enter one. But Psalm 23 is not a funeral dirge; it is a warrior's song of divine presence.</p>

<blockquote class="scripture-quote">Psalms 23:1-2 (WEB) — "Yahweh is my shepherd: I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters."</blockquote>

<h1>Point 1: The Personal Shepherd</h1>
<p>David does not say "The Lord is <em>a</em> shepherd" or "The Lord is <em>Israel's</em> shepherd." He says: <strong>"The Lord is MY shepherd."</strong> It is deeply intimate.</p>

<h1>Point 2: Presence in the Shadow</h1>
<blockquote class="scripture-quote">Psalms 23:4 (WEB) — "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me."</blockquote>
<p>Notice the grammatical shift in verse 4: In verses 1-3, David speaks <em>about</em> God ("He makes me... He leads me..."). But when the valley gets dark in verse 4, David starts speaking <em>to</em> God: <strong>"For YOU are with me."</strong></p>

<h1>Conclusion: The Cup that Overflows</h1>
<p>He prepares a banquet right in the sight of adversaries. God's grace doesn't just meet our minimum need; it overflows our cup.</p>`,
    outline: [
      { name: "Introduction & Opening Illustration", minutes: 4, notes: "Judean wadis and the universality of valleys" },
      { name: "Point 1: The Shepherd's Care", minutes: 8, notes: "Green pastures, quiet waters" },
      { name: "Point 2: The Valley Shift", minutes: 10, notes: "From 'He' to 'You' in verse 4" },
      { name: "Conclusion & Benediction", minutes: 6, notes: "The overflowing cup" },
    ],
    scratchpad:
      "David's shepherd background in Bethlehem. The rod (shebet) was for defense against predators; the staff (mish'eneth) was for guiding and rescuing wandering sheep.",
  },
  {
    id: "sermon-3",
    title: "Overcoming Anxiety: The Peace of God",
    titleSuggestions: [
      "Overcoming Anxiety: The Peace of God",
      "The Garrison Around the Anxious Heart (Philippians 4:6-7)",
      "Trading Worry for Thankful Prayer",
      "Peace That Surpasses All Understanding",
    ],
    series: "Healthy Soul",
    date: "2026-11-22",
    passageTag: "Philippians 4:6-7",
    homileticalMode: "topical",
    topicalRefs: ["Philippians 4:6", "Matthew 5:3", "Psalms 23:4", "Romans 8:28"],
    bigIdea:
      "Biblical peace is not the absence of trouble, but the presence of God transforming our anxiety into prayerful trust.",
    notes: `<h1>Introduction: The Epidemic of Anxiety</h1>
<blockquote class="illustration-box"><strong>Opening Illustration (Philippians 4:6-7):</strong> Remarkably, the most famous verses in the New Testament about overcoming anxiety were not written from a peaceful Mediterranean beach resort—they were written by the Apostle Paul while chained to a Roman Praetorian guard awaiting trial before Nero.</blockquote>
<p>We live in the most connected, yet most anxious generation in human history. Financial pressures, family burdens, and health uncertainties constantly threaten to rob our peace.</p>

<h1>Point 1: The Antidote of Thankful Prayer (Philippians 4:6-7)</h1>
<blockquote class="scripture-quote">Philippians 4:6-7 (WEB) — "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus."</blockquote>
<span class="cue-badge cue-pause">[PAUSE 3s]</span>
<p>Gratitude recalibrates our perspective. When we thank God for past faithfulness, we gain confidence for present trials.</p>

<h1>Point 2: The Garrison Around the Heart</h1>
<p>The Greek term <em>phroureo</em> ("will guard") is a military term describing a Roman garrison stationed around a city to keep out hostile invaders. God's peace stands sentry at the door of your mind.</p>

<h1>Conclusion &amp; Ministry Time</h1>
<p>Take whatever anxiety you brought through those doors, place it in the hands of Jesus, and receive His peace.</p>`,
    outline: [
      { name: "Introduction & Opening Illustration", minutes: 5, notes: "Paul writing from Roman chains; cultural anxiety" },
      { name: "Point 1: Prayer with Thanksgiving (Phil 4:6)", minutes: 8, notes: "Replacing worry with specific petition" },
      { name: "Point 2: The Garrison of Peace (Phil 4:7)", minutes: 9, notes: "Phroureo — military guard over heart and mind" },
      { name: "Conclusion & Prayer Ministry", minutes: 6, notes: "Altar call and prayer for anxious hearts" },
    ],
    scratchpad:
      "Topical connections: Paul writes Philippians from Roman imprisonment. Key Greek terms: 'merimnao' (anxious/divided mind) vs 'phroureo' (military garrison guard).",
  },
];

export function getSampleRawNotesForPassage(
  passageTag: string,
  bigIdea?: string
): string {
  return `Unstructured Sermon Brainstorm & Study Notes for ${passageTag}:

- Main thought / burden for the church: ${
    bigIdea ||
    `Many people in our congregation know the words of ${passageTag}, but when pressure hits on Monday morning, they live as if they are on their own.`
  }
- Application idea for the end: Invite people to lay down one specific burden or fear they brought into the sanctuary today. Practical challenge for this week: memorize the anchor verse and pray it every morning.
- Opening hook / story idea: Think about the difference between reading a map from afar vs walking with a guide who knows every turn of the road. Or a courtroom verdict where the judge bangs the gavel and declares the debt paid in full.
- Verse observation 1: Look closely at the opening words of ${passageTag}. Notice the certainty and authority in the text—it's not wishful thinking, it's a covenant promise anchored in God's character.
- Theological tension / Fallen Condition: Why do we still struggle with doubt, guilt, or restlessness if God has spoken so clearly? Because we look at our circumstances more than we look at Christ.
- Verse observation 2 (Middle of passage): There is a clear contrast here between striving in our own human strength vs resting in what the Lord has accomplished and promised.
- Cross-reference / Gospel connection: Connect this directly to Jesus' finished work on the cross and the indwelling presence of the Holy Spirit.
- Key takeaway phrase to repeat from the pulpit: "God's promise in ${passageTag} is stronger than the pressure in front of you."`;
}

export function organizeRawNotesLocally(params: {
  rawNotes: string;
  passageTag: string;
  mode: HomileticalMode;
  framework: NotesOrganizationFramework;
  currentBigIdea?: string;
}): {
  suggestedTitle: string;
  suggestedBigIdea: string;
  sections: OrganizedNoteSection[];
} {
  const { rawNotes, passageTag, framework, currentBigIdea } = params;

  // Split user's raw notes into non-empty lines/paragraphs
  const lines = rawNotes
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((l) => l.length > 8);

  const introLines: string[] = [];
  const contextLines: string[] = [];
  const mainPoint1Lines: string[] = [];
  const mainPoint2Lines: string[] = [];
  const applicationLines: string[] = [];

  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if (/^(unstructured|raw notes|sermon notes)/i.test(line) && line.endsWith(":")) {
      return;
    }
    if (
      lower.includes("intro") ||
      lower.includes("hook") ||
      lower.includes("story") ||
      lower.includes("illustration") ||
      lower.includes("opening")
    ) {
      introLines.push(line);
    } else if (
      lower.includes("application") ||
      lower.includes("conclusion") ||
      lower.includes("challenge") ||
      lower.includes("invite") ||
      lower.includes("takeaway") ||
      lower.includes("monday")
    ) {
      applicationLines.push(line);
    } else if (
      lower.includes("tension") ||
      lower.includes("context") ||
      lower.includes("burden") ||
      lower.includes("struggle") ||
      lower.includes("problem")
    ) {
      contextLines.push(line);
    } else if (idx % 2 === 0) {
      mainPoint1Lines.push(line);
    } else {
      mainPoint2Lines.push(line);
    }
  });

  // Ensure every bucket has meaningful content from the user's input
  const fallbackPool = lines.filter(
    (l) => !/^(unstructured|raw notes)/i.test(l)
  );
  if (introLines.length === 0 && fallbackPool[0]) {
    introLines.push(fallbackPool[0]);
  }
  if (contextLines.length === 0 && fallbackPool[1]) {
    contextLines.push(fallbackPool[1]);
  }
  if (mainPoint1Lines.length === 0 && fallbackPool[2]) {
    mainPoint1Lines.push(fallbackPool[2]);
  }
  if (mainPoint2Lines.length === 0 && fallbackPool[3]) {
    mainPoint2Lines.push(fallbackPool[3]);
  }
  if (applicationLines.length === 0 && fallbackPool[fallbackPool.length - 1]) {
    applicationLines.push(fallbackPool[fallbackPool.length - 1]);
  }

  const labels =
    framework === "problem-gospel-response"
      ? {
          s1Cat: "1. Opening Hook & Human Tension",
          s1Head: `The Burden We Carry (${passageTag})`,
          s2Cat: "2. Exegetical Observation",
          s2Head: `What ${passageTag} Confronts and Reveals`,
          s3Cat: "3. Gospel Resolution",
          s3Head: `The Grace of Christ in ${passageTag}`,
          s4Cat: "4. Transformational Response",
          s4Head: "Living Out the Text This Week",
        }
      : framework === "classic-three-point"
      ? {
          s1Cat: "Introduction & Illustration",
          s1Head: `Setting the Stage for ${passageTag}`,
          s2Cat: "Point I: The Foundation in the Text",
          s2Head: `The Anchor Truth of ${passageTag}`,
          s3Cat: "Point II & III: Theological Depth & Christ Connection",
          s3Head: "From Human Striving to Covenant Assurance",
          s4Cat: "Conclusion & Pastoral Charge",
          s4Head: "Bringing the Truth Home",
        }
      : {
          s1Cat: "Movement 1: Introduction & Opening Hook",
          s1Head: `Stepping into the World of ${passageTag}`,
          s2Cat: "Movement 2: Exegetical Foundation",
          s2Head: `Unpacking the Opening Declaration (${passageTag})`,
          s3Cat: "Movement 3: Theological Climax",
          s3Head: `The Gospel Heart of ${passageTag}`,
          s4Cat: "Movement 4: Pastoral Application & Benediction",
          s4Head: `Walking in the Reality of ${passageTag}`,
        };

  const suggestedBigIdea =
    currentBigIdea ||
    contextLines[0] ||
    `Because God speaks with covenant faithfulness in ${passageTag}, we can move from anxious striving into confident obedience.`;

  const sections: OrganizedNoteSection[] = [
    {
      id: "org-sec-1",
      category: labels.s1Cat,
      heading: labels.s1Head,
      scriptureConnection: `Introduces the central pastoral tension addressed by ${passageTag}`,
      organizedContent:
        [...introLines, ...contextLines.slice(0, 1)].join(" ") ||
        `Begin by connecting with the congregation's lived experience before turning to ${passageTag}.`,
      keyBullets:
        introLines.length > 0
          ? introLines
          : [`Open with a relatable hook bridging into ${passageTag}`],
      transitionToNext: `With that question in our minds, let's open our Bibles to ${passageTag} and hear how God's Word answers us.`,
      estimatedMinutes: 5,
    },
    {
      id: "org-sec-2",
      category: labels.s2Cat,
      heading: labels.s2Head,
      scriptureConnection: `Primary observation from the opening verses of ${passageTag}`,
      organizedContent:
        [...mainPoint1Lines, ...contextLines.slice(1)].join(" ") ||
        `Walk verse-by-verse through the primary declaration of ${passageTag}, highlighting the author's original emphasis.`,
      keyBullets:
        mainPoint1Lines.length > 0
          ? mainPoint1Lines
          : [`Observe the authority and covenant promise in ${passageTag}`],
      transitionToNext: `Yet the passage doesn't stop with diagnosis—it leads us directly to the heart of God's grace.`,
      estimatedMinutes: 9,
    },
    {
      id: "org-sec-3",
      category: labels.s3Cat,
      heading: labels.s3Head,
      scriptureConnection: `Core theological movement and Christ-centered fulfillment in ${passageTag}`,
      organizedContent:
        mainPoint2Lines.join(" ") ||
        `Show how the promises of ${passageTag} find their ultimate yes and amen in the person and finished work of Jesus Christ.`,
      keyBullets:
        mainPoint2Lines.length > 0
          ? mainPoint2Lines
          : [`Connect ${passageTag} to the finished work of Christ`],
      transitionToNext: `If this is true in Christ, what does it look like in our homes, workplaces, and prayers this week?`,
      estimatedMinutes: 9,
    },
    {
      id: "org-sec-4",
      category: labels.s4Cat,
      heading: labels.s4Head,
      scriptureConnection: `Practical obedience and congregational response to ${passageTag}`,
      organizedContent:
        applicationLines.join(" ") ||
        `Call the congregation to a specific, tangible response of faith and prayer rooted in ${passageTag}.`,
      keyBullets:
        applicationLines.length > 0
          ? applicationLines
          : [`Invite concrete response and close in pastoral prayer`],
      transitionToNext: `Close in prayer and benediction.`,
      estimatedMinutes: 6,
    },
  ];

  return {
    suggestedTitle: `Anchored in the Word (${passageTag})`,
    suggestedBigIdea,
    sections,
  };
}

export function buildScholarlyCommentariesForPassage(params: {
  book: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  verses: VerseItem[];
}): CommentaryExcerpt[] {
  const { book, chapter, verseStart, verseEnd, verses } = params;
  const targetVerses =
    verseStart !== null
      ? verses.filter(
          (v) =>
            v.v >= verseStart &&
            v.v <= (verseEnd && verseEnd >= verseStart ? verseEnd : verseStart)
        )
      : verses;
  const activeList = targetVerses.length > 0 ? targetVerses : verses;
  const firstV = activeList[0] || {
    v: verseStart || 1,
    text: `The covenant declaration of ${book} ${chapter}.`,
  };
  const midV =
    activeList[Math.floor(activeList.length / 2)] ||
    activeList[0] ||
    firstV;
  const lastV = activeList[activeList.length - 1] || firstV;

  const refBadge =
    verseStart !== null
      ? `${book} ${chapter}:${verseStart}${
          verseEnd && verseEnd > verseStart ? `-${verseEnd}` : ""
        }`
      : `${book} ${chapter}`;

  // Special curated scholarly excerpts for Romans 8, John 3, Psalms 23, Philippians 4, Genesis 1, Matthew 5, Ephesians 2, or dynamic passage-specific scholarly synthesis
  if (book === "Romans" && chapter === 8) {
    return [
      {
        id: `comm-${refBadge}-1`,
        lens: "Exegetical & Lexical",
        scholarOrTradition: "Pauline Grammatical-Historical Exegesis (Cranfield / Moo)",
        verseFocus: `${book} ${chapter}:${firstV.v}`,
        thesis: "Forensic 'No Condemnation' as Eschatological Verdict",
        excerpt: `The opening 'Therefore now' (ἄρα νῦν, ara nyn) marks a decisive redemptive-historical transition from the struggle under the Law in Romans 7 to the new era of the Spirit in Christ Jesus. The compound noun katakrima ('condemnation') denotes not merely judicial displeasure, but the penal sentence and execution of judgment—now permanently annulled for all who are united to Christ.`,
        lexicalOrContextNote: `Greek: κατάκριμα (katakrima) — forensic verdict of guilt and penalty; ἐν Χριστῷ Ἰησοῦ (en Christō Iēsou) — covenantal union sphere.`,
      },
      {
        id: `comm-${refBadge}-2`,
        lens: "Historical-Cultural",
        scholarOrTradition: "First-Century Greco-Roman Legal & Adoption Context",
        verseFocus: `${book} ${chapter}:${midV.v}`,
        thesis: "Roman Adoption (Huiothesia) and Inheritance Rights",
        excerpt: `In first-century Roman law, adoption (huiothesia) conferred upon the adopted son the full, irrevocable legal standing of a natural-born heir, erasing all prior debts associated with his former status. Paul pairs this legal metaphor with the intimate Aramaic cry 'Abba' (Father), uniting highest courtroom privilege with familial intimacy.`,
        lexicalOrContextNote: `Socio-Legal Context: Roman patria potestas and inheritance law contrasted with the Spirit of slavery (pneuma douleias).`,
      },
      {
        id: `comm-${refBadge}-3`,
        lens: "Historical Theology",
        scholarOrTradition: "Reformation & Patristic Consensus (Chrysostom / Calvin)",
        verseFocus: `${book} ${chapter}:${firstV.v}–${lastV.v}`,
        thesis: "The Trinitarian Architecture of Assurance",
        excerpt: `John Chrysostom observed that Paul weaves the work of Father, Son, and Holy Spirit into a single unbreakable cord: the Father sends His own Son in the likeness of sinful flesh, the Son condemns sin at the cross, and the indwelling Spirit vivifies the believer so that the righteous requirement of the Law is fulfilled in us.`,
        lexicalOrContextNote: `Dogmatic Locus: Union with Christ, Justification, and Definitive Sanctification by the Spirit.`,
      },
      {
        id: `comm-${refBadge}-4`,
        lens: "Pastoral & Christological",
        scholarOrTradition: "Redemptive-Historical Homiletics (Chapell / Stott)",
        verseFocus: refBadge,
        thesis: "Preaching Assurance Without Antinomianism or Legalism",
        excerpt: `Notice how "${firstV.text.slice(
          0,
          90
        )}..." grounds holiness in security rather than fear. Believers mortify the deeds of the body not in order to earn sonship, but because the Spirit already bears witness that they are children and co-heirs with Christ.`,
        lexicalOrContextNote: `Homiletical Takeaway: Move the congregation from self-reliant striving to Spirit-empowered assurance.`,
      },
    ];
  }

  return [
    {
      id: `comm-${refBadge}-1`,
      lens: "Exegetical & Lexical",
      scholarOrTradition: `Grammatical-Historical Exegesis (${book})`,
      verseFocus: `${book} ${chapter}:${firstV.v}`,
      thesis: `Structural Anchor & Literary Emphasis in ${book} ${chapter}:${firstV.v}`,
      excerpt: `The opening declaration of ${book} ${chapter}:${firstV.v} ("${firstV.text.slice(
        0,
        110
      )}${firstV.text.length > 110 ? "..." : ""}") establishes the governing theological premise of the pericope. The syntax foregrounds divine initiative and covenantal authority, framing every subsequent imperative in the passage within God's prior redemptive action.`,
      lexicalOrContextNote: `Literary Function: Primary propositional anchor governing the discourse unit of ${refBadge}.`,
    },
    {
      id: `comm-${refBadge}-2`,
      lens: "Historical-Cultural",
      scholarOrTradition: "Ancient Near Eastern / Greco-Roman Background",
      verseFocus: `${book} ${chapter}:${midV.v}`,
      thesis: `Historical Setting & Original Audience Reception of ${refBadge}`,
      excerpt: `For the original hearers of ${book}, the imagery in verse ${
        midV.v
      } ("${midV.text.slice(0, 100)}${
        midV.text.length > 100 ? "..." : ""
      }") directly addressed their concrete social and spiritual vulnerabilities. Rather than offering abstract philosophy, the sacred author grounds hope in God's publicly witnessed faithfulness in history.`,
      lexicalOrContextNote: `Historical-Cultural Lens: Contrasts biblical covenant fidelity with surrounding cultural anxieties.`,
    },
    {
      id: `comm-${refBadge}-3`,
      lens: "Historical Theology",
      scholarOrTradition: "Classic Patristic & Reformation Exposition",
      verseFocus: `${book} ${chapter}:${lastV.v}`,
      thesis: `Canonical Synthesis & Classic Witness on ${refBadge}`,
      excerpt: `Across the history of interpretation, commentators on ${refBadge} have emphasized that verse ${
        lastV.v
      } ("${lastV.text.slice(0, 100)}${
        lastV.text.length > 100 ? "..." : ""
      }") guards the church against both presumption and despair—directing the believer's gaze away from fluctuating inward feelings toward the objective promise of God's Word.`,
      lexicalOrContextNote: `Canonical Analogy of Faith: Read in harmony with the broader covenantal witness of Scripture.`,
    },
    {
      id: `comm-${refBadge}-4`,
      lens: "Pastoral & Christological",
      scholarOrTradition: "Christ-Centered Homiletical Commentary",
      verseFocus: refBadge,
      thesis: `Christological Fulfillment & Pulpit Application of ${refBadge}`,
      excerpt: `In preaching ${refBadge}, the pastor must bridge the text's Fallen Condition Focus to its fulfillment in Jesus Christ. Every promise and ethical summons in ${book} ${chapter} finds its power in Christ's finished work and the Spirit's renewing presence in the gathered church.`,
      lexicalOrContextNote: `Preaching Bridge: Connects exegetical observation directly to congregational transformation.`,
    },
  ];
}

export function searchScriptureContextByTopic(
  topic: string,
  currentPassageTag: string = "Romans 8:1-17"
): ContextSearchPassage[] {
  const cleanTopic = (topic || "grace").trim();
  const lower = cleanTopic.toLowerCase();

  if (lower.includes("suffer") || lower.includes("trial") || lower.includes("pain") || lower.includes("grief")) {
    return [
      {
        id: "ctx-suffering-1",
        reference: "Romans 8:18",
        book: "Romans",
        chapter: 8,
        verseStart: 18,
        verseEnd: 18,
        quote:
          "For I consider that the sufferings of this present time are not worthy to be compared with the glory which will be revealed toward us.",
        thematicConnection: `Directly bridges ${currentPassageTag} to eschatological hope—framing present affliction against the weight of future glory.`,
        testamentOrGenre: "Pauline Epistle",
      },
      {
        id: "ctx-suffering-2",
        reference: "2 Corinthians 12:9–10",
        book: "2 Corinthians",
        chapter: 12,
        verseStart: 9,
        verseEnd: 10,
        quote:
          "He has said to me, 'My grace is sufficient for you, for my power is made perfect in weakness.'",
        thematicConnection: `Demonstrates how Christ's sustaining grace meets the believer inside the thorn of suffering rather than merely removing it.`,
        testamentOrGenre: "Pauline Epistle",
      },
      {
        id: "ctx-suffering-3",
        reference: "1 Peter 1:6–7",
        book: "1 Peter",
        chapter: 1,
        verseStart: 6,
        verseEnd: 7,
        quote:
          "Wherein you greatly rejoice, though now for a little while, if need be, you have been put to grief in various trials, that the proof of your faith... may be found to result in praise, glory, and honor at the revelation of Jesus Christ.",
        thematicConnection: `Illustrates the refining purpose of trials—purifying faith like gold rather than destroying the believer.`,
        testamentOrGenre: "General Epistle",
      },
      {
        id: "ctx-suffering-4",
        reference: "Psalms 23:4",
        book: "Psalms",
        chapter: 23,
        verseStart: 4,
        verseEnd: 4,
        quote:
          "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me.",
        thematicConnection: `Grounds the sermon's theme of "${cleanTopic}" in the Shepherd's personal presence amid the darkest valleys.`,
        testamentOrGenre: "Wisdom & Psalms",
      },
    ];
  }

  if (lower.includes("grace") || lower.includes("mercy") || lower.includes("forgiv") || lower.includes("salvation")) {
    return [
      {
        id: "ctx-grace-1",
        reference: "Ephesians 2:8–10",
        book: "Ephesians",
        chapter: 2,
        verseStart: 8,
        verseEnd: 10,
        quote:
          "For by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works, that no one would boast.",
        thematicConnection: `Reinforces ${currentPassageTag} by showing that salvation from first to last is God's unmerited gift that produces new obedience.`,
        testamentOrGenre: "Pauline Epistle",
      },
      {
        id: "ctx-grace-2",
        reference: "Romans 8:1–2",
        book: "Romans",
        chapter: 8,
        verseStart: 1,
        verseEnd: 2,
        quote:
          "There is therefore now no condemnation to those who are in Christ Jesus... For the law of the Spirit of life in Christ Jesus made me free from the law of sin and of death.",
        thematicConnection: `Anchors the theme of "${cleanTopic}" in the courtroom verdict of justification and liberation by the Spirit.`,
        testamentOrGenre: "Pauline Epistle",
      },
      {
        id: "ctx-grace-3",
        reference: "Titus 2:11–12",
        book: "Titus",
        chapter: 2,
        verseStart: 11,
        verseEnd: 12,
        quote:
          "For the grace of God has appeared, bringing salvation to all men, instructing us to the intent that, denying ungodliness and worldly lusts, we would live soberly, righteously, and godly in this present world.",
        thematicConnection: `Shows that sovereign grace both pardons guilt and pedagogically trains the believer in holy living.`,
        testamentOrGenre: "Pastoral Epistle",
      },
      {
        id: "ctx-grace-4",
        reference: "Hebrews 4:16",
        book: "Hebrews",
        chapter: 4,
        verseStart: 16,
        verseEnd: 16,
        quote:
          "Let's therefore draw near with boldness to the throne of grace, that we may receive mercy, and may find grace for help in time of need.",
        thematicConnection: `Provides a pastoral invitation for the conclusion of your sermon on ${currentPassageTag}.`,
        testamentOrGenre: "Epistle",
      },
    ];
  }

  return [
    {
      id: `ctx-${Date.now()}-1`,
      reference: "Romans 8:28",
      book: "Romans",
      chapter: 8,
      verseStart: 28,
      verseEnd: 28,
      quote:
        "We know that all things work together for good for those who love God, to those who are called according to his purpose.",
      thematicConnection: `Connects the theme of "${cleanTopic}" to God's sovereign, covenantal purpose alongside ${currentPassageTag}.`,
      testamentOrGenre: "Pauline Epistle",
    },
    {
      id: `ctx-${Date.now()}-2`,
      reference: "John 3:16–17",
      book: "John",
      chapter: 3,
      verseStart: 16,
      verseEnd: 17,
      quote:
        "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.",
      thematicConnection: `Centers the theme of "${cleanTopic}" in the Father's redemptive mission and the gift of the Son.`,
      testamentOrGenre: "Gospel Narrative",
    },
    {
      id: `ctx-${Date.now()}-3`,
      reference: "Philippians 4:6–7",
      book: "Philippians",
      chapter: 4,
      verseStart: 6,
      verseEnd: 7,
      quote:
        "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.",
      thematicConnection: `Applies "${cleanTopic}" to the believer's inner life of prayer, gratitude, and Christ's guarding peace.`,
      testamentOrGenre: "Pauline Epistle",
    },
    {
      id: `ctx-${Date.now()}-4`,
      reference: "Psalms 23:1–4",
      book: "Psalms",
      chapter: 23,
      verseStart: 1,
      verseEnd: 4,
      quote:
        "Yahweh is my shepherd: I shall lack nothing. He makes me lie down in green pastures. He leads me beside still waters. He restores my soul.",
      thematicConnection: `Provides Old Testament covenantal imagery illuminating "${cleanTopic}" in connection with ${currentPassageTag}.`,
      testamentOrGenre: "Wisdom & Psalms",
    },
  ];
}



