import { NextRequest, NextResponse } from 'next/server'
import { generateSchedule } from '@/ai/flows/generate-schedule'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await generateSchedule(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in generate-schedule API:', error)
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    )
  }
}
