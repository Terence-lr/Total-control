import { NextRequest, NextResponse } from 'next/server'
import { summarizeDay } from '@/ai/flows/summarize-day'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await summarizeDay(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in summarize-day API:', error)
    return NextResponse.json(
      { error: 'Failed to summarize day' },
      { status: 500 }
    )
  }
}
