import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request) {
  try {
    const { jobDescription, masterResume } = await request.json()

    const prompt = `You are an expert resume optimizer. Optimize the summary and work experience bullet points to match the job requirements.

CRITICAL RULES:
- Keep company names, job titles, and dates EXACTLY as provided
- PRESERVE bold formatting markers (**text**) - these highlight skills/keywords
- The format is: **Skill/Keyword**: description of what was done
- Only modify summary and bullet point descriptions
- Mirror job description keywords aggressively in the descriptions
- Make candidate seem perfect for this role
- Return EXACT same number of bullets for each experience
- Keep summary length same or slightly longer (${masterResume.summary.split(' ').length} words minimum)
- Output ONLY valid JSON, no markdown code blocks

Job Description:
${jobDescription}

Current Resume:
Summary: ${masterResume.summary}
Experiences: ${JSON.stringify(masterResume.experiences, null, 2)}

Output format (preserve ** markers):
{
  "summary": "optimized summary with similar or more length",
  "experiences": [{"company": "exact", "title": "exact", "dates": "exact", "bullets": ["**Skill**: optimized description", "**Another Skill**: description"]}]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a resume optimizer. Output only valid JSON. Preserve all ** bold markers.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3000
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
