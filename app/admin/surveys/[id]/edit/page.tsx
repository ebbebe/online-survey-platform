'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Plus, Trash2, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SurveySection, SurveyQuestion, Survey } from '@/lib/types/survey'
import { updateSurvey } from '@/app/admin/actions'

export default function EditSurveyPage() {
  const router = useRouter()
  const params = useParams()
  const surveyId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [responseCount, setResponseCount] = useState<number | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [sections, setSections] = useState<SurveySection[]>([])

  // 설문 데이터 불러오기
  useEffect(() => {
    async function fetchSurvey() {
      try {
        const supabase = createClient()

        // 설문 데이터 조회
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('*')
          .eq('id', surveyId)
          .single()

        if (surveyError) throw surveyError

        // 응답 수 조회
        const { count, error: countError } = await supabase
          .from('responses')
          .select('*', { count: 'exact', head: true })
          .eq('survey_id', surveyId)

        if (countError) throw countError

        const survey = surveyData as Survey
        setTitle(survey.title)
        setDescription(survey.description || '')
        setSections(survey.sections)
        setResponseCount(count || 0)
      } catch (err: any) {
        setError(err.message || '설문을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [surveyId])

  const addSection = () => {
    setSections([
      ...sections,
      {
        id: crypto.randomUUID(),
        title: `섹션 ${sections.length + 1}`,
        max_five_points: 3,
        max_one_points: 3,
        questions: [{ id: crypto.randomUUID(), text: '' }],
      },
    ])
  }

  const removeSection = (sectionId: string) => {
    if (sections.length === 1) {
      setError('최소 1개의 섹션이 필요합니다.')
      return
    }
    setSections(sections.filter((s) => s.id !== sectionId))
  }

  const updateSection = (
    sectionId: string,
    field: keyof SurveySection,
    value: string | number
  ) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId ? { ...s, [field]: value } : s
      )
    )
  }

  const addQuestion = (sectionId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: [
                ...s.questions,
                { id: crypto.randomUUID(), text: '' },
              ],
            }
          : s
      )
    )
  }

  const removeQuestion = (sectionId: string, questionId: string) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId) {
          if (s.questions.length === 1) {
            setError('각 섹션에는 최소 1개의 문항이 필요합니다.')
            return s
          }
          return {
            ...s,
            questions: s.questions.filter((q) => q.id !== questionId),
          }
        }
        return s
      })
    )
  }

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    text: string
  ) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId ? { ...q, text } : q
              ),
            }
          : s
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    // Validation
    if (!title.trim()) {
      setError('설문 제목을 입력해주세요.')
      setSubmitting(false)
      return
    }

    for (const section of sections) {
      if (!section.title.trim()) {
        setError('모든 섹션의 제목을 입력해주세요.')
        setSubmitting(false)
        return
      }
      if (section.max_five_points < 0) {
        setError('5점 선택 최대 개수는 0 이상이어야 합니다.')
        setSubmitting(false)
        return
      }
      for (const question of section.questions) {
        if (!question.text.trim()) {
          setError('모든 문항을 입력해주세요.')
          setSubmitting(false)
          return
        }
      }
    }

    try {
      const result = await updateSurvey(surveyId, {
        title,
        description,
        sections,
      })

      if (result.error) {
        setError(result.error)
        setSubmitting(false)
        return
      }

      router.push('/admin')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '설문 수정에 실패했습니다.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    )
  }

  if (error && !title) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        <Link
          href="/admin"
          className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-500"
        >
          <ArrowLeft size={16} />
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  // 응답이 있으면 수정 불가
  if (responseCount !== null && responseCount > 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            수정할 수 없는 설문
          </h2>
          <p className="text-gray-600 mb-1">
            이 설문은 이미 <span className="font-bold text-indigo-600">{responseCount}개</span>의 응답이 제출되어
          </p>
          <p className="text-gray-600 mb-6">수정할 수 없습니다.</p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft size={16} />
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4"
        >
          <ArrowLeft size={16} />
          목록으로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">설문 수정</h1>
        <p className="mt-1 text-sm text-gray-600">
          설문의 제목, 섹션, 문항을 수정하세요.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                설문 제목 *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="예: 2024년 직원 만족도 조사"
              />
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                설문 설명
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="설문에 대한 간단한 설명을 입력하세요."
              />
            </div>
          </div>
        </div>

        {/* 섹션 */}
        <div className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <div key={section.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  섹션 {sectionIndex + 1}
                </h3>
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(section.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    섹션 제목 *
                  </label>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) =>
                      updateSection(section.id, 'title', e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="예: 업무 환경"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    5점 선택 최대 개수 *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={section.max_five_points}
                    onChange={(e) =>
                      updateSection(
                        section.id,
                        'max_five_points',
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    이 섹션에서 5점을 선택할 수 있는 최대 문항 수
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    1점 선택 최대 개수 *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={section.max_one_points}
                    onChange={(e) =>
                      updateSection(
                        section.id,
                        'max_one_points',
                        parseInt(e.target.value) || 0
                      )
                    }
                    className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    이 섹션에서 1점을 선택할 수 있는 최대 문항 수
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    문항 *
                  </label>
                  {section.questions.map((question, questionIndex) => (
                    <div key={question.id} className="flex gap-2">
                      <div className="flex-shrink-0 w-8 pt-2 text-sm text-gray-500">
                        {questionIndex + 1}.
                      </div>
                      <input
                        type="text"
                        value={question.text}
                        onChange={(e) =>
                          updateQuestion(
                            section.id,
                            question.id,
                            e.target.value
                          )
                        }
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        placeholder="문항 내용을 입력하세요"
                      />
                      {section.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeQuestion(section.id, question.id)
                          }
                          className="flex-shrink-0 text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addQuestion(section.id)}
                    className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus size={16} />
                    문항 추가
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSection}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900"
          >
            <Plus size={20} />
            섹션 추가
          </button>
        </div>

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '수정 중...' : '설문 수정'}
          </button>
        </div>
      </form>
    </div>
  )
}
