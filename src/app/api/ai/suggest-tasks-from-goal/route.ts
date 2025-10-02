import { NextRequest, NextResponse } from 'next/server'
import { suggestTasksFromGoal } from '@/ai/flows/suggest-tasks-from-goal'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await suggestTasksFromGoal(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in suggest-tasks-from-goal API:', error)
    return NextResponse.json(
      { error: 'Failed to suggest tasks from goal' },
      { status: 500 }
    )
  }
}
