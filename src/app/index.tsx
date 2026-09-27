import React, { useEffect, useRef, useState } from "react";

import {
    ActivityIndicator,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */

const T = {
    bg: "#0B1120",
    surface: "#151E33",
    surfaceHi: "#1C2942",
    line: "#2A3A5C",
    lineSoft: "#22304D",

    text: "#F1F5F9",
    body: "#C3CEDF",
    muted: "#8496B2",

    violet: "#A855F7",
    violetSoft: "#C7A0FB",
    violetDim: "rgba(168,85,247,0.14)",

    sky: "#38BDF8",
    skyDim: "rgba(56,189,248,0.14)",

    mint: "#34D399",
    mintDim: "rgba(52,211,153,0.14)",

    amber: "#FBBF24",
    amberDim: "rgba(251,191,36,0.14)",

    danger: "#FB7185",
    dangerDim: "rgba(251,113,133,0.16)"
};

type Screen = "home" | "chat" | "breathing" | "learn" | "faq" | "profile";

type BreathMethod =
    | "Box Breathing"
    | "Calm Breathing"
    | "Equal Breathing"
    | "4-7-8 Breathing";

type ChatMessage = {
    role: "user" | "bot";
    text: string;
    failed?: boolean;
};

/* ------------------------------------------------------------------ */
/* Static content                                                      */
/* ------------------------------------------------------------------ */

/*
 * Gemini API access.
 *
 * Note: any key placed here is visible to anyone who inspects the app
 * bundle. That's an acceptable tradeoff for a personal project tested
 * through Expo Go on your own devices, but if this app were ever
 * published, the key should instead live behind a small backend that
 * calls Gemini on the app's behalf.
 */
const GEMINI_API_KEY = "AIzaSyATZPcLERDIwSrwNW0nsDn3JKnA4X86LKE";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const API_READY = !GEMINI_API_KEY.startsWith("PASTE_");

const SYSTEM_INSTRUCTION =
    "You are the assistant inside CyberQuest, an app that teaches teenagers " +
    "and young adults (ages 15-20) about online safety and cybersecurity. " +
    "Answer questions about phishing, scams, passwords, privacy and general " +
    "online safety in a clear, friendly, practical way. Keep answers short " +
    "(a few sentences to a short paragraph) unless the user asks for more " +
    "detail. If a question is unrelated to cybersecurity or online safety, " +
    "gently steer the conversation back to that topic.";

const BOX_SIZE = 236;
const DOT_SIZE = 18;
const TRAVEL = BOX_SIZE - DOT_SIZE - 8;

const quizQuestions = [
    {
        question:
            "A message says your account will be deleted in 24 hours unless you click a link and confirm your password. What is the safest thing to do?",
        options: [
            "Click the link and confirm the account straight away",
            "Reply to the message and ask if it is genuine",
            "Open the official app or site yourself and check the account",
            "Forward it to friends and ask what they think"
        ],
        answer: 2,
        note: "Urgency is the pressure tactic. Reaching the account through a route you already trust removes the link from the picture."
    },
    {
        question:
            "A site looks identical to your bank, but the web address has one extra letter. Why does that matter?",
        options: [
            "It has a login page",
            "The domain is not the bank's real domain",
            "It shows a padlock symbol",
            "It asks for a username"
        ],
        answer: 1,
        note: "Look-alike domains are the whole trick. A padlock only means the connection is encrypted, not that the site is honest."
    },
    {
        question:
            "A friend messages you a file out of the blue, and the wording does not sound like them. What now?",
        options: [
            "Download it, since it came from a friend",
            "Open it, then delete it afterwards",
            "Check with them another way before opening anything",
            "Pass the file to someone else first"
        ],
        answer: 2,
        note: "Hijacked accounts message real contacts. A quick call or a message on a different app settles it."
    },
    {
        question: "Why is reusing one password across accounts risky?",
        options: [
            "It slows the accounts down",
            "One breach exposes every account sharing that password",
            "It stops sites using encryption",
            "It blocks notifications"
        ],
        answer: 1,
        note: "Leaked password lists get replayed against other services. This is called credential stuffing."
    },
    {
        question:
            "An app asks for camera, microphone, contacts, location and photos, but none of that fits what it does. What now?",
        options: [
            "Allow everything so it works properly",
            "Allow everything and tidy it up later",
            "Grant only the access the app actually needs",
            "Give the permissions to a different app first"
        ],
        answer: 2,
        note: "Permissions can be granted one at a time, and most apps keep working without the extras."
    },
    {
        question:
            "An email says you won a competition you never entered, and wants your bank details to release the prize. What is it?",
        options: [
            "A normal competition result",
            "A phishing or advance-fee scam",
            "A software update",
            "A password recovery message"
        ],
        answer: 1,
        note: "A prize you never entered for, plus a request for payment details, is the classic shape of this scam."
    },
    {
        question: "Which feature adds a second check after your password?",
        options: [
            "Two-factor authentication",
            "Public Wi-Fi",
            "Browser history",
            "Private browsing mode"
        ],
        answer: 0,
        note: "App-generated codes and security keys hold up far better than codes sent by text."
    },
    {
        question:
            "You spot a login you do not recognise on one of your accounts. What comes first?",
        options: [
            "Ignore it while the account still works",
            "Post the login details publicly",
            "Change the password, then review security activity and active sessions",
            "Send your password to whoever logged in"
        ],
        answer: 2,
        note: "Change the password, sign out other sessions, then check recovery email and phone numbers are still yours."
    }
];

const breathingInfo: Record<
    BreathMethod,
    { helps: string; use: string; tint: string; dim: string }
> = {
    "Box Breathing": {
        helps: "Focus and staying steady",
        use: "Before studying, a test or a presentation",
        tint: T.violet,
        dim: T.violetDim
    },
    "Calm Breathing": {
        helps: "Slowing down after stress",
        use: "When you feel tense and need a short break",
        tint: T.sky,
        dim: T.skyDim
    },
    "Equal Breathing": {
        helps: "Finding an even rhythm",
        use: "During study breaks or quiet moments",
        tint: T.mint,
        dim: T.mintDim
    },
    "4-7-8 Breathing": {
        helps: "Settling your breathing right down",
        use: "In a quiet break, or before sleep",
        tint: T.amber,
        dim: T.amberDim
    }
};

const faqs = [
    {
        q: "How do I spot a phishing message?",
        a: "Phishing messages push you to act fast. Look for urgency, a link that does not match the real site, an unexpected attachment, or a request for a password or payment detail. Reach the account through the official app instead of the link."
    },
    {
        q: "I think I have been scammed. What now?",
        a: "Stop replying. Change any password that may have been exposed and turn on two-factor authentication. If you shared card or bank details, contact your bank immediately, then report it to your local cybercrime or fraud service."
    },
    {
        q: "What makes a password strong?",
        a: "Length beats complexity. Four or five unrelated words are easy to remember and hard to crack. Use a different one for every important account, and let a password manager carry them."
    },
    {
        q: "Is public Wi-Fi safe to use?",
        a: "It is fine for browsing, less so for banking. Stick to sites using HTTPS, avoid entering payment details, and use your mobile data or a trusted VPN for anything sensitive."
    },
    {
        q: "What is two-factor authentication?",
        a: "A second check after your password, usually a code from an authenticator app or a physical security key. It means a stolen password on its own is not enough to get in."
    },
    {
        q: "How do scammers use social media?",
        a: "They build fake profiles, copy accounts you already follow, run giveaways that never pay out, and send links through direct messages. Verify any unexpected request for money or details through a separate channel."
    },
    {
        q: "Is AI making scams harder to spot?",
        a: "Yes. AI writes clean, personalised messages and can clone a voice from a short clip, so bad spelling is no longer a reliable clue. Judge the request itself, and confirm it through a channel you chose."
    },
    {
        q: "How do I know a site is genuine?",
        a: "Read the domain one character at a time, including what comes just before the final dot. Type the address yourself rather than following a link, and treat pop-ups asking for logins or card details as a warning."
    }
];

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function Header({
    title,
    subtitle,
    onProfile
}: {
    title: string;
    subtitle?: string;
    onProfile: () => void;
}) {
    return (
        <View style={styles.header}>
            <View style={styles.headerTextBlock}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? (
                    <Text style={styles.subtitle}>{subtitle}</Text>
                ) : null}
            </View>

            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open your profile"
                onPress={onProfile}
                style={styles.avatarButton}
                activeOpacity={0.8}
            >
                <Text style={styles.avatarGlyph}>🛡️</Text>
            </TouchableOpacity>
        </View>
    );
}

const navItems: { key: Screen; glyph: string; label: string }[] = [
    { key: "home", glyph: "◈", label: "Home" },
    { key: "chat", glyph: "◎", label: "Chat" },
    { key: "breathing", glyph: "◍", label: "Calm" },
    { key: "learn", glyph: "◆", label: "Quiz" },
    { key: "faq", glyph: "◇", label: "FAQ" }
];

function BottomNav({
    screen,
    onNavigate
}: {
    screen: Screen;
    onNavigate: (s: Screen) => void;
}) {
    return (
        <View style={styles.navBar}>
            {navItems.map(item => {
                const active = screen === item.key;

                return (
                    <TouchableOpacity
                        key={item.key}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                        accessibilityState={{ selected: active }}
                        activeOpacity={0.75}
                        onPress={() => onNavigate(item.key)}
                        style={[styles.navItem, active && styles.navItemActive]}
                    >
                        <Text
                            style={[
                                styles.navGlyph,
                                active && styles.navGlyphActive
                            ]}
                        >
                            {item.glyph}
                        </Text>
                        <Text
                            style={[
                                styles.navLabel,
                                active && styles.navLabelActive
                            ]}
                        >
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
    const [screen, setScreen] = useState<Screen>("home");

    /* quiz */
    const [questionIndex, setQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [picked, setPicked] = useState<number | null>(null);
    const [quizDone, setQuizDone] = useState(false);
    const [bestScore, setBestScore] = useState<number | null>(null);
    const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* chat */
    const chatRef = useRef<ScrollView>(null);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sending, setSending] = useState(false);

    /* breathing */
    const [breathMethod, setBreathMethod] =
        useState<BreathMethod>("Box Breathing");
    const [breathPhase, setBreathPhase] = useState("Inhale");
    const [phaseLength, setPhaseLength] = useState(4000);
    const [phaseStart, setPhaseStart] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(4);

    const dotX = useRef(new Animated.Value(0)).current;
    const dotY = useRef(new Animated.Value(0)).current;
    const breathScale = useRef(new Animated.Value(1)).current;

    /* faq */
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const method = breathingInfo[breathMethod];

    /* -------------------------------------------------------------- */
    /* Breathing: one chain drives the animation and the label         */
    /* -------------------------------------------------------------- */

    useEffect(() => {
        if (screen !== "breathing") return;

        type Step = {
            label: string;
            duration: number;
            build: () => Animated.CompositeAnimation;
        };

        const move = (
            value: Animated.Value,
            toValue: number,
            duration: number
        ) =>
            Animated.timing(value, {
                toValue,
                duration,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: true
            });

        const hold = (duration: number) =>
            Animated.delay(duration);

        let steps: Step[];

        if (breathMethod === "Box Breathing") {
            steps = [
                {
                    label: "Inhale",
                    duration: 4000,
                    build: () => move(dotX, TRAVEL, 4000)
                },
                {
                    label: "Hold",
                    duration: 4000,
                    build: () => move(dotY, TRAVEL, 4000)
                },
                {
                    label: "Exhale",
                    duration: 4000,
                    build: () => move(dotX, 0, 4000)
                },
                {
                    label: "Hold",
                    duration: 4000,
                    build: () => move(dotY, 0, 4000)
                }
            ];
        } else {
            let inhale = 4000;
            let pause = 0;
            let exhale = 6000;

            if (breathMethod === "Equal Breathing") {
                inhale = 5000;
                exhale = 5000;
            }

            if (breathMethod === "4-7-8 Breathing") {
                inhale = 4000;
                pause = 7000;
                exhale = 8000;
            }

            steps = [
                {
                    label: "Inhale",
                    duration: inhale,
                    build: () => move(breathScale, 1.55, inhale)
                }
            ];

            if (pause > 0) {
                steps.push({
                    label: "Hold",
                    duration: pause,
                    build: () => hold(pause)
                });
            }

            steps.push({
                label: "Exhale",
                duration: exhale,
                build: () => move(breathScale, 1, exhale)
            });
        }

        dotX.setValue(0);
        dotY.setValue(0);
        breathScale.setValue(1);

        let cancelled = false;
        let running: Animated.CompositeAnimation | null = null;
        let index = 0;

        const runStep = () => {
            if (cancelled) return;

            const step = steps[index];

            setBreathPhase(step.label);
            setPhaseLength(step.duration);
            setPhaseStart(Date.now());

            running = step.build();
            running.start(({ finished }) => {
                if (!finished || cancelled) return;
                index = (index + 1) % steps.length;
                runStep();
            });
        };

        runStep();

        return () => {
            cancelled = true;
            if (running) running.stop();
        };
    }, [screen, breathMethod, dotX, dotY, breathScale]);

    /* countdown under the phase label */
    useEffect(() => {
        if (screen !== "breathing" || phaseStart === 0) return;

        const tick = () => {
            const elapsed = Date.now() - phaseStart;
            const left = Math.max(
                1,
                Math.ceil((phaseLength - elapsed) / 1000)
            );
            setSecondsLeft(left);
        };

        tick();
        const id = setInterval(tick, 250);
        return () => clearInterval(id);
    }, [screen, phaseStart, phaseLength]);

    /* -------------------------------------------------------------- */
    /* Chat                                                            */
    /* -------------------------------------------------------------- */

    useEffect(() => {
        if (screen !== "chat") return;
        const id = setTimeout(
            () => chatRef.current?.scrollToEnd({ animated: true }),
            60
        );
        return () => clearTimeout(id);
    }, [messages, sending, screen]);

    /* clear a pending quiz timer if the app unmounts mid-question */
    useEffect(() => {
        return () => {
            if (advanceTimer.current) clearTimeout(advanceTimer.current);
        };
    }, []);

    async function sendMessage(preset?: string) {
        const userMessage = (preset ?? message).trim();
        if (!userMessage || sending) return;

        setMessages(prev => [...prev, { role: "user", text: userMessage }]);
        setMessage("");

        if (!API_READY) {
            setMessages(prev => [
                ...prev,
                {
                    role: "bot",
                    failed: true,
                    text: "No API key is set yet. Add your Gemini API key to GEMINI_API_KEY in App.tsx and this will start answering."
                }
            ]);
            return;
        }

        setSending(true);

        try {
            const res = await fetch(GEMINI_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [{ text: userMessage }]
                        }
                    ],
                    systemInstruction: {
                        parts: [{ text: SYSTEM_INSTRUCTION }]
                    }
                })
            });

            if (!res.ok) throw new Error(`Request failed: ${res.status}`);

            const data = await res.json();

            const reply =
                data?.candidates?.[0]?.content?.parts?.[0]?.text ??
                "That came back empty. Try asking again.";

            setMessages(prev => [...prev, { role: "bot", text: reply }]);
        } catch (err) {
            console.log("Chat request failed:", err);

            setMessages(prev => [
                ...prev,
                {
                    role: "bot",
                    failed: true,
                    text: "Could not reach the assistant. Check your connection and send it again."
                }
            ]);
        } finally {
            setSending(false);
        }
    }

    /* -------------------------------------------------------------- */
    /* Quiz                                                            */
    /* -------------------------------------------------------------- */

    function answerQuestion(index: number) {
        if (picked !== null) return;

        const correct = index === quizQuestions[questionIndex].answer;
        const nextScore = correct ? score + 1 : score;

        setPicked(index);
        setScore(nextScore);

        advanceTimer.current = setTimeout(() => {
            if (questionIndex < quizQuestions.length - 1) {
                setQuestionIndex(questionIndex + 1);
                setPicked(null);
            } else {
                setBestScore(prev =>
                    prev === null ? nextScore : Math.max(prev, nextScore)
                );
                setQuizDone(true);
            }
        }, 1400);
    }

    function restartQuiz() {
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        setQuestionIndex(0);
        setScore(0);
        setPicked(null);
        setQuizDone(false);
    }

    /* -------------------------------------------------------------- */
    /* Screens                                                         */
    /* -------------------------------------------------------------- */

    function renderHome() {
        const tiles: {
            key: Screen;
            glyph: string;
            title: string;
            text: string;
            tint: string;
            dim: string;
        }[] = [
            {
                key: "chat",
                glyph: "◎",
                title: "Ask the assistant",
                text: "Describe a message or link and get a read on whether it is safe.",
                tint: T.violet,
                dim: T.violetDim
            },
            {
                key: "breathing",
                glyph: "◍",
                title: "Calm corner",
                text: "Guided breathing for when a scare leaves you rattled.",
                tint: T.sky,
                dim: T.skyDim
            },
            {
                key: "learn",
                glyph: "◆",
                title: "Spot the scam",
                text: `${quizQuestions.length} scenarios drawn from the tricks people actually fall for.`,
                tint: T.mint,
                dim: T.mintDim
            },
            {
                key: "faq",
                glyph: "◇",
                title: "Quick answers",
                text: "Short, practical replies to the questions that come up most.",
                tint: T.amber,
                dim: T.amberDim
            }
        ];

        return (
            <>
                <Header
                    title="CyberQuest"
                    subtitle="Spot scams early, and keep a steady head when one lands."
                    onProfile={() => setScreen("profile")}
                />

                <View style={styles.hero}>
                    <View style={styles.heroRail} />
                    <Text style={styles.heroKicker}>Today</Text>
                    <Text style={styles.heroLine}>
                        Most scams work by rushing you. Slowing down is the
                        whole defence.
                    </Text>

                    <View style={styles.heroStats}>
                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatValue}>
                                {bestScore === null
                                    ? "—"
                                    : `${bestScore}/${quizQuestions.length}`}
                            </Text>
                            <Text style={styles.heroStatLabel}>Best quiz</Text>
                        </View>

                        <View style={styles.heroDivider} />

                        <View style={styles.heroStat}>
                            <Text style={styles.heroStatValue}>
                                {messages.filter(m => m.role === "user").length}
                            </Text>
                            <Text style={styles.heroStatLabel}>
                                Questions asked
                            </Text>
                        </View>
                    </View>
                </View>

                {tiles.map(tile => (
                    <TouchableOpacity
                        key={tile.key}
                        activeOpacity={0.85}
                        style={styles.tile}
                        onPress={() => setScreen(tile.key)}
                        accessibilityRole="button"
                    >
                        <View
                            style={[
                                styles.tileIcon,
                                { backgroundColor: tile.dim }
                            ]}
                        >
                            <Text
                                style={[styles.tileGlyph, { color: tile.tint }]}
                            >
                                {tile.glyph}
                            </Text>
                        </View>

                        <View style={styles.tileBody}>
                            <Text style={styles.tileTitle}>{tile.title}</Text>
                            <Text style={styles.tileText}>{tile.text}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </>
        );
    }

    function renderQuiz() {
        if (quizDone) {
            const verdict =
                score === quizQuestions.length
                    ? "Nothing got past you."
                    : score >= quizQuestions.length - 2
                    ? "Strong instincts. A couple of edge cases to watch."
                    : "Worth another run — the patterns repeat.";

            return (
                <>
                    <Header
                        title="Score"
                        subtitle={verdict}
                        onProfile={() => setScreen("profile")}
                    />

                    <View style={styles.scoreCard}>
                        <Text style={styles.scoreValue}>
                            {score}
                            <Text style={styles.scoreOutOf}>
                                /{quizQuestions.length}
                            </Text>
                        </Text>
                        <Text style={styles.scoreLabel}>
                            scenarios answered correctly
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={restartQuiz}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.primaryButtonText}>
                            Run it again
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.ghostButton}
                        onPress={() => setScreen("home")}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.ghostButtonText}>Back to home</Text>
                    </TouchableOpacity>
                </>
            );
        }

        const current = quizQuestions[questionIndex];
        const progress =
            ((questionIndex + (picked === null ? 0 : 1)) /
                quizQuestions.length) *
            100;

        return (
            <>
                <Header
                    title="Spot the scam"
                    subtitle={`Scenario ${questionIndex + 1} of ${
                        quizQuestions.length
                    }`}
                    onProfile={() => setScreen("profile")}
                />

                <View style={styles.progressTrack}>
                    <View
                        style={[styles.progressFill, { width: `${progress}%` }]}
                    />
                </View>

                <Text style={styles.quizQuestion}>{current.question}</Text>

                {current.options.map((option, index) => {
                    const isAnswer = index === current.answer;
                    const isPicked = picked === index;
                    const reveal = picked !== null;

                    return (
                        <TouchableOpacity
                            key={index}
                            activeOpacity={0.85}
                            disabled={reveal}
                            onPress={() => answerQuestion(index)}
                            accessibilityRole="button"
                            style={[
                                styles.option,
                                reveal && isAnswer && styles.optionCorrect,
                                reveal &&
                                    isPicked &&
                                    !isAnswer &&
                                    styles.optionWrong
                            ]}
                        >
                            <View
                                style={[
                                    styles.optionMark,
                                    reveal &&
                                        isAnswer &&
                                        styles.optionMarkCorrect,
                                    reveal &&
                                        isPicked &&
                                        !isAnswer &&
                                        styles.optionMarkWrong
                                ]}
                            >
                                <Text style={styles.optionMarkText}>
                                    {String.fromCharCode(65 + index)}
                                </Text>
                            </View>

                            <Text style={styles.optionText}>{option}</Text>
                        </TouchableOpacity>
                    );
                })}

                {picked !== null ? (
                    <View style={styles.noteCard}>
                        <Text style={styles.noteTitle}>
                            {picked === current.answer
                                ? "Correct"
                                : "Not this time"}
                        </Text>
                        <Text style={styles.noteText}>{current.note}</Text>
                    </View>
                ) : null}
            </>
        );
    }

    function renderBreathing() {
        return (
            <>
                <Header
                    title="Calm corner"
                    subtitle="Follow the marker. Breathe with it, not ahead of it."
                    onProfile={() => setScreen("profile")}
                />

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipRow}
                    contentContainerStyle={styles.chipRowContent}
                >
                    {(Object.keys(breathingInfo) as BreathMethod[]).map(item => {
                        const active = breathMethod === item;
                        const tint = breathingInfo[item].tint;

                        return (
                            <TouchableOpacity
                                key={item}
                                activeOpacity={0.85}
                                onPress={() => setBreathMethod(item)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                                style={[
                                    styles.chip,
                                    active && {
                                        backgroundColor:
                                            breathingInfo[item].dim,
                                        borderColor: tint
                                    }
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        active && { color: tint }
                                    ]}
                                >
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <Text style={styles.breathPhase}>{breathPhase}</Text>
                <Text style={[styles.breathCount, { color: method.tint }]}>
                    {secondsLeft}
                </Text>

                {breathMethod === "Box Breathing" ? (
                    <View style={styles.breathStage}>
                        <View
                            style={[
                                styles.breathBox,
                                { borderColor: method.tint }
                            ]}
                        >
                            <Animated.View
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: method.tint,
                                        transform: [
                                            { translateX: dotX },
                                            { translateY: dotY }
                                        ]
                                    }
                                ]}
                            />
                        </View>

                        <Text style={[styles.edge, styles.edgeTop]}>
                            Inhale
                        </Text>
                        <Text style={[styles.edge, styles.edgeRight]}>
                            Hold
                        </Text>
                        <Text style={[styles.edge, styles.edgeBottom]}>
                            Exhale
                        </Text>
                        <Text style={[styles.edge, styles.edgeLeft]}>Hold</Text>
                    </View>
                ) : (
                    <View style={styles.breathStage}>
                        <Animated.View
                            style={[
                                styles.ring,
                                {
                                    borderColor: method.tint,
                                    opacity: breathScale.interpolate({
                                        inputRange: [1, 1.55],
                                        outputRange: [0.18, 0.5]
                                    }),
                                    transform: [{ scale: breathScale }]
                                }
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.orb,
                                {
                                    backgroundColor: method.tint,
                                    transform: [{ scale: breathScale }]
                                }
                            ]}
                        />
                    </View>
                )}

                <View style={styles.card}>
                    <View style={styles.cardHeadRow}>
                        <View
                            style={[
                                styles.cardPip,
                                { backgroundColor: method.tint }
                            ]}
                        />
                        <Text style={styles.cardTitle}>{breathMethod}</Text>
                    </View>

                    <Text style={styles.metaRow}>
                        <Text style={styles.metaKey}>Helps with </Text>
                        {method.helps}
                    </Text>
                    <Text style={styles.metaRow}>
                        <Text style={styles.metaKey}>Best used </Text>
                        {method.use}
                    </Text>
                </View>
            </>
        );
    }

    function renderChat() {
        const starters = [
            "Is this text from my bank real?",
            "How do I check a link safely?",
            "Someone has my password. What now?"
        ];

        return (
            <>
                <Header
                    title="Assistant"
                    subtitle="Paste a suspicious message and ask what you should do."
                    onProfile={() => setScreen("profile")}
                />

                {messages.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>
                            Start with something you have received
                        </Text>
                        <Text style={styles.emptyText}>
                            Leave out account numbers and passwords — the
                            wording is enough to judge it.
                        </Text>

                        {starters.map(starter => (
                            <TouchableOpacity
                                key={starter}
                                style={styles.starter}
                                activeOpacity={0.85}
                                onPress={() => sendMessage(starter)}
                            >
                                <Text style={styles.starterText}>
                                    {starter}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.chatArea}>
                        {messages.map((msg, index) => (
                            <View
                                key={index}
                                style={[
                                    msg.role === "user"
                                        ? styles.bubbleUser
                                        : styles.bubbleBot,
                                    msg.failed && styles.bubbleError
                                ]}
                            >
                                <Text
                                    style={
                                        msg.role === "user"
                                            ? styles.bubbleUserText
                                            : styles.bubbleBotText
                                    }
                                >
                                    {msg.text}
                                </Text>
                            </View>
                        ))}

                        {sending ? (
                            <View style={[styles.bubbleBot, styles.typing]}>
                                <ActivityIndicator
                                    size="small"
                                    color={T.violetSoft}
                                />
                                <Text style={styles.typingText}>
                                    Thinking
                                </Text>
                            </View>
                        ) : null}
                    </View>
                )}
            </>
        );
    }

    function renderFaq() {
        return (
            <>
                <Header
                    title="Quick answers"
                    subtitle="Tap a question to open it."
                    onProfile={() => setScreen("profile")}
                />

                {faqs.map((item, index) => {
                    const open = openFaq === index;

                    return (
                        <TouchableOpacity
                            key={item.q}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: open }}
                            style={[styles.faqCard, open && styles.faqCardOpen]}
                            onPress={() => setOpenFaq(open ? null : index)}
                        >
                            <View style={styles.faqHead}>
                                <Text
                                    style={[
                                        styles.faqQuestion,
                                        open && styles.faqQuestionOpen
                                    ]}
                                >
                                    {item.q}
                                </Text>
                                <Text style={styles.faqToggle}>
                                    {open ? "−" : "+"}
                                </Text>
                            </View>

                            {open ? (
                                <Text style={styles.faqAnswer}>{item.a}</Text>
                            ) : null}
                        </TouchableOpacity>
                    );
                })}
            </>
        );
    }

    function renderProfile() {
        const asked = messages.filter(m => m.role === "user").length;

        const rows = [
            {
                label: "Best quiz score",
                value:
                    bestScore === null
                        ? "Not played yet"
                        : `${bestScore} of ${quizQuestions.length}`
            },
            {
                label: "Questions asked",
                value: asked === 0 ? "None yet" : String(asked)
            },
            {
                label: "Preferred breathing",
                value: breathMethod
            }
        ];

        return (
            <>
                <Header
                    title="Your profile"
                    subtitle="Everything here stays on this device."
                    onProfile={() => setScreen("home")}
                />

                <View style={styles.card}>
                    {rows.map((row, index) => (
                        <View
                            key={row.label}
                            style={[
                                styles.statRow,
                                index === rows.length - 1 && styles.statRowLast
                            ]}
                        >
                            <Text style={styles.statLabel}>{row.label}</Text>
                            <Text style={styles.statValue}>{row.value}</Text>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.ghostButton}
                    activeOpacity={0.8}
                    onPress={() => {
                        setMessages([]);
                        restartQuiz();
                        setBestScore(null);
                    }}
                >
                    <Text style={styles.ghostButtonText}>
                        Clear chat and quiz history
                    </Text>
                </TouchableOpacity>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>About CyberQuest</Text>
                    <Text style={styles.cardText}>
                        A learning app for recognising scams and staying calm
                        when one reaches you. It offers general guidance, not
                        legal or financial advice. If money has already moved,
                        contact your bank first.
                    </Text>
                </View>
            </>
        );
    }

    function renderScreen() {
        if (screen === "learn") return renderQuiz();
        if (screen === "breathing") return renderBreathing();
        if (screen === "chat") return renderChat();
        if (screen === "faq") return renderFaq();
        if (screen === "profile") return renderProfile();
        return renderHome();
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={T.bg} />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
            >
                <ScrollView
                    ref={chatRef}
                    style={styles.flex}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollBody}
                >
                    {renderScreen()}
                </ScrollView>

                {screen === "chat" ? (
                    <View style={styles.composer}>
                        <TextInput
                            placeholder="Describe the message you received…"
                            placeholderTextColor={T.muted}
                            style={styles.input}
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            maxLength={1000}
                            editable={!sending}
                        />

                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Send message"
                            activeOpacity={0.85}
                            disabled={sending || message.trim().length === 0}
                            onPress={() => sendMessage()}
                            style={[
                                styles.sendButton,
                                (sending || message.trim().length === 0) &&
                                    styles.sendButtonDisabled
                            ]}
                        >
                            <Text style={styles.sendText}>↑</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                <BottomNav screen={screen} onNavigate={setScreen} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
    flex: { flex: 1 },

    container: {
        flex: 1,
        backgroundColor: T.bg,
        paddingTop: Platform.OS === "android" ? 28 : 0
    },

    scrollBody: {
        paddingHorizontal: 18,
        paddingBottom: 190
    },

    /* header */
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginTop: 14,
        marginBottom: 22
    },

    headerTextBlock: {
        flex: 1,
        paddingRight: 14
    },

    title: {
        fontSize: 30,
        fontWeight: "700",
        letterSpacing: -0.7,
        color: T.text
    },

    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        color: T.muted,
        marginTop: 6,
        maxWidth: 330
    },

    avatarButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.line,
        alignItems: "center",
        justifyContent: "center"
    },

    avatarGlyph: { fontSize: 18 },

    /* hero */
    hero: {
        backgroundColor: T.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: T.line,
        paddingVertical: 22,
        paddingLeft: 24,
        paddingRight: 20,
        marginBottom: 26,
        overflow: "hidden"
    },

    heroRail: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: T.violet
    },

    heroKicker: {
        color: T.violetSoft,
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 10
    },

    heroLine: {
        color: T.text,
        fontSize: 21,
        lineHeight: 30,
        fontWeight: "600",
        letterSpacing: -0.3
    },

    heroStats: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 22,
        paddingTop: 18,
        borderTopWidth: 1,
        borderTopColor: T.lineSoft
    },

    heroStat: { flex: 1 },

    heroStatValue: {
        color: T.text,
        fontSize: 22,
        fontWeight: "700",
        letterSpacing: -0.4
    },

    heroStatLabel: {
        color: T.muted,
        fontSize: 13,
        marginTop: 3
    },

    heroDivider: {
        width: 1,
        height: 34,
        backgroundColor: T.lineSoft,
        marginHorizontal: 18
    },

    /* home tiles */
    tile: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: T.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: T.lineSoft,
        padding: 18,
        marginBottom: 12
    },

    tileIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 15
    },

    tileGlyph: { fontSize: 19 },

    tileBody: { flex: 1 },

    tileTitle: {
        color: T.text,
        fontSize: 17,
        fontWeight: "600",
        letterSpacing: -0.2
    },

    tileText: {
        color: T.muted,
        fontSize: 14,
        lineHeight: 21,
        marginTop: 5
    },

    /* generic card */
    card: {
        backgroundColor: T.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: T.lineSoft,
        padding: 20,
        marginTop: 16
    },

    cardHeadRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12
    },

    cardPip: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10
    },

    cardTitle: {
        color: T.text,
        fontSize: 17,
        fontWeight: "600"
    },

    cardText: {
        color: T.body,
        fontSize: 15,
        lineHeight: 23,
        marginTop: 8
    },

    metaRow: {
        color: T.body,
        fontSize: 15,
        lineHeight: 23,
        marginTop: 4
    },

    metaKey: {
        color: T.muted
    },

    /* quiz */
    progressTrack: {
        height: 4,
        borderRadius: 2,
        backgroundColor: T.surfaceHi,
        overflow: "hidden",
        marginBottom: 24
    },

    progressFill: {
        height: 4,
        borderRadius: 2,
        backgroundColor: T.violet
    },

    quizQuestion: {
        color: T.text,
        fontSize: 20,
        lineHeight: 29,
        fontWeight: "600",
        letterSpacing: -0.3,
        marginBottom: 20
    },

    option: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: T.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: T.lineSoft,
        paddingVertical: 15,
        paddingHorizontal: 16,
        marginBottom: 10
    },

    optionCorrect: {
        borderColor: T.mint,
        backgroundColor: T.mintDim
    },

    optionWrong: {
        borderColor: T.danger,
        backgroundColor: T.dangerDim
    },

    optionMark: {
        width: 28,
        height: 28,
        borderRadius: 9,
        backgroundColor: T.surfaceHi,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 14
    },

    optionMarkCorrect: { backgroundColor: T.mint },

    optionMarkWrong: { backgroundColor: T.danger },

    optionMarkText: {
        color: T.text,
        fontSize: 13,
        fontWeight: "700"
    },

    optionText: {
        flex: 1,
        color: T.body,
        fontSize: 15,
        lineHeight: 22
    },

    noteCard: {
        backgroundColor: T.surfaceHi,
        borderRadius: 16,
        padding: 18,
        marginTop: 10
    },

    noteTitle: {
        color: T.text,
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 6
    },

    noteText: {
        color: T.body,
        fontSize: 14,
        lineHeight: 21
    },

    scoreCard: {
        backgroundColor: T.surface,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: T.line,
        paddingVertical: 38,
        alignItems: "center",
        marginBottom: 22
    },

    scoreValue: {
        color: T.violet,
        fontSize: 58,
        fontWeight: "700",
        letterSpacing: -2
    },

    scoreOutOf: {
        color: T.muted,
        fontSize: 26,
        fontWeight: "600"
    },

    scoreLabel: {
        color: T.muted,
        fontSize: 14,
        marginTop: 8
    },

    primaryButton: {
        backgroundColor: T.violet,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: "center"
    },

    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600"
    },

    ghostButton: {
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: "center",
        borderWidth: 1,
        borderColor: T.line,
        marginTop: 10
    },

    ghostButtonText: {
        color: T.body,
        fontSize: 15,
        fontWeight: "500"
    },

    /* breathing */
    chipRow: {
        marginBottom: 26,
        marginHorizontal: -18
    },

    chipRowContent: {
        paddingHorizontal: 18
    },

    chip: {
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.lineSoft,
        borderRadius: 999,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginRight: 8
    },

    chipText: {
        color: T.muted,
        fontSize: 13,
        fontWeight: "600"
    },

    breathPhase: {
        color: T.text,
        fontSize: 24,
        fontWeight: "600",
        textAlign: "center",
        letterSpacing: -0.3
    },

    breathCount: {
        fontSize: 15,
        fontWeight: "600",
        textAlign: "center",
        marginTop: 4
    },

    breathStage: {
        width: BOX_SIZE,
        height: BOX_SIZE,
        alignSelf: "center",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 34,
        marginBottom: 46
    },

    breathBox: {
        width: BOX_SIZE,
        height: BOX_SIZE,
        borderWidth: 2,
        borderRadius: 26,
        opacity: 0.9
    },

    dot: {
        position: "absolute",
        left: 4,
        top: 4,
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: DOT_SIZE / 2
    },

    edge: {
        position: "absolute",
        color: T.muted,
        fontSize: 12,
        fontWeight: "600"
    },

    edgeTop: { top: -22 },
    edgeBottom: { bottom: -22 },
    edgeLeft: { left: -40 },
    edgeRight: { right: -38 },

    ring: {
        position: "absolute",
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 1
    },

    orb: {
        width: 118,
        height: 118,
        borderRadius: 59
    },

    /* chat */
    chatArea: { minHeight: 120 },

    emptyState: {
        backgroundColor: T.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: T.lineSoft,
        padding: 20
    },

    emptyTitle: {
        color: T.text,
        fontSize: 17,
        fontWeight: "600"
    },

    emptyText: {
        color: T.muted,
        fontSize: 14,
        lineHeight: 21,
        marginTop: 6,
        marginBottom: 16
    },

    starter: {
        borderWidth: 1,
        borderColor: T.line,
        borderRadius: 14,
        paddingVertical: 13,
        paddingHorizontal: 15,
        marginTop: 8
    },

    starterText: {
        color: T.violetSoft,
        fontSize: 14,
        lineHeight: 20
    },

    bubbleBot: {
        backgroundColor: T.surface,
        borderWidth: 1,
        borderColor: T.lineSoft,
        borderRadius: 18,
        borderBottomLeftRadius: 6,
        paddingVertical: 13,
        paddingHorizontal: 16,
        marginVertical: 5,
        alignSelf: "flex-start",
        maxWidth: "88%"
    },

    bubbleUser: {
        backgroundColor: T.violet,
        borderRadius: 18,
        borderBottomRightRadius: 6,
        paddingVertical: 13,
        paddingHorizontal: 16,
        marginVertical: 5,
        alignSelf: "flex-end",
        maxWidth: "88%"
    },

    bubbleError: {
        borderColor: T.danger,
        backgroundColor: T.dangerDim
    },

    bubbleBotText: {
        color: T.body,
        fontSize: 15,
        lineHeight: 23
    },

    bubbleUserText: {
        color: "#FFFFFF",
        fontSize: 15,
        lineHeight: 23
    },

    typing: {
        flexDirection: "row",
        alignItems: "center"
    },

    typingText: {
        color: T.muted,
        fontSize: 14,
        marginLeft: 10
    },

    composer: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 18,
        paddingBottom: 10,
        marginBottom: 86
    },

    input: {
        flex: 1,
        backgroundColor: T.surface,
        color: T.text,
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingTop: 13,
        paddingBottom: 13,
        fontSize: 15,
        lineHeight: 21,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: T.line
    },

    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: T.violet,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 10
    },

    sendButtonDisabled: {
        backgroundColor: T.surfaceHi
    },

    sendText: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "700"
    },

    /* faq */
    faqCard: {
        backgroundColor: T.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: T.lineSoft,
        padding: 18,
        marginBottom: 10
    },

    faqCardOpen: {
        borderColor: T.line,
        backgroundColor: T.surfaceHi
    },

    faqHead: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between"
    },

    faqQuestion: {
        flex: 1,
        color: T.body,
        fontSize: 16,
        lineHeight: 23,
        fontWeight: "600",
        paddingRight: 14
    },

    faqQuestionOpen: {
        color: T.text
    },

    faqToggle: {
        color: T.violetSoft,
        fontSize: 20,
        lineHeight: 23,
        fontWeight: "600"
    },

    faqAnswer: {
        color: T.muted,
        fontSize: 15,
        lineHeight: 23,
        marginTop: 12
    },

    /* profile */
    statRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: T.lineSoft
    },

    statRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 0
    },

    statLabel: {
        color: T.muted,
        fontSize: 15
    },

    statValue: {
        color: T.text,
        fontSize: 15,
        fontWeight: "600"
    },

    /* nav */
    navBar: {
        position: "absolute",
        bottom: 16,
        left: 16,
        right: 16,
        height: 66,
        backgroundColor: "#141D30",
        borderRadius: 22,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: T.line
    },

    navItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        borderRadius: 16
    },

    navItemActive: {
        backgroundColor: T.violetDim
    },

    navGlyph: {
        fontSize: 16,
        color: T.muted
    },

    navGlyphActive: {
        color: T.violet
    },

    navLabel: {
        color: T.muted,
        fontSize: 11,
        marginTop: 4
    },

    navLabelActive: {
        color: T.violetSoft,
        fontWeight: "600"
    }
});