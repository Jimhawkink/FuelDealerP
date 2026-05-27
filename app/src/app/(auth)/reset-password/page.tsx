"use client"

import { useState } from "react"
import { Fuel, ArrowLeft, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    if (resetError) {
      setError(resetError.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="flex items-center gap-2 mb-6">
          <Fuel className="w-5 h-5 text-amber-500" />
          <span className="text-slate-600 font-medium text-sm">Alpha Fuel Manager</span>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-slate-500 text-sm mb-6">
              We sent a password reset link to <strong>{email}</strong>
            </p>
            <a href="/login" className="text-amber-600 hover:text-amber-700 font-medium text-sm">
              Back to sign in
            </a>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Reset password</h2>
            <p className="text-slate-500 text-sm mb-6">
              Enter your email and we will send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50 outline-none text-sm"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm"
                style={{ background: "linear-gradient(135deg, #F59E0B, #EA580C)" }}
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <a
              href="/login"
              className="flex items-center gap-1 mt-4 text-slate-500 hover:text-slate-700 text-sm"
            >
              <ArrowLeft className="w-3 h-3" /> Back to sign in
            </a>
          </>
        )}
      </div>
    </div>
  )
}
