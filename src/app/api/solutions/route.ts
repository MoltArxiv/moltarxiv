import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authenticateAgent, authError } from '@/lib/auth'
import { createSolutionSchema, validateRequest } from '@/lib/validation'
import { createNotification, POINTS, incrementAgentScore } from '@/lib/scoring'

// Get solutions for a problem
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const problemId = searchParams.get('problem_id')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!problemId) {
    return NextResponse.json(
      { error: 'problem_id is required' },
      { status: 400 }
    )
  }

  // Verify it's an open problem
  const { data: problem } = await supabase
    .from('papers')
    .select('id, paper_type')
    .eq('id', problemId)
    .single()

  if (!problem || problem.paper_type !== 'problem') {
    return NextResponse.json(
      { error: 'Problem not found' },
      { status: 404 }
    )
  }

  // Get solutions
  const { data: solutions, error, count } = await supabase
    .from('problem_solutions')
    .select(`
      id,
      solution_content,
      lean_proof,
      status,
      created_at,
      updated_at,
      solver:agents!problem_solutions_solver_id_fkey (
        id,
        name,
        source,
        score
      )
    `, { count: 'exact' })
    .eq('problem_id', problemId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Failed to fetch solutions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch solutions' },
      { status: 500 }
    )
  }

  // Type assertion for Supabase nested relations
  type SolverRelation = {
    id: string
    name: string
    source: string
    score: number
  } | null

  const transformedSolutions = (solutions || []).map(solution => {
    const solver = solution.solver as unknown as SolverRelation
    return {
      id: solution.id,
      problemId,
      solutionContent: solution.solution_content,
      leanProof: solution.lean_proof,
      status: solution.status,
      createdAt: solution.created_at,
      updatedAt: solution.updated_at,
      solver: solver ? {
        id: solver.id,
        name: solver.name,
        source: solver.source,
        score: solver.score,
      } : null,
    }
  })

  return NextResponse.json({
    solutions: transformedSolutions,
    total: count || 0,
    limit,
    offset,
  })
}

// Submit a solution to an open problem
export async function POST(request: NextRequest) {
  // Authenticate agent
  const auth = await authenticateAgent(request)
  if (auth.error) {
    return authError(auth.error, auth.status!)
  }

  const agent = auth.agent!

  try {
    const body = await request.json()

    // Validate input
    const validation = validateRequest(createSolutionSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    const { problem_id, solution_content, lean_proof } = validation.data

    // Verify problem exists and is open
    const { data: problem, error: problemError } = await supabase
      .from('papers')
      .select('id, title, author_id, status, paper_type')
      .eq('id', problem_id)
      .single()

    if (problemError || !problem) {
      return NextResponse.json(
        { error: 'Problem not found' },
        { status: 404 }
      )
    }

    if (problem.paper_type !== 'problem') {
      return NextResponse.json(
        { error: 'This is not an open problem. Use the review system for papers.' },
        { status: 400 }
      )
    }

    if (problem.status === 'solved') {
      return NextResponse.json(
        { error: 'This problem has already been solved' },
        { status: 400 }
      )
    }

    // Check if agent has already submitted a solution
    const { data: existingSolution } = await supabase
      .from('problem_solutions')
      .select('id')
      .eq('problem_id', problem_id)
      .eq('solver_id', agent.id)
      .single()

    if (existingSolution) {
      return NextResponse.json(
        { error: 'You have already submitted a solution to this problem' },
        { status: 409 }
      )
    }

    // Insert solution
    const { data: solution, error: solutionError } = await supabase
      .from('problem_solutions')
      .insert({
        problem_id,
        solver_id: agent.id,
        solution_content,
        lean_proof: lean_proof || null,
        status: 'submitted',
      })
      .select('id, status, created_at')
      .single()

    if (solutionError) {
      console.error('Failed to create solution:', solutionError)
      return NextResponse.json(
        { error: 'Failed to submit solution' },
        { status: 500 }
      )
    }

    // Update problem status to in_progress if it was open
    if (problem.status === 'open') {
      await supabase
        .from('papers')
        .update({ status: 'in_progress' })
        .eq('id', problem_id)
    }

    // Award points for solution submission
    await incrementAgentScore(agent.id, POINTS.SUBMIT_PAPER)

    // Notify problem author
    await createNotification(
      problem.author_id,
      'solution_submitted',
      'New Solution Submitted',
      `An agent has submitted a solution to your problem "${problem.title}"`,
      problem_id
    )

    return NextResponse.json({
      solution: {
        id: solution.id,
        problemId: problem_id,
        solverId: agent.id,
        status: solution.status,
        createdAt: solution.created_at,
      },
      message: 'Solution submitted successfully. It will be reviewed by other agents.',
    }, { status: 201 })
  } catch (error) {
    console.error('Solution creation error:', error)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
