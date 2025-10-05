import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { masterResumeId, jobTitle, companyName, jobDescription, optimizedContent } = await request.json()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY
    
    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/generated_resumes`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        master_resume_id: masterResumeId,
        job_title: jobTitle,
        company_name: companyName,
        job_description: jobDescription,
        file_path: `resume_${Date.now()}.txt`
      })
    })

    if (!dbResponse.ok) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const data = await dbResponse.json()

    // Generate text with preserved bold formatting
    let resumeText = `${optimizedContent.summary}\n\n`
    resumeText += 'WORK EXPERIENCE\n\n'
    
    optimizedContent.experiences.forEach(exp => {
      resumeText += `${exp.company}, ${exp.title}, ${exp.dates}\n\n`
      exp.bullets.forEach(bullet => {
        // Keep ** markers in output
        resumeText += `- ${bullet}\n`
      })
      resumeText += '\n'
    })

    return NextResponse.json({ 
      success: true, 
      data: Array.isArray(data) ? data[0] : data,
      resumeText: resumeText
    })
  } catch (error) {
    console.error('Finalize error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
