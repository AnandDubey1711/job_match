import React, { useState } from "react";
import {
  Briefcase,
  Menu,
  X as XIcon,
  FileText,
  ChevronRight,
  Check,
  PlayCircle,
  BarChart,
  Target,
  ArrowRight,
  Plus,
  Minus,
  UploadCloud,
  FileSearch,
  CheckCircle,
  Award,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Homepage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const navigate = useNavigate();

  const getStarted = () => {
    window.scrollTo(0, 0);
    navigate("/analyze");
  };

  const faqs = [
    {
      q: "How does the AI matching work?",
      a: "Our AI scans your resume and compares it directly against the job description you provide, identifying missing skills and keyword gaps that ATS filters look for.",
    },
    {
      q: "Is this tool completely free?",
      a: "Yes! Currently, our resume vs. job description matching tool is 100% free with no account required.",
    },
    {
      q: "What file formats do you support?",
      a: "We support standard PDF format and support for other formats will be available soon.",
    },
  ];

  return (
    <div className="font-sans min-h-screen bg-[#F7F9FC] selection:bg-[#0BAF8A]/20 text-gray-900 flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#F7F9FC]/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex justify-between items-center h-[80px]">
            {/* Logo Text-Only*/}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => window.scrollTo(0, 0)}
            >
              <span className="text-2xl tracking-tight text-gray-900 font-black">
                Resume<span className="font-bold text-[#0BAF8A]">IQ</span>
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-14">
              <span
                onClick={getStarted}
                className="text-base font-semibold text-gray-600 hover:text-[#0BAF8A] cursor-pointer transition-colors"
              >
                Match Resume
              </span>
              <span className="text-base font-semibold text-gray-600 hover:text-[#0BAF8A] cursor-pointer transition-colors">
                Features
              </span>
            </div>

            {/* Auth/CTA Navbar */}
            <div className="hidden lg:flex items-center space-x-6">
              <button
                onClick={getStarted}
                className="px-8 py-3 rounded-full bg-[#0BAF8A] text-white font-semibold text-sm tracking-wide shadow-sm hover:shadow-md transition-shadow"
              >
                GET STARTED
              </button>
            </div>

            {/* Mobile Nav Toggle */}
            <div className="lg:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <XIcon size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-6 space-y-6 shadow-xl">
            <span
              className="block font-bold text-gray-700 text-lg"
              onClick={() => {
                setIsMobileMenuOpen(false);
                getStarted();
              }}
            >
              Match Resume
            </span>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                getStarted();
              }}
              className="w-full text-center py-4 bg-[#0BAF8A] text-white font-semibold rounded-full shadow-md"
            >
              GET STARTED
            </button>
          </div>
        )}
      </nav>

      <main className="flex-grow pt-[80px]">
        {/* --- Hero Section --- */}
        <section className="px-4 md:px-8 max-w-[1400px] mx-auto py-24 min-h-[560px] flex items-center">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-8 items-center w-full">
            {/* Left Box (Fake Tool UI) */}
            <div className="order-2 lg:order-1 relative px-2 md:px-0">
              <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-200 overflow-hidden w-full aspect-[4/3] flex flex-col relative z-10 transition-transform duration-500 hover:scale-[1.01]">
                <div className="h-10 bg-gradient-to-r from-[#0BAF8A] to-[#06D6A0] border-b border-gray-200 flex items-center px-4 gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                </div>

                {/* Fake UI MOCKUP */}
                <div className="w-full flex-grow relative bg-[#F7F9FC] p-5 flex flex-col gap-4 overflow-hidden pointer-events-none">
                  {/* Fake Headers */}
                  <div className="w-32 h-4 bg-gray-200 rounded-full mb-1 bg-gradient-to-r from-[#0BAF8A] to-[#06D6A0]"></div>

                  {/* Fake Layout */}
                  <div className="flex gap-4 h-full">
                    {/* Fake Dropzone */}
                    <div className="w-1/2 border-2 border-dashed border-teal-300 bg-teal-50/40 rounded-xl flex flex-col items-center justify-center p-4">
                      <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-3 text-[#0BAF8A]">
                        <UploadCloud size={20} />
                      </div>
                      <div className="w-24 h-2.5 bg-gray-300 rounded-full mb-2"></div>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full"></div>
                    </div>
                    {/* Fake Analysis */}
                    <div className="w-1/2 bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col items-center justify-center relative">
                      <div className="absolute top-3 left-3 w-16 h-2 bg-gray-100 rounded-full bg-gradient-to-r from-[#0BAF8A] to-[#06D6A0]"></div>
                      <div className="relative w-28 h-28 mb-4">
                        <svg
                          className="w-full h-full transform -rotate-90 pointer-events-none"
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
                            stroke="#0BAF8A"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray="263.89"
                            strokeDashoffset="34.3"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                          <span className="font-extrabold text-2xl text-gray-800 leading-none">
                            87%
                          </span>
                        </div>
                      </div>
                      <div className="w-24 h-3 bg-gray-200 rounded-full mb-2"></div>
                      <div className="w-32 h-2 bg-gray-100 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subtle visual accent behind card */}
              <div className="absolute top-10 -right-6 w-full h-full bg-gradient-to-tr from-[#E8F5F0] to-transparent rounded-3xl -z-10 opacity-60 mix-blend-multiply blur-xl hidden md:block"></div>
            </div>

            {/* Right Text */}
            <div className="order-1 lg:order-2 lg:pl-12">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-400 text-teal-700 text-[13px] font-bold tracking-wide mb-6 shadow-sm bg-white">
                <span className="text-base leading-none relative -top-0.5">
                  ✦
                </span>{" "}
                Free · No Signup · Instant Results
              </div>

              <p className="text-[18px] font-semibold text-gray-500 mb-2">
                Tailor Your Resume to Any Job.
              </p>

              <h1 className="text-[52px] lg:text-[72px] font-extrabold leading-[1.05] tracking-tight text-gray-900 mb-6">
                Do it with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-400">
                  AI
                </span>
              </h1>

              <p className="max-w-md text-[17px] md:text-[19px] text-gray-600 font-medium mb-10 leading-relaxed">
                Upload your resume, paste the job description, and get instant
                keyword gap analysis and matching scores to beat ATS filters.
              </p>

              <button
                onClick={getStarted}
                className="px-8 py-3 rounded-full bg-gradient-to-r from-[#0BAF8A] to-[#06D6A0] text-white font-bold tracking-wide text-sm shadow-lg shadow-[#0BAF8A]/20 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95"
              >
                START MATCHING
              </button>
            </div>
          </div>
        </section>

        {/* --- STATS STRIP --- */}
        <section className="border-y border-gray-200 bg-white shadow-sm overflow-hidden min-w-full">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-[#0BAF8A]">
                  <FileText size={20} />
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-gray-900 tracking-tight leading-none">
                    50,000+
                  </p>
                  <p className="text-xs text-gray-500 font-bold uppercase mt-1 tracking-wider">
                    Resumes Analyzed
                  </p>
                </div>
              </div>
              <div className="hidden md:block w-px h-10 bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-[#0BAF8A]">
                  <CheckCircle size={20} />
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-gray-900 tracking-tight leading-none">
                    Free Forever
                  </p>
                  <p className="text-xs text-gray-500 font-bold uppercase mt-1 tracking-wider">
                    No Paywalls
                  </p>
                </div>
              </div>
              <div className="hidden md:block w-px h-10 bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-[#0BAF8A]">
                  <Target size={20} />
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-gray-900 tracking-tight leading-none">
                    No Account
                  </p>
                  <p className="text-xs text-gray-500 font-bold uppercase mt-1 tracking-wider">
                    Required
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS SECTION --- */}
        <section className="py-24 px-4 md:px-8 bg-[#F7F9FC]">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
                How It Works
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connecting Lines for Desktop */}
              <div className="hidden md:block absolute top-[40px] left-1/6 right-1/6 h-0.5 bg-gray-200 -z-10"></div>

              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white shadow-sm border-2 border-[#0BAF8A] rounded-full flex items-center justify-center text-[#0BAF8A] mb-6 relative bg-clip-padding">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center text-sm border-2 border-[#F7F9FC]">
                    1
                  </div>
                  <UploadCloud size={32} />
                </div>
                <h4 className="font-bold text-xl text-gray-900 mb-2">
                  Upload Resume
                </h4>
                <p className="text-gray-500 font-medium">
                  Quickly drop in your current resume file directly into our
                  secure tool.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white shadow-sm border-2 border-[#0BAF8A] rounded-full flex items-center justify-center text-[#0BAF8A] mb-6 relative bg-clip-padding">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center text-sm border-2 border-[#F7F9FC]">
                    2
                  </div>
                  <FileSearch size={32} />
                </div>
                <h4 className="font-bold text-xl text-gray-900 mb-2">
                  Paste Job Description
                </h4>
                <p className="text-gray-500 font-medium">
                  Copy the text of the job listing you want to target and paste
                  it.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white shadow-sm border-2 border-[#0BAF8A] rounded-full flex items-center justify-center text-[#0BAF8A] mb-6 relative bg-clip-padding">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-gray-900 text-white font-bold flex items-center justify-center text-sm border-2 border-[#F7F9FC]">
                    3
                  </div>
                  <Award size={32} />
                </div>
                <h4 className="font-bold text-xl text-gray-900 mb-2">
                  Get Your Score
                </h4>
                <p className="text-gray-500 font-medium">
                  Instantly reveal keyword gaps and your specific ATS
                  compatibility rank.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* --- NO.1 AI JOB PLATFORM MATCH CARD SECTION (ATS) --- */}
        <section className="bg-white py-24 px-4 md:px-8 border-t border-gray-100">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid lg:grid-cols-2 gap-20 lg:gap-8 items-center">
              {/* Left Text */}
              <div className="max-w-lg xl:pr-10">
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.2] mb-6 text-gray-900">
                  ATS Compatibility Check
                </h3>
                <p className="text-[17px] font-medium text-gray-600 leading-relaxed mb-8">
                  See exactly what keywords you're missing before you submit
                  your application. Get evaluated instantly by the same metrics
                  recruiters use.
                </p>

                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-gray-700 font-medium text-[15px]">
                    <div className="w-5 h-5 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                      <Check
                        size={14}
                        strokeWidth={3.5}
                        className="text-[#0BAF8A]"
                      />
                    </div>
                    Keyword match rate vs job description
                  </li>
                  <li className="flex items-center gap-3 text-gray-700 font-medium text-[15px]">
                    <div className="w-5 h-5 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                      <Check
                        size={14}
                        strokeWidth={3.5}
                        className="text-[#0BAF8A]"
                      />
                    </div>
                    Experience & skills alignment score
                  </li>
                  <li className="flex items-center gap-3 text-gray-700 font-medium text-[15px]">
                    <div className="w-5 h-5 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                      <Check
                        size={14}
                        strokeWidth={3.5}
                        className="text-[#0BAF8A]"
                      />
                    </div>
                    ATS filter pass probability
                  </li>
                </ul>

                <button
                  onClick={getStarted}
                  className="px-8 py-4 rounded-full bg-white border-2 border-gray-200 text-gray-800 font-bold tracking-wide text-[15px] hover:border-[#0BAF8A] hover:text-[#0BAF8A] shadow-sm transition-all"
                >
                  Analyze My Resume
                </button>
              </div>

              {/* Right Floating Card Illustration */}
              <div className="relative py-10 overflow-visible h-full flex items-center justify-center min-h-[500px]">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] bg-gradient-to-tr from-[#E8F5F0] to-[#F7F9FC] rounded-[40px] rotate-[-2deg] opacity-70"></div>

                <div className="relative z-10 w-full max-w-[420px] bg-white rounded-2xl shadow-2xl border-l-[6px] border-[#0BAF8A] p-8 md:p-10 transition-transform duration-500 hover:-translate-y-2">
                  {/* 95% Overall Badge */}
                  <div className="absolute -top-6 -right-6 w-[100px] h-[100px] rounded-full bg-gradient-to-tr from-[#0BAF8A] to-[#06D6A0] flex flex-col justify-center items-center text-white shadow-xl rotate-[8deg]">
                    <span className="text-4xl font-extrabold font-sans leading-none">
                      95<span className="text-xl">%</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest mt-0.5">
                      Overall
                    </span>
                  </div>

                  <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-6 mt-2">
                    <div className="w-14 h-14 bg-gray-900 rounded-lg flex items-center justify-center text-white text-3xl font-extrabold shadow-sm">
                      R
                    </div>
                    <div>
                      <div className="inline-block px-2.5 py-0.5 bg-[#E8F5F0] text-[#0BAF8A] font-bold text-[10px] rounded uppercase mb-1">
                        Target Role
                      </div>
                      <h4 className="text-[19px] text-gray-900 font-bold leading-tight mb-0.5">
                        Senior Data Analyst
                      </h4>
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-2 mb-8">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full border-[3.5px] border-[#0BAF8A] flex items-center justify-center mb-2 shadow-sm bg-white">
                        <span className="font-extrabold text-xl tracking-tighter text-gray-900">
                          95<span className="text-sm">%.</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        Exp. Level
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full border-[3.5px] border-[#06D6A0] flex items-center justify-center mb-2 shadow-sm bg-white">
                        <span className="font-extrabold text-xl tracking-tighter text-gray-900">
                          93<span className="text-sm">%.</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                        Skill
                      </span>
                    </div>
                  </div>

                  {/* Why fit */}
                  <div className="bg-gray-50 -mx-8 -mb-10 px-8 py-8 rounded-b-2xl border-t border-gray-100">
                    <h5 className="font-bold text-[15px] mb-4 text-gray-900">
                      Keyword Analysis
                    </h5>
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-3">
                        <div className="px-2.5 py-1.5 rounded-md bg-[#0BAF8A] text-white flex items-center gap-1.5 text-xs font-bold shadow-sm">
                          <Check size={14} strokeWidth={3} /> SQL & Python
                        </div>
                        <div className="h-2 w-20 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="px-2.5 py-1.5 rounded-md border border-[#0BAF8A]/30 text-[#0BAF8A] flex items-center gap-1.5 text-xs font-bold bg-white shadow-sm">
                          <XIcon size={14} strokeWidth={3} /> Tableau
                        </div>
                        <div className="h-2 w-12 bg-gray-200 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- FAQ SECTION --- */}
        <section className="bg-[#E8F5F0] py-24 px-4 md:px-8 border-t border-gray-200">
          <div className="max-w-[700px] mx-auto">
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 text-center leading-[1.1] tracking-tight mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-white hover:bg-gray-50 rounded-2xl overflow-hidden transition-colors duration-200 shadow-sm border border-[#0BAF8A]/10"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                    className="w-full px-6 py-5 flex justify-between items-center text-left"
                  >
                    <span className="text-base font-semibold text-gray-800 pr-8">
                      {faq.q}
                    </span>
                    <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center shrink-0 bg-white shadow-sm">
                      {openFaq === idx ? (
                        <Minus size={16} className="text-gray-500" />
                      ) : (
                        <Plus size={16} className="text-[#0BAF8A]" />
                      )}
                    </div>
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-6 text-sm font-medium text-gray-600 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* --- Footer --- */}
      <footer className="bg-gray-900 text-white py-12 px-4 md:px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => window.scrollTo(0, 0)}
          >
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Resume<span className="text-[#0BAF8A]">IQ</span>
            </span>
          </div>

          <div className="flex gap-8 text-sm font-semibold text-gray-400">
            <span className="hover:text-white cursor-pointer transition-colors">
              Privacy Policy
            </span>
            <span className="hover:text-white cursor-pointer transition-colors">
              Terms of Service
            </span>
            <span className="hover:text-white cursor-pointer transition-colors">
              Contact
            </span>
          </div>

          <div className="text-sm font-medium text-gray-500">
            © {new Date().getFullYear()} ResumeIQ. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
