import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole("accountant")
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const bankName = formData.get("bank_name") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      return NextResponse.json({ error: "Invalid file type. Only CSV and Excel files are accepted." }, { status: 400 })
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 })
    }

    const supabase = await createClient()

    // Build form data for edge function
    const edgeFormData = new FormData()
    edgeFormData.append("file", file)
    edgeFormData.append("imported_by", user.id)
    if (bankName) edgeFormData.append("bank_name", bankName)

    const { data, error } = await supabase.functions.invoke("import-bank-statement", {
      body: edgeFormData,
    })

    if (error) {
      return NextResponse.json({ error: "Import failed", details: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof Response) {
      const body = await err.text()
      return new NextResponse(body, { status: err.status, headers: { "Content-Type": "application/json" } })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
