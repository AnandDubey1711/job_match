import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  ArrowLeft,
  Loader2,
  Check,
  X as XIcon,
  File,
  RotateCcw,
  BarChart,
  Search,
  CheckCircle,
  Lightbulb,
  AlertTriangle,
  WifiOff,
  ServerCrash,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { analyzeResumeMatch } from "../routes/uploadRoute";

const VISIBLE_KEYWORDS = 14;

const GENERIC_BLOCKLIST = new Set([
  "one",
  "two",
  "plus",
  "load",
  "ideal",
  "salary",
  "health",
  "team",
  "work",
  "year",
  "years",
  "role",
  "job",
  "remote",
  "benefits",
  "company",
  "experience",
  "requirements",
  "qualifications",
  "description",
  "position",
  "candidate",
]);

const cleanKeyword = (raw) => {
  if (!raw) return null;
  let s = String(raw)
    .trim()
    .replace(/[\*#|,;.:]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, " ");
  if (s.length < 2 || s.length > 42) return null;
  if (s.split(" ").length > 5) return null;
  const tokens = s.toLowerCase().split(" ");
  if (tokens.some((t) => GENERIC_BLOCKLIST.has(t))) return null;
  if (
    /^(design|develop|build|work|collaborate|implement|create|manage)\b/i.test(
      s,
    ) &&
    s.split(" ").length > 3
  ) {
    return null;
  }
  return s;
};

const prepareKeywords = (list) => {
  const seen = new Set();
  return list
    .map(cleanKeyword)
    .filter(Boolean)
    .filter((kw) => {
      const key = kw.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.length - b.length);
};

const KeywordPill = ({ label, variant = "matched" }) => {
  const isMatched = variant === "matched";
  const display = label.length > 28 ? `${label.slice(0, 26)}…` : label;

  return (
    <span
      title={label}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold leading-snug ${
        isMatched
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
          : "bg-rose-50 text-rose-700 ring-1 ring-rose-100"
      }`}
    >
      {isMatched ? (
        <Check size={12} strokeWidth={3} className="shrink-0" />
      ) : (
        <XIcon size={12} strokeWidth={3} className="shrink-0" />
      )}
      <span className="truncate">{display}</span>
    </span>
  );
};

const KeywordPanel = ({ title, subtitle, items, variant, emptyText }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, VISIBLE_KEYWORDS);
  const hiddenCount = Math.max(0, items.length - VISIBLE_KEYWORDS);

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-gray-900">{title}</h4>
          <p className="mt-0.5 text-xs font-medium text-gray-500">{subtitle}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
            variant === "matched"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm font-medium text-gray-400">{emptyText}</p>
      ) : (
        <>
          <div className="grid max-h-[280px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {visible.map((kw) => (
              <KeywordPill key={kw} label={kw} variant={variant} />
            ))}
          </div>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-4 text-left text-xs font-bold text-[#0BAF8A] hover:underline"
            >
              {expanded ? "Show fewer" : `Show ${hiddenCount} more`}
            </button>
          )}
        </>
      )}
    </section>
  );
};

const ScoreChecker = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null); // { message, type: 'validation'|'network'|'server' }

  const [animScore, setAnimScore] = useState(0);

  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleAnalyze = async () => {
    if (isAnalyzing) return;
    setError(null);
    setIsAnalyzing(true);
    try {
      const data = await analyzeResumeMatch(file, jobDescription);
      // Normalise backend response —— support both snake_case and camelCase keys
      const overall =
        data?.overall_score ??
        data?.overallScore ??
        data?.score ??
        data?.evaluation_result?.final_score ??
        0;
      const matched = prepareKeywords(
        data?.matched_keywords ?? data?.matchedKeywords ?? data?.matched ?? [],
      );
      const missing = prepareKeywords(
        data?.missing_keywords ?? data?.missingKeywords ?? data?.missing ?? [],
      );
      const tip = data?.ai_tip ?? data?.aiTip ?? data?.recommendation ?? null;
      const totalKeywords = matched.length + missing.length;
      const coverage =
        totalKeywords > 0
          ? Math.round((matched.length / totalKeywords) * 100)
          : 0;

      setAnimScore(0);
      setResults({
        overall: Math.round(Number(overall) || 0),
        matched,
        missing,
        tip,
        coverage,
      });
    } catch (err) {
      const type = err.isValidationError
        ? "validation"
        : err.isNetworkError
          ? "network"
          : "server";
      setError({ message: err.message, type });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setJobDescription("");
    setResults(null);
    setError(null);
  };

  useEffect(() => {
    if (results) {
      setTimeout(() => setAnimScore(results.overall), 100);
    }
  }, [results]);

  // Button is always clickable so that validation errors surface on demand
  const isFormValid = file && jobDescription.trim().length > 0;

  const getMatchLabel = (score) => {
    if (score >= 80) return { text: "Strong Match", color: "#0BAF8A" }; // Teal
    if (score >= 60) return { text: "Good Fit", color: "#F59E0B" }; // Yellow/Amber
    return { text: "Needs Work", color: "#EF4444" }; // Red
  };

  const matchData = results
    ? getMatchLabel(results.overall)
    : { text: "", color: "#0BAF8A" };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F7F9FC] selection:bg-[#0BAF8A]/20 text-gray-900">
      {/* Absolute Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#F7F9FC]/90 backdrop-blur-md border-b border-gray-200 h-[80px] flex items-center">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 w-full flex justify-between items-center">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => {
              window.scrollTo(0, 0);
              navigate("/");
            }}
          >
            <span className="text-xl font-extrabold tracking-tight">
              Resume<span className="text-[#0BAF8A]">IQ</span>
            </span>
          </div>
          <button
            onClick={() => {
              window.scrollTo(0, 0);
              navigate("/");
            }}
            className="flex items-center gap-2 text-gray-400 font-bold text-sm tracking-wide hover:text-[#0BAF8A] transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={3} /> BACK TO HOME
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow w-full pt-[90px] pb-24 px-4 sm:px-6 flex flex-col items-center">
        {!results ? (
          <div className="w-full max-w-5xl mx-auto flex flex-col animate-in fade-in duration-500">
            {/* Header Content */}
            <div className="text-center mb-6 mt-8 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#0BAF8A]/30 text-[#0BAF8A] text-xs font-bold tracking-wide mb-4 bg-[#0BAF8A]/5 shadow-sm">
                <span className="text-sm leading-none relative -top-0.5">
                  ✦
                </span>{" "}
                Free & Instant
              </div>
              <h1 className="text-[48px] font-[800] text-[#111827] tracking-tight mb-4">
                Analyze Your Match
              </h1>
              <p className="text-gray-500 font-medium text-lg max-w-lg">
                Upload your resume and paste the job description below.
              </p>
            </div>

            {/* ─── Warning / Error Banner ────────────────────────────────── */}
            {error && (
              <div
                className={`w-full flex items-start gap-3 rounded-2xl border px-5 py-4 mb-6 text-sm font-medium leading-snug
                  ${
                    error.type === "validation"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : error.type === "network"
                        ? "bg-blue-50 border-blue-200 text-blue-800"
                        : "bg-red-50 border-red-200 text-red-800"
                  }`}
              >
                <span className="mt-0.5 shrink-0">
                  {error.type === "validation" && <AlertTriangle size={18} />}
                  {error.type === "network" && <WifiOff size={18} />}
                  {error.type === "server" && <ServerCrash size={18} />}
                </span>
                <span className="flex-1">{error.message}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-2 shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                  aria-label="Dismiss"
                >
                  <XIcon size={16} strokeWidth={3} />
                </button>
              </div>
            )}

            {/* Input Panels */}
            <div className="grid md:grid-cols-2 gap-8 w-full">
              {/* Left Panel - File Upload */}
              <div
                className={`border-[2px] border-dashed border-teal-300 rounded-2xl flex flex-col items-center justify-center p-8 w-full min-h-[320px] cursor-pointer bg-white group hover:border-[#0BAF8A] hover:bg-[#0BAF8A]/[0.03] hover:shadow-md transition-all duration-300 ${isDragActive ? "border-[#0BAF8A] bg-[#0BAF8A]/[0.05] shadow-md scale-[1.02]" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragActive(false);
                }}
                onDrop={handleDrop}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                />
                {file ? (
                  <div className="text-center w-full">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4 text-[#0BAF8A]">
                      <File size={32} />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-full py-2.5 px-5 shadow-sm inline-flex items-center gap-4 max-w-full justify-between">
                      <span className="font-semibold text-gray-800 truncate text-[15px]">
                        {file.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <XIcon
                          size={16}
                          strokeWidth={3}
                          className="text-gray-400 hover:text-gray-800"
                        />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center pointer-events-none flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-4 text-[#0BAF8A] shadow-sm">
                      <UploadCloud size={28} />
                    </div>
                    <h3 className="font-semibold text-gray-800 text-lg mb-1">
                      Upload your resume
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Drop your resume here or click to browse
                    </p>
                    <div className="bg-gray-100 text-gray-400 text-xs px-2.5 py-1 rounded-full font-bold tracking-wider">
                      PDF OR DOCX
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel - Textarea */}
              <div className="w-full flex">
                <div className="w-full h-full min-h-[320px] bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col relative transition-shadow hover:shadow-md focus-within:shadow-md focus-within:border-[#0BAF8A]/30">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Job Description
                  </h4>
                  <textarea
                    value={jobDescription}
                    onChange={(e) =>
                      setJobDescription(e.target.value.slice(0, 5000))
                    }
                    placeholder="Paste the full job description here..."
                    className="w-full flex-grow bg-gray-50 rounded-xl p-4 text-gray-800 placeholder-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#0BAF8A]/20 resize-none transition-all"
                  ></textarea>
                  <div className="absolute bottom-10 right-10 text-xs text-gray-400 font-medium bg-gray-50 px-2 rounded">
                    {jobDescription.length} / 5000
                  </div>
                </div>
              </div>
            </div>

            {/* Analyze Button Area */}
            <div className="mt-14 flex flex-col items-center">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`flex items-center justify-center min-w-[220px] h-[52px] rounded-full font-bold text-[15px] transition-all
                  ${
                    isFormValid
                      ? "bg-gradient-to-r from-[#0BAF8A] to-[#06D6A0] text-white shadow-lg shadow-teal-200 hover:shadow-teal-300 hover:scale-[1.02]"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-3">
                    <Loader2 size={18} className="animate-spin" /> SCANNING...
                  </div>
                ) : (
                  <span>Analyze My Match &rarr;</span>
                )}
              </button>

              {/* Expectations Hint */}
              <div className="flex gap-6 justify-center text-sm text-gray-400 mt-5 font-medium">
                <span className="flex items-center gap-1.5">
                  <BarChart size={16} /> Match Score
                </span>
                <span className="flex items-center gap-1.5">
                  <Search size={16} /> Keyword Gaps
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle size={16} /> ATS Check
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Results Matches Section */
          <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 pt-4 animate-in fade-in duration-[800ms] fill-mode-forwards ease-out">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0BAF8A]">
                Analysis complete
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                Your match breakdown
              </h2>
            </div>

            {/* Score hero */}
            <div className="grid gap-4 rounded-[24px] border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/40 md:grid-cols-[220px_1fr] md:p-8">
              <div className="flex flex-col items-center justify-center border-b border-gray-100 pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-8">
                <div className="relative mb-4 flex h-36 w-36 items-center justify-center">
                  <svg
                    className="pointer-events-none h-full w-full -rotate-90 transform"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="transparent"
                      stroke="#F3F4F6"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="transparent"
                      stroke={matchData.color}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="263.89"
                      strokeDashoffset={263.89 - (263.89 * animScore) / 100}
                      className="transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center text-gray-900">
                    <span className="text-5xl font-extrabold leading-none tracking-tighter">
                      {Math.round(animScore)}
                      <span className="text-2xl">%</span>
                    </span>
                    <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Match score
                    </span>
                  </div>
                </div>
                <span
                  className="rounded-full px-4 py-1.5 text-sm font-bold"
                  style={{
                    color: matchData.color,
                    backgroundColor: `${matchData.color}14`,
                  }}
                >
                  {matchData.text}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[#F7F9FC] px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Matched
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-700">
                    {results.matched.length}
                  </p>
                  <p className="text-xs font-medium text-gray-500">
                    keywords found on resume
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F7F9FC] px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Missing
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-rose-600">
                    {results.missing.length}
                  </p>
                  <p className="text-xs font-medium text-gray-500">
                    gaps vs job description
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F7F9FC] px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Coverage
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-gray-900">
                    {results.coverage}%
                  </p>
                  <p className="text-xs font-medium text-gray-500">
                    of detected JD keywords
                  </p>
                </div>
              </div>
            </div>

            {/* Keyword panels */}
            <div className="grid gap-4 md:grid-cols-2">
              <KeywordPanel
                title="Matched keywords"
                subtitle="Terms from the job description already reflected on your resume"
                items={results.matched}
                variant="matched"
                emptyText="No clear keyword overlap detected yet."
              />
              <KeywordPanel
                title="Missing keywords"
                subtitle="High-value terms to add where you have genuine experience"
                items={results.missing}
                variant="missing"
                emptyText="Great — no major keyword gaps detected."
              />
            </div>

            {/* AI Tip Card */}
            <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-[#F7F9FC] p-6 shadow-md shadow-gray-200/30">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                <Lightbulb size={20} className="text-[#0BAF8A]" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900">AI recommendation</h4>
                <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600">
                  {results?.tip ||
                    "Focus on adding the missing keywords naturally into your experience bullet points. Tailor your resume language to mirror the exact phrasing in the job description to improve ATS pass rates."}
                </p>
              </div>
            </div>

            {/* Reset — prominent CTA after results */}
            <div className="mb-16 mt-10 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[#0BAF8A]/50 bg-gradient-to-b from-[#0BAF8A]/10 to-white px-6 py-8 text-center shadow-sm">
              <p className="text-sm font-semibold text-gray-700">
                Finished reviewing this match?
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-[#0BAF8A] to-[#06D6A0] px-10 py-4 text-[15px] font-bold text-white shadow-lg shadow-teal-300/50 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-teal-300/60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0BAF8A]/40"
              >
                <RotateCcw size={18} strokeWidth={2.5} />
                Analyze Another Resume
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ScoreChecker;
