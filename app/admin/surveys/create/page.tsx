'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SurveySection, SurveyQuestion, BasicInfoQuestion } from '@/lib/types/survey'

export default function CreateSurveyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [basicInfoQuestions, setBasicInfoQuestions] = useState<BasicInfoQuestion[]>([
    {
      id: crypto.randomUUID(),
      label: '귀하의 이름은?',
      type: 'text',
    },
  ])
  const [sections, setSections] = useState<SurveySection[]>([
    {
      id: crypto.randomUUID(),
      title: '섹션 1',
      max_five_points: 3,
      max_one_points: 3,
      questions: [{ id: crypto.randomUUID(), text: '' }],
    },
  ])

  // 기본정보 관리 함수들
  const addBasicInfoQuestion = () => {
    setBasicInfoQuestions([
      ...basicInfoQuestions,
      {
        id: crypto.randomUUID(),
        label: '',
        type: 'text',
      },
    ])
  }

  const removeBasicInfoQuestion = (questionId: string) => {
    if (basicInfoQuestions.length === 1) {
      setError('최소 1개의 기본정보 문항이 필요합니다.')
      return
    }
    setBasicInfoQuestions(basicInfoQuestions.filter((q) => q.id !== questionId))
  }

  const updateQuestionLabel = (questionId: string, label: string) => {
    setBasicInfoQuestions(
      basicInfoQuestions.map((q) =>
        q.id === questionId ? { ...q, label } : q
      )
    )
  }

  const updateQuestionType = (questionId: string, type: 'text' | 'select') => {
    setBasicInfoQuestions(
      basicInfoQuestions.map((q) =>
        q.id === questionId
          ? { ...q, type, options: type === 'select' ? [''] : undefined }
          : q
      )
    )
  }

  const addOption = (questionId: string) => {
    setBasicInfoQuestions(
      basicInfoQuestions.map((q) =>
        q.id === questionId
          ? { ...q, options: [...(q.options || []), ''] }
          : q
      )
    )
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    setBasicInfoQuestions(
      basicInfoQuestions.map((q) => {
        if (q.id === questionId && q.options) {
          if (q.options.length === 1) {
            setError('객관식 문항은 최소 1개의 선택지가 필요합니다.')
            return q
          }
          return {
            ...q,
            options: q.options.filter((_, i) => i !== optionIndex),
          }
        }
        return q
      })
    )
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setBasicInfoQuestions(
      basicInfoQuestions.map((q) =>
        q.id === questionId && q.options
          ? {
              ...q,
              options: q.options.map((opt, i) => (i === optionIndex ? value : opt)),
            }
          : q
      )
    )
  }

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

  const toggleReverseCoded = (sectionId: string, questionId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId
                  ? { ...q, isReverseCoded: !q.isReverseCoded }
                  : q
              ),
            }
          : s
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!title.trim()) {
      setError('설문 제목을 입력해주세요.')
      setLoading(false)
      return
    }

    // 기본정보 검증
    for (const question of basicInfoQuestions) {
      if (!question.label.trim()) {
        setError('모든 기본정보 문항의 질문을 입력해주세요.')
        setLoading(false)
        return
      }
      if (question.type === 'select') {
        if (!question.options || question.options.length === 0) {
          setError('객관식 문항은 최소 1개의 선택지가 필요합니다.')
          setLoading(false)
          return
        }
        for (const option of question.options) {
          if (!option.trim()) {
            setError('모든 선택지를 입력해주세요.')
            setLoading(false)
            return
          }
        }
      }
    }

    for (const section of sections) {
      if (!section.title.trim()) {
        setError('모든 섹션의 제목을 입력해주세요.')
        setLoading(false)
        return
      }
      if (section.max_five_points < 0) {
        setError('5점 선택 최대 개수는 0 이상이어야 합니다.')
        setLoading(false)
        return
      }
      for (const question of section.questions) {
        if (!question.text.trim()) {
          setError('모든 문항을 입력해주세요.')
          setLoading(false)
          return
        }
      }
    }

    try {
      const supabase = createClient()
      const { data, error: insertError } = await supabase
        .from('surveys')
        .insert({
          title,
          description: description.trim() || null,
          basic_info_questions: basicInfoQuestions,
          sections,
        })
        .select()
        .single()

      if (insertError) throw insertError

      router.push('/admin')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '설문 생성에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">새 설문 만들기</h1>
        <p className="mt-1 text-sm text-gray-600">
          설문의 제목, 섹션, 문항을 설정하세요.
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

        {/* 기본정보 문항 */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">기본정보 문항</h2>
          <p className="text-sm text-gray-600 mb-4">
            응답자에게 수집할 기본 정보를 설정하세요. (이름, 부서, 연령 등)
          </p>

          <div className="space-y-4">
            {basicInfoQuestions.map((question, index) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    문항 {index + 1}
                  </h3>
                  {basicInfoQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBasicInfoQuestion(question.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      질문 *
                    </label>
                    <input
                      type="text"
                      value={question.label}
                      onChange={(e) => updateQuestionLabel(question.id, e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                      placeholder="예: 귀하의 이름은?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      응답 형식 *
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`type-${question.id}`}
                          value="text"
                          checked={question.type === 'text'}
                          onChange={() => updateQuestionType(question.id, 'text')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">주관식 (텍스트 입력)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`type-${question.id}`}
                          value="select"
                          checked={question.type === 'select'}
                          onChange={() => updateQuestionType(question.id, 'select')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">객관식 (선택지)</span>
                      </label>
                    </div>
                  </div>

                  {question.type === 'select' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        선택지 *
                      </label>
                      <div className="space-y-2">
                        {question.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex gap-2">
                            <div className="flex-shrink-0 w-6 pt-2 text-sm text-gray-500">
                              {optionIndex + 1}.
                            </div>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) =>
                                updateOption(question.id, optionIndex, e.target.value)
                              }
                              className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                              placeholder="선택지를 입력하세요"
                            />
                            {question.options && question.options.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOption(question.id, optionIndex)}
                                className="flex-shrink-0 text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOption(question.id)}
                          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          <Plus size={16} />
                          선택지 추가
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addBasicInfoQuestion}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900"
            >
              <Plus size={20} />
              기본정보 문항 추가
            </button>
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
                    <div key={question.id} className="space-y-2">
                      <div className="flex gap-2">
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
                      <div className="flex items-center ml-8">
                        <input
                          type="checkbox"
                          id={`reverse-${question.id}`}
                          checked={question.isReverseCoded || false}
                          onChange={() =>
                            toggleReverseCoded(section.id, question.id)
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`reverse-${question.id}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          역문항 (점수 반전)
                          {question.isReverseCoded && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              역
                            </span>
                          )}
                        </label>
                      </div>
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
            disabled={loading}
            className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '생성 중...' : '설문 생성'}
          </button>
        </div>
      </form>
    </div>
  )
}
