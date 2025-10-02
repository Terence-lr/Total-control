import { NextRequest, NextResponse } from 'next/server'
import { addTaskToSchedule } from '@/ai/flows/add-task-to-schedule'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await addTaskToSchedule(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in add-task-to-schedule API:', error)
    return NextResponse.json(
      { error: 'Failed to add task to schedule' },
      { status: 500 }
    )
  }
}
