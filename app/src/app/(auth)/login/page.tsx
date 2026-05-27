"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, Fuel } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [shake, setShake] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError("Invalid email or password. Please try again.")
      triggerShake()
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* LEFT BRAND PANEL */}
      <div
        className="relative hidden md:flex md:w-3/5 flex-col items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 30%, #92400E 70%, #F59E0B 100%)",
          backgroundSize: "400% 400%",
          animation: "gradientShift 8s ease infinite",
        }}
      >
        <style>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
            20%, 40%, 60%, 80% { transform: translateX(8px); }
          }
          .shake { animation: shake 0.6s ease-in-out; }
          .float-label-input:focus ~ label,
          .float-label-input:not(:placeholder-shown) ~ label {
            transform: translateY(-1.5rem) scale(0.85);
            color: #F59E0B;
          }
        `}</style>

        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full bg-amber-500/10" />
        <div className="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full bg-amber-400/10" />
        <div className="absolute top-1/2 left-[-40px] w-48 h-48 rounded-full bg-slate-700/30" />

        <div className="relative z-10 text-center px-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Fuel className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Alpha Fuel Manager
          </h1>
          <p className="text-amber-200 text-xl mt-4 font-light">
            Fuel your business.
          </p>
          <p className="text-amber-300 text-xl font-semibold">
            Control your cash.
          </p>
          <div className="mt-10 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-amber-300 animate-pulse delay-150" />
            <div className="w-2 h-2 rounded-full bg-amber-200 animate-pulse delay-300" />
          </div>
        </div>
      </div>

      {/* MOBILE TOP BANNER */}
      <div
        className="md:hidden flex items-center justify-center gap-3 py-6 px-4"
        style={{ background: "linear-gradient(135deg, #0F172A, #F59E0B)" }}
      >
        <Fuel className="w-6 h-6 text-amber-300" />
        <span className="text-white font-bold text-xl">Alpha Fuel Manager</span>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-4 py-12">
        <div
          className={`w-full max-w-md ${shake ? "shake" : ""}`}
          style={{
            backdropFilter: "blur(12px)",
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(203,213,225,0.8)",
            borderRadius: "1.25rem",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
            padding: "2.5rem",
          }}
        >
          {/* Card header */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Fuel className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-slate-600 font-medium text-sm">Alpha Fuel Manager</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder=" "
                required
                className={`float-label-input peer w-full px-4 pt-5 pb-2 rounded-xl border text-slate-900 text-sm outline-none transition-all bg-white ${
                  error
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50"
                }`}
              />
              <label
                htmlFor="email"
                className="absolute left-4 top-3.5 text-slate-400 text-sm transition-all duration-200 pointer-events-none origin-left"
                style={{
                  transform: email || emailFocused ? "translateY(-1.1rem) scale(0.8)" : undefined,
                  color: emailFocused ? "#F59E0B" : undefined,
                }}
              >
                Email address
              </label>
            </div>

            {/* Password field */}
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder=" "
                required
                className={`float-label-input peer w-full px-4 pt-5 pb-2 pr-12 rounded-xl border text-slate-900 text-sm outline-none transition-all bg-white ${
                  error
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50"
                }`}
              />
              <label
                htmlFor="password"
                className="absolute left-4 top-3.5 text-slate-400 text-sm transition-all duration-200 pointer-events-none origin-left"
                style={{
                  transform: password || passwordFocused ? "translateY(-1.1rem) scale(0.8)" : undefined,
                  color: passwordFocused ? "#F59E0B" : undefined,
                }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <a
                href="/reset-password"
                className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: loading
                  ? "#D97706"
                  : "linear-gradient(135deg, #F59E0B, #EA580C)",
                boxShadow: loading ? "none" : "0 4px 15px rgba(245,158,11,0.4)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
