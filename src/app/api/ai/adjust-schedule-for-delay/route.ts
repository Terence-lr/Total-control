import { NextRequest, NextResponse } from 'next/server'
import { adjustScheduleForDelay } from '@/ai/flows/adjust-schedule-for-delay'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await adjustScheduleForDelay(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in adjust-schedule-for-delay API:', error)
    return NextResponse.json(
      { error: 'Failed to adjust schedule for delay' },
      { status: 500 }
    )
  }
}
