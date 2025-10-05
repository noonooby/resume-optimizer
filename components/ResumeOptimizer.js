'use client'

import React, { useState, useEffect } from 'react'
import { Upload, FileText, Loader2, Download, RefreshCw, Check, AlertCircle, History, Trash2, X } from 'lucide-react'

export default function ResumeOptimizer() {
  const [masterResume, setMasterResume] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [savedJobDescription, setSavedJobDescription] = useState(null)
  const [loading, setLoading] = useState(false)
  const [optimizedContent, setOptimizedContent] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    loadMasterResume()
    loadHistory()
  }, [])

  const loadMasterResume = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/master_resume?select=*&order=created_at.desc&limit=1`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      })
      const data = await response.json()
      if (data && data.length > 0) {
        setMasterResume(data[0])
      }
    } catch (error) {
      console.error('Error loading master resume:', error)
    }
  }

  const loadHistory = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/generated_resumes?select=*&order=created_at.desc`, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      })
      const data = await response.json()
      setHistory(data || [])
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const handleMasterUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setLoading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-master', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setMasterResume(result.data)
      setError('')
      alert('✓ Resume uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      setError('Upload failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteMasterResume = async () => {
    if (!confirm('Delete master resume?')) return
    
    setLoading(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/master_resume?id=eq.${masterResume.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
      })
      setMasterResume(null)
      setSavedJobDescription(null)
      setOptimizedContent(null)
    } catch (error) {
      setError('Delete failed')
    } finally {
      setLoading(false)
    }
  }

  const saveJobDescription = () => {
    if (!jobTitle.trim() || !companyName.trim() || !jobDescription.trim()) {
      setError('Please fill in all job details')
      return
    }
    setSavedJobDescription({ jobTitle, companyName, jobDescription })
    setError('')
  }

  const generateResume = async () => {
    if (!savedJobDescription) {
      setError('Please save job description first')
      return
    }

    setLoading(true)
    setError('')
    setOptimizedContent(null)
    
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: savedJobDescription.jobDescription,
          masterResume
        })
      })

      if (!response.ok) {
        throw new Error('AI optimization failed')
      }

      const result = await response.json()
      setOptimizedContent(result.data)
    } catch (error) {
      console.error('Generation error:', error)
      setError('Generation failed: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadResume = async () => {
    if (!optimizedContent) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterResumeId: masterResume.id,
          jobTitle: savedJobDescription.jobTitle,
          companyName: savedJobDescription.companyName,
          jobDescription: savedJobDescription.jobDescription,
          optimizedContent
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error('Download failed')
      }

      // Download file
      const blob = new Blob([result.resumeText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${savedJobDescription.jobTitle.replace(/\s+/g, '_')}_Resume.txt`
      a.click()
      URL.revokeObjectURL(url)
      
      loadHistory()
      alert('Resume downloaded!')
    } catch (error) {
      setError('Download failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">AI Resume Optimizer</h1>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History ({history.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* History Sidebar */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20" onClick={() => setShowHistory(false)}>
          <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">History</h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="font-medium text-gray-900 text-sm">{item.job_title}</p>
                  <p className="text-xs text-gray-600">{item.company_name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">No history yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Step 1: Upload Resume */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Step 1: Upload Master Resume</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
            <input
              type="file"
              accept=".docx,.txt,.doc"
              onChange={handleMasterUpload}
              className="hidden"
              id="resume-upload"
              disabled={loading}
            />
            <label htmlFor="resume-upload" className="cursor-pointer">
              {loading ? (
                <Loader2 className="w-10 h-10 text-indigo-600 mx-auto mb-3 animate-spin" />
              ) : (
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              )}
              <p className="font-medium text-gray-700 mb-1">
                {loading ? 'Processing...' : 'Click to upload resume'}
              </p>
              <p className="text-sm text-gray-500">DOCX or TXT format</p>
            </label>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">
              {masterResume ? `✓ ${masterResume.file_name}` : '○ No file selected'}
            </p>
            {masterResume && (
              <button
                onClick={deleteMasterResume}
                className="mt-2 text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete & Re-upload
              </button>
            )}
          </div>
        </div>

        {/* Step 2: Preview Uploaded Resume */}
        {masterResume && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Step 2: Master Resume Preview</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-semibold text-blue-900 mb-2">SUMMARY</p>
                <p className="text-sm text-blue-800">{masterResume.summary}</p>
              </div>
              
              {masterResume.experiences && masterResume.experiences.map((exp, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-bold text-gray-900">{exp.title}</p>
                  <p className="text-xs text-gray-600">{exp.company} • {exp.dates}</p>
                  <ul className="mt-2 space-y-1">
                    {exp.bullets.map((bullet, bidx) => (
                      <li key={bidx} className="text-xs text-gray-700">• {bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Add Job Description */}
        {masterResume && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Step 3: Add Job Details</h2>
            
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Google"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Save Job Description */}
        {masterResume && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Step 4: Save & Confirm</h2>
            
            <button
              onClick={saveJobDescription}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Save Job Description
            </button>
            
            {savedJobDescription && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900">
                  ✓ Saved: {savedJobDescription.jobTitle} at {savedJobDescription.companyName}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Generate */}
        {savedJobDescription && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Step 5: Generate Optimized Resume</h2>
            
            <button
              onClick={generateResume}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Generate Resume
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 6: Preview Generated */}
        {optimizedContent && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Step 6: Generated Resume Preview</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-semibold text-green-900 mb-2">OPTIMIZED SUMMARY</p>
                <p className="text-sm text-green-800">{optimizedContent.summary}</p>
              </div>
              
              {optimizedContent.experiences.map((exp, idx) => (
                <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-bold text-green-900">{exp.title}</p>
                  <p className="text-xs text-green-700">{exp.company} • {exp.dates}</p>
                  <ul className="mt-2 space-y-1">
                    {exp.bullets.map((bullet, bidx) => (
                      <li key={bidx} className="text-xs text-green-800">• {bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Regenerate */}
        {optimizedContent && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Step 7: Refine (Optional)</h2>
            
            <button
              onClick={generateResume}
              disabled={loading}
              className="w-full bg-yellow-600 text-white py-3 rounded-lg font-medium hover:bg-yellow-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Regenerate with AI
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 8: Download */}
        {optimizedContent && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Step 8: Download Resume</h2>
            
            <button
              onClick={downloadResume}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download Resume
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
