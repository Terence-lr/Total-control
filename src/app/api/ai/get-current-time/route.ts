import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTime } from '@/ai/flows/get-current-time'

export async function POST(request: NextRequest) {
  try {
    const result = await getCurrentTime()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in get-current-time API:', error)
    return NextResponse.json(
      { error: 'Failed to get current time' },
      { status: 500 }
    )
  }
}
