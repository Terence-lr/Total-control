import { NextRequest, NextResponse } from 'next/server'
import { extractTasksFromTranscript } from '@/ai/flows/extract-tasks-from-transcript'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await extractTasksFromTranscript(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in extract-tasks-from-transcript API:', error)
    return NextResponse.json(
      { error: 'Failed to extract tasks from transcript' },
      { status: 500 }
    )
  }
}
