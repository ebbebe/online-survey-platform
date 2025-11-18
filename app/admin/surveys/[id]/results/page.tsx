'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Survey, Response } from '@/lib/types/survey'
import { Download, ArrowLeft, Users, Trash2, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { deleteResponse, deleteMultipleResponses } from '@/app/admin/actions'

export default function SurveyResultsPage() {
  const params = useParams()
  const surveyId = params.id as string

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<Response[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedResponses, setSelectedResponses] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()

        // Fetch survey
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('*')
          .eq('id', surveyId)
          .single()

        if (surveyError) throw surveyError

        // Fetch responses
        const { data: responsesData, error: responsesError } = await supabase
          .from('responses')
          .select('*')
          .eq('survey_id', surveyId)
          .order('created_at', { ascending: false })

        if (responsesError) throw responsesError

        setSurvey(surveyData as Survey)
        setResponses(responsesData as Response[])
      } catch (err: any) {
        setError(err.message || '데이터를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // 실시간 업데이트를 위한 polling (5초마다)
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [surveyId])

  const handleSelectAll = () => {
    if (selectedResponses.size === responses.length) {
      setSelectedResponses(new Set())
    } else {
      setSelectedResponses(new Set(responses.map((r) => r.id)))
    }
  }

  const handleSelectOne = (responseId: string) => {
    const newSelected = new Set(selectedResponses)
    if (newSelected.has(responseId)) {
      newSelected.delete(responseId)
    } else {
      newSelected.add(responseId)
    }
    setSelectedResponses(newSelected)
  }

  const handleDeleteOne = async (responseId: string) => {
    if (!confirm('이 응답을 삭제하시겠습니까?')) {
      return
    }

    setDeleting(true)
    const result = await deleteResponse(responseId)

    if (result.error) {
      alert(`삭제 실패: ${result.error}`)
    } else {
      // 낙관적 UI 업데이트
      setResponses((prev) => prev.filter((r) => r.id !== responseId))
      setSelectedResponses((prev) => {
        const newSet = new Set(prev)
        newSet.delete(responseId)
        return newSet
      })
    }
    setDeleting(false)
  }

  const handleDeleteSelected = async () => {
    if (selectedResponses.size === 0) {
      return
    }

    if (!confirm(`선택한 ${selectedResponses.size}개의 응답을 삭제하시겠습니까?`)) {
      return
    }

    setDeleting(true)
    const result = await deleteMultipleResponses(Array.from(selectedResponses))

    if (result.error) {
      alert(`삭제 실패: ${result.error}`)
    } else {
      // 낙관적 UI 업데이트
      setResponses((prev) => prev.filter((r) => !selectedResponses.has(r.id)))
      setSelectedResponses(new Set())
    }
    setDeleting(false)
  }

  const calculateStatistics = (sectionId: string, questionId: string) => {
    const values = responses
      .map((r) => r.section_answers[sectionId]?.[questionId])
      .filter((v) => v !== undefined && v !== null && v > 0)

    if (values.length === 0) {
      return {
        average: 0,
        distribution: [0, 0, 0, 0, 0],
        count: 0,
      }
    }

    const sum = values.reduce((acc, val) => acc + val, 0)
    const average = sum / values.length

    const distribution = [0, 0, 0, 0, 0]
    values.forEach((val) => {
      if (val >= 1 && val <= 5) {
        distribution[val - 1]++
      }
    })

    return {
      average: Math.round(average * 100) / 100,
      distribution,
      count: values.length,
    }
  }

  const exportToExcel = () => {
    if (!survey || responses.length === 0) return

    const data: any[] = []

    responses.forEach((response, index) => {
      const row: any = {
        '번호': index + 1,
        '제출일시': new Date(response.created_at).toLocaleString('ko-KR'),
      }

      // 동적 기본정보 추가
      survey.basic_info_questions?.forEach((question) => {
        row[question.label] = response.basic_info[question.id] || ''
      })

      survey.sections.forEach((section) => {
        section.questions.forEach((question) => {
          row[`${section.title} - ${question.text}`] =
            response.section_answers[section.id]?.[question.id] || ''
        })
      })

      data.push(row)
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '응답 결과')

    XLSX.writeFile(wb, `${survey.title}_결과.xlsx`)
  }

  const exportToCSV = () => {
    if (!survey || responses.length === 0) return

    const data: any[] = []

    responses.forEach((response, index) => {
      const row: any = {
        '번호': index + 1,
        '제출일시': new Date(response.created_at).toLocaleString('ko-KR'),
      }

      // 동적 기본정보 추가
      survey.basic_info_questions?.forEach((question) => {
        row[question.label] = response.basic_info[question.id] || ''
      })

      survey.sections.forEach((section) => {
        section.questions.forEach((question) => {
          row[`${section.title} - ${question.text}`] =
            response.section_answers[section.id]?.[question.id] || ''
        })
      })

      data.push(row)
    })

    const csv = Papa.unparse(data)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${survey.title}_결과.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !survey) {
    return (
      <div className="px-4 sm:px-0">
        <p className="text-red-600">{error || '설문을 찾을 수 없습니다.'}</p>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      {/* 헤더 */}
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4"
        >
          <ArrowLeft size={16} />
          목록으로 돌아가기
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{survey.title}</h1>
            <p className="mt-1 text-sm text-gray-600">설문 결과</p>
          </div>
          <div className="flex gap-2">
            {selectedResponses.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                선택 삭제 ({selectedResponses.size})
              </button>
            )}
            <button
              onClick={exportToExcel}
              disabled={responses.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              엑셀 다운로드
            </button>
            <button
              onClick={exportToCSV}
              disabled={responses.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              CSV 다운로드
            </button>
          </div>
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3">
          <Users className="text-indigo-600" size={24} />
          <div>
            <p className="text-sm text-gray-600">총 응답 수</p>
            <p className="text-2xl font-bold text-gray-900">{responses.length}명</p>
          </div>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">아직 응답이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 기본 정보 응답 (동적) */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">기본 정보 응답</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={responses.length > 0 && selectedResponses.size === responses.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      번호
                    </th>
                    {survey.basic_info_questions?.map((question) => (
                      <th key={question.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {question.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      제출일시
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {responses.map((response, index) => (
                    <tr key={response.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedResponses.has(response.id)}
                          onChange={() => handleSelectOne(response.id)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                      {survey.basic_info_questions?.map((question) => (
                        <td key={question.id} className="px-4 py-3 text-sm text-gray-900">
                          {response.basic_info[question.id] || '-'}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(response.created_at).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteOne(response.id)}
                          disabled={deleting}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 섹션별 통계 */}
          {survey.sections.map((section) => (
            <div key={section.id} className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{section.title}</h2>
              <div className="space-y-8">
                {section.questions.map((question) => {
                  const stats = calculateStatistics(section.id, question.id)
                  const totalResponses = stats.count

                  const chartData = [
                    {
                      score: '1점',
                      count: stats.distribution[0],
                      percent: totalResponses > 0 ? ((stats.distribution[0] / totalResponses) * 100).toFixed(1) : '0.0'
                    },
                    {
                      score: '2점',
                      count: stats.distribution[1],
                      percent: totalResponses > 0 ? ((stats.distribution[1] / totalResponses) * 100).toFixed(1) : '0.0'
                    },
                    {
                      score: '3점',
                      count: stats.distribution[2],
                      percent: totalResponses > 0 ? ((stats.distribution[2] / totalResponses) * 100).toFixed(1) : '0.0'
                    },
                    {
                      score: '4점',
                      count: stats.distribution[3],
                      percent: totalResponses > 0 ? ((stats.distribution[3] / totalResponses) * 100).toFixed(1) : '0.0'
                    },
                    {
                      score: '5점',
                      count: stats.distribution[4],
                      percent: totalResponses > 0 ? ((stats.distribution[4] / totalResponses) * 100).toFixed(1) : '0.0'
                    },
                  ]

                  return (
                    <div key={question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                          {question.text}
                        </h3>
                        <p className="text-sm text-gray-600">
                          평균: <span className="font-bold text-indigo-600">{stats.average}</span>점
                          (총 {stats.count}명 응답)
                        </p>
                      </div>

                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="score" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="count"
                            fill="#4F46E5"
                            name="응답 수"
                            isAnimationActive={false}
                            label={{
                              position: 'center',
                              content: (props: any) => {
                                const { x, y, width, height, index } = props
                                const percent = chartData[index]?.percent
                                return (
                                  <text
                                    x={x + width / 2}
                                    y={y + height / 2}
                                    fill="white"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize={12}
                                    fontWeight="500"
                                  >
                                    {percent}%
                                  </text>
                                )
                              }
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>

                      <div className="mt-4 grid grid-cols-5 gap-2 text-center text-sm">
                        {stats.distribution.map((count, index) => (
                          <div key={index} className="bg-gray-50 rounded p-2">
                            <p className="font-medium text-gray-900">{index + 1}점</p>
                            <p className="text-gray-600">{count}명</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
