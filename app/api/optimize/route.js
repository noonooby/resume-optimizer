import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const { jobDescription, masterResume } = await request.json()

    const prompt = `You are an expert resume optimizer. Optimize the summary and work experience bullet points to match the job requirements.

RULES:
- Keep company names, job titles, and dates EXACTLY as provided
- Only modify summary and bullet points
- Mirror job description keywords aggressively
- Make candidate seem perfect for this role
- Return EXACT same number of bullets for each experience
- Output ONLY valid JSON, no markdown

Job Description:
${jobDescription}

Current Resume:
Summary: ${masterResume.summary}
Experiences: ${JSON.stringify(masterResume.experiences, null, 2)}

Output format:
{
  "summary": "optimized summary",
  "experiences": [{"company": "exact", "title": "exact", "dates": "exact", "bullets": ["bullet1", "bullet2"]}]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a resume optimizer. Output only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2500
    })

    const content = completion.choices[0].message.content.trim()
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    
    const optimized = JSON.parse(content)

    return NextResponse.json({ success: true, data: optimized })
  } catch (error) {
    console.error('Optimization error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
