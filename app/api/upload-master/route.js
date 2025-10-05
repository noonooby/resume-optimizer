import { NextResponse } from 'next/server'
import mammoth from 'mammoth'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    let text = ''
    if (file.name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      text = buffer.toString('utf-8')
    }
    
    // Parse resume
    const lines = text.split('\n').filter(line => line.trim())
    let summary = ''
    const experiences = []
    let currentSection = ''
    let currentExp = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.toUpperCase().includes('SUMMARY') || line.toUpperCase().includes('OBJECTIVE')) {
        currentSection = 'summary'
        continue
      } else if (line.toUpperCase().includes('EXPERIENCE') || line.toUpperCase().includes('WORK HISTORY')) {
        currentSection = 'experience'
        continue
      } else if (line.toUpperCase().includes('EDUCATION') || line.toUpperCase().includes('SKILLS')) {
        currentSection = 'other'
        continue
      }
      
      if (currentSection === 'summary' && !line.match(/^\d{4}/) && summary.length < 500) {
        summary += (summary ? ' ' : '') + line
      }
      
      if (currentSection === 'experience') {
        const datePattern = /\d{4}\s*[-–]\s*(\d{4}|Present|Current)/i
        
        if (datePattern.test(line)) {
          if (currentExp && currentExp.bullets.length > 0) {
            experiences.push(currentExp)
          }
          
          const dateMatch = line.match(datePattern)
          const parts = line.split('|').map(p => p.trim())
          
          currentExp = {
            company: parts[0] || 'Company',
            title: parts[1] || parts[0] || 'Title',
            dates: dateMatch ? dateMatch[0] : 'Dates',
            bullets: []
          }
        } else if (currentExp && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))) {
          currentExp.bullets.push(line.replace(/^[•\-*]\s*/, ''))
        } else if (currentExp && line.length > 20 && !line.match(/^[A-Z\s]+$/)) {
          currentExp.bullets.push(line)
        }
      }
    }
    
    if (currentExp && currentExp.bullets.length > 0) {
      experiences.push(currentExp)
    }

    // Save to Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY
    
    const dbResponse = await fetch(`${supabaseUrl}/rest/v1/master_resume`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        file_name: file.name,
        file_path: `master_${Date.now()}.txt`,
        summary: summary || 'Professional with experience',
        experiences: experiences
      })
    })

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text()
      return NextResponse.json({ error: 'Database error: ' + errorText }, { status: 500 })
    }

    const data = await dbResponse.json()
    return NextResponse.json({ success: true, data: Array.isArray(data) ? data[0] : data })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
