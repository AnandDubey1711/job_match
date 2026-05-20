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
        data?.overall_score ?? data?.overallScore ?? data?.score ?? 0;
      const matched =
        data?.matched_keywords ?? data?.matchedKeywords ?? data?.matched ?? [];
      const missing =
        data?.missing_keywords ?? data?.missingKeywords ?? data?.missing ?? [];
      const tip = data?.ai_tip ?? data?.aiTip ?? data?.recommendation ?? null;

      setAnimScore(0);
      setResults({ overall, matched, missing, tip });
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
          <div className="w-full max-w-4xl mx-auto pt-6 flex flex-col animate-in fade-in duration-[800ms] fill-mode-forwards ease-out">
            <h2 className="text-3xl font-extrabold text-center tracking-tight mb-10 text-gray-900">
              Analysis Complete
            </h2>

            {/* Top Results Card */}
            <div className="bg-white rounded-[24px] w-full shadow-xl shadow-gray-200/50 p-8 md:p-12 border border-gray-100 flex flex-col md:flex-row items-center md:items-start gap-12">
              {/* Circular Score Ring */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative w-40 h-40 flex items-center justify-center mb-4">
                  <svg
                    className="w-full h-full transform -rotate-90 pointer-events-none"
                    viewBox="0 0 100 100"
                  >
                    {/* Track */}
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="transparent"
                      stroke="#F3F4F6"
                      strokeWidth="8"
                    />
                    {/* Progress */}
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
                  <div className="absolute flex flex-col items-center justify-center text-gray-900">
                    <span className="font-extrabold text-5xl tracking-tighter leading-none relative left-1">
                      {animScore}
                      <span className="text-2xl">%</span>
                    </span>
                  </div>
                </div>
                <div
                  className="px-4 py-1.5 rounded-full font-bold text-sm tracking-wide bg-gray-50"
                  style={{ color: matchData.color }}
                >
                  {matchData.text}
                </div>
              </div>

              {/* Keyword Pills */}
              <div className="flex-1 w-full grid md:grid-cols-2 gap-8">
                {/* Matched */}
                <div>
                  <h4 className="font-bold text-gray-600 uppercase tracking-wide text-xs mb-4">
                    Matched Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {results.matched.map((kw, idx) => (
                      <div
                        key={idx}
                        className="bg-teal-50 border border-teal-100 text-[#0BAF8A] px-3 py-1.5 rounded-full text-[13px] font-semibold flex items-center gap-1.5"
                      >
                        <Check size={14} strokeWidth={3} /> {kw}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing */}
                <div>
                  <h4 className="font-bold text-gray-600 uppercase tracking-wide text-xs mb-4">
                    Missing Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {results.missing.map((kw, idx) => (
                      <div
                        key={idx}
                        className="bg-red-50 border border-red-100 text-red-500 px-3 py-1.5 rounded-full text-[13px] font-semibold flex items-center gap-1.5"
                      >
                        <XIcon size={14} strokeWidth={3} /> {kw}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Tip Card — shows backend tip or a default */}
            <div className="mt-8 bg-white border border-gray-100 border-l-4 border-l-[#0BAF8A] rounded-2xl p-6 shadow-md shadow-gray-200/40 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                <Lightbulb size={20} className="text-[#0BAF8A]" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">
                  AI Recommendation
                </h4>
                <p className="text-sm font-medium text-gray-600 leading-relaxed">
                  {results?.tip ||
                    "Focus on adding the missing keywords naturally into your experience bullet points. Tailor your resume language to mirror the exact phrasing in the job description to improve ATS pass rates."}
                </p>
              </div>
            </div>

            {/* Reset Button */}
            <div className="mt-12 mb-20 text-center">
              <button
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full text-gray-500 font-bold text-[14px] hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <RotateCcw size={16} strokeWidth={2.5} /> Analyze Another Resume
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ScoreChecker;
