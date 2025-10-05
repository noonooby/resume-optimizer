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
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line)
    
    let summary = ''
    const experiences = []
    let currentSection = ''
    let currentExp = null
    let summaryLines = []
    let foundFirstSection = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.match(/^(Certifications?|Work Experience|Experience|Education|Skills|Projects)/i)) {
        foundFirstSection = true
        currentSection = line.toLowerCase()
        
        if (!summary && summaryLines.length > 0) {
          summary = summaryLines.join(' ')
        }
        continue
      }
      
      if (!foundFirstSection) {
        summaryLines.push(line)
        continue
      }
      
      if (currentSection.includes('experience')) {
        if (line.startsWith('###')) {
          const cleanLine = line.replace(/^###\s*/, '')
          const parts = cleanLine.split(',').map(p => p.trim())
          
          if (parts.length >= 3) {
            if (currentExp && currentExp.bullets.length > 0) {
              experiences.push(currentExp)
            }
            
            const lastPart = parts[parts.length - 1]
            const dateMatch = lastPart.match(/([A-Za-z]+\s+\d{4}\s*-\s*[A-Za-z]+\s*\d{0,4}|[A-Za-z]+\s+\d{4}\s*-\s*PRESENT)/i)
            
            currentExp = {
              company: parts[0],
              title: parts[1],
              dates: dateMatch ? dateMatch[1] : lastPart,
              bullets: []
            }
          }
        }
        else if (currentExp && (line.startsWith('-') || line.startsWith('•') || line.startsWith('*'))) {
          const bullet = line.replace(/^[-•*]\s*/, '').trim()
          // PRESERVE bold markers (**text**)
          if (bullet.length > 10) {
            currentExp.bullets.push(bullet)
          }
        }
      }
    }
    
    if (currentExp && currentExp.bullets.length > 0) {
      experiences.push(currentExp)
    }
    
    if (!summary && summaryLines.length > 0) {
      summary = summaryLines.join(' ')
    }

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
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const data = await dbResponse.json()
    return NextResponse.json({ success: true, data: Array.isArray(data) ? data[0] : data })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
