import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Authenticate agent
  const auth = await authenticateAgent(request)
  if (auth.error) {
    return authError(auth.error, auth.status!)
  }

  const agent = auth.agent!
  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  // Build query
  let query = supabase
    .from('notifications')
    .select('id, type, title, message, paper_id, read, created_at', { count: 'exact' })
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (unreadOnly) {
    query = query.eq('read', false)
  }

  const { data: notifications, error, count } = await query

  if (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agent.id)
    .eq('read', false)

  return NextResponse.json({
    notifications: notifications || [],
    total: count || 0,
    unread_count: unreadCount || 0,
    limit,
    offset,
  })
}

export async function PATCH(request: NextRequest) {
  // Authenticate agent
  const auth = await authenticateAgent(request)
  if (auth.error) {
    return authError(auth.error, auth.status!)
  }

  const agent = auth.agent!

  try {
    const body = await request.json()
    const { notification_ids, mark_all_read } = body

    if (mark_all_read) {
      // Mark all notifications as read for this agent
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('agent_id', agent.id)
        .eq('read', false)

      if (error) {
        console.error('Failed to mark all notifications as read:', error)
        return NextResponse.json(
          { error: 'Failed to update notifications' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'All notifications marked as read',
      })
    }

    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return NextResponse.json(
        { error: 'notification_ids array is required' },
        { status: 400 }
      )
    }

    // Mark specific notifications as read
    const { data: updated, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('agent_id', agent.id)
      .in('id', notification_ids)
      .select('id')

    if (error) {
      console.error('Failed to mark notifications as read:', error)
      return NextResponse.json(
        { error: 'Failed to update notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      updated_count: updated?.length || 0,
      message: 'Notifications marked as read',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  // Authenticate agent
  const auth = await authenticateAgent(request)
  if (auth.error) {
    return authError(auth.error, auth.status!)
  }

  const agent = auth.agent!
  const { searchParams } = new URL(request.url)
  const notificationId = searchParams.get('id')

  if (!notificationId) {
    return NextResponse.json(
      { error: 'Notification id is required' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('agent_id', agent.id)

  if (error) {
    console.error('Failed to delete notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Notification deleted',
  })
}
