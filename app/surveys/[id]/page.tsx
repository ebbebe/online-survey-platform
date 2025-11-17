'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Survey, BasicInfoAnswer, SectionAnswers } from '@/lib/types/survey'
import { CheckCircle2, X } from 'lucide-react'

export default function SurveyResponsePage() {
  const params = useParams()
  const router = useRouter()
  const surveyId = params.id as string

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitModalMessage, setLimitModalMessage] = useState('')
  const [isClosing, setIsClosing] = useState(false)

  // 기본 정보 답변 (동적)
  const [basicInfo, setBasicInfo] = useState<BasicInfoAnswer>({})

  // 섹션별 답변
  const [sectionAnswers, setSectionAnswers] = useState<SectionAnswers>({})

  // 진행률 계산
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    async function fetchSurvey() {
      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('surveys')
          .select('*')
          .eq('id', surveyId)
          .single()

        if (fetchError) throw fetchError

        setSurvey(data as Survey)

        // 기본정보 답변 초기화
        const initialBasicInfo: BasicInfoAnswer = {}
        if (data.basic_info_questions) {
          data.basic_info_questions.forEach((question: any) => {
            initialBasicInfo[question.id] = ''
          })
        }
        setBasicInfo(initialBasicInfo)

        // 섹션별 답변 초기화
        const initialAnswers: SectionAnswers = {}
        data.sections.forEach((section: any) => {
          initialAnswers[section.id] = {}
          section.questions.forEach((question: any) => {
            initialAnswers[section.id][question.id] = 0
          })
        })
        setSectionAnswers(initialAnswers)
      } catch (err: any) {
        setError(err.message || '설문을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [surveyId])

  // 진행률 계산
  useEffect(() => {
    if (!survey) return

    const basicInfoCount = survey.basic_info_questions?.length || 0
    const totalFields = basicInfoCount + survey.sections.reduce(
      (acc, section) => acc + section.questions.length,
      0
    )

    let filledFields = 0

    // 기본 정보 (동적)
    if (survey.basic_info_questions) {
      survey.basic_info_questions.forEach((question) => {
        if (basicInfo[question.id]?.trim()) {
          filledFields++
        }
      })
    }

    // 섹션 답변
    survey.sections.forEach((section) => {
      section.questions.forEach((question) => {
        if (sectionAnswers[section.id]?.[question.id] > 0) {
          filledFields++
        }
      })
    })

    setProgress(Math.round((filledFields / totalFields) * 100))
  }, [basicInfo, sectionAnswers, survey])

  // 토스트 닫기 함수 (페이드아웃 애니메이션 후 닫기)
  const closeToast = () => {
    setIsClosing(true)
    setTimeout(() => {
      setShowLimitModal(false)
      setIsClosing(false)
    }, 200) // fadeOut 애니메이션 시간
  }

  // 3초 후 자동으로 사라지기
  useEffect(() => {
    if (showLimitModal && !isClosing) {
      const timer = setTimeout(() => {
        closeToast()
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [showLimitModal, isClosing])

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showLimitModal && !isClosing) {
        closeToast()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showLimitModal, isClosing])

  const updateAnswer = (sectionId: string, questionId: string, value: number) => {
    const section = survey?.sections.find((s) => s.id === sectionId)
    if (!section) return

    const currentAnswers = sectionAnswers[sectionId] || {}
    const oldValue = currentAnswers[questionId] || 0

    // 1점 제약 체크
    const onePointCount = Object.values(currentAnswers).filter((v) => v === 1).length
    if (value === 1 && oldValue !== 1) {
      const maxOnePoints = section.max_one_points ?? 3 // fallback for existing surveys
      if (maxOnePoints > 0 && onePointCount >= maxOnePoints) {
        setLimitModalMessage(`1점은 최대 ${maxOnePoints}개까지만 선택 가능합니다`)
        setShowLimitModal(true)
        return
      }
    }

    // 5점 제약 체크
    const fivePointCount = Object.values(currentAnswers).filter((v) => v === 5).length
    if (value === 5 && oldValue !== 5) {
      const maxFivePoints = section.max_five_points ?? 3 // fallback for existing surveys
      if (maxFivePoints > 0 && fivePointCount >= maxFivePoints) {
        setLimitModalMessage(`5점은 최대 ${maxFivePoints}개까지만 선택 가능합니다`)
        setShowLimitModal(true)
        return
      }
    }

    setSectionAnswers({
      ...sectionAnswers,
      [sectionId]: {
        ...currentAnswers,
        [questionId]: value,
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 기본정보 유효성 검사 (동적)
    if (survey?.basic_info_questions) {
      for (const question of survey.basic_info_questions) {
        if (!basicInfo[question.id]?.trim()) {
          setError(`"${question.label}" 항목을 입력해주세요.`)
          return
        }
      }
    }

    // 모든 문항 응답 확인
    for (const section of survey!.sections) {
      for (const question of section.questions) {
        if (!sectionAnswers[section.id]?.[question.id] || sectionAnswers[section.id][question.id] === 0) {
          setError('모든 문항에 응답해주세요.')
          return
        }
      }
    }

    setSubmitting(true)

    try {
      const supabase = createClient()
      const { error: insertError } = await supabase.from('responses').insert({
        survey_id: surveyId,
        basic_info: basicInfo,
        section_answers: sectionAnswers,
      })

      if (insertError) throw insertError

      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || '응답 제출에 실패했습니다.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">설문을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">설문을 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">제출 완료</h2>
          <p className="text-gray-600">설문에 응답해 주셔서 감사합니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 진행률 표시 */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">진행률</span>
              <span className="text-sm font-medium text-indigo-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* 설문 제목 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{survey.title}</h1>
          {survey.description && (
            <p className="text-gray-600 whitespace-pre-line">{survey.description}</p>
          )}
          <p className="mt-4 text-sm text-red-600">* 모든 항목은 필수 응답입니다.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 (동적) */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">기본 정보</h2>
            <div className="space-y-4">
              {survey.basic_info_questions?.map((question, index) => (
                <div key={question.id}>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    {index + 1}. {question.label} *
                  </label>
                  {question.type === 'text' ? (
                    <input
                      type="text"
                      value={basicInfo[question.id] || ''}
                      onChange={(e) =>
                        setBasicInfo({ ...basicInfo, [question.id]: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="답변을 입력하세요"
                    />
                  ) : (
                    <div className="space-y-2">
                      {question.options?.map((option, optionIndex) => (
                        <button
                          key={optionIndex}
                          type="button"
                          onClick={() =>
                            setBasicInfo({ ...basicInfo, [question.id]: option })
                          }
                          className={`w-full p-3 rounded-lg border-2 text-left transition-all text-sm ${
                            basicInfo[question.id] === option
                              ? 'bg-indigo-100 border-indigo-500 text-indigo-900'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-400'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 척도 문항 섹션 */}
          {survey.sections.map((section, sectionIndex) => {
            const onePointCount = Object.values(sectionAnswers[section.id] || {}).filter(
              (v) => v === 1
            ).length
            const fivePointCount = Object.values(sectionAnswers[section.id] || {}).filter(
              (v) => v === 5
            ).length

            const maxOnePoints = section.max_one_points ?? 3
            const maxFivePoints = section.max_five_points ?? 3

            return (
              <div key={section.id} className="bg-white shadow rounded-lg p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    {maxOnePoints > 0 && (
                      <p>
                        1점: 최대 {maxOnePoints}개 선택 가능
                        <span className="ml-2 text-indigo-600 font-medium">
                          (현재 {onePointCount}/{maxOnePoints})
                        </span>
                      </p>
                    )}
                    {maxFivePoints > 0 && (
                      <p>
                        5점: 최대 {maxFivePoints}개 선택 가능
                        <span className="ml-2 text-indigo-600 font-medium">
                          (현재 {fivePointCount}/{maxFivePoints})
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {section.questions.map((question, questionIndex) => {
                    const value = sectionAnswers[section.id]?.[question.id] || 0

                    return (
                      <div key={question.id} className="pb-4 border-b border-gray-200 last:border-b-0">
                        <p className="text-base font-semibold text-gray-900 mb-4">
                          {questionIndex + 1}. {question.text} *
                        </p>
                        <div className="space-y-2">
                          {[
                            { score: 5, label: '항상 그렇다' },
                            { score: 4, label: '그런 편이다' },
                            { score: 3, label: '가끔 그렇다' },
                            { score: 2, label: '드물다' },
                            { score: 1, label: '전혀 그렇지 않다' }
                          ].map(({ score, label }) => (
                            <button
                              key={score}
                              type="button"
                              onClick={() => updateAnswer(section.id, question.id, score)}
                              className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                                value === score
                                  ? 'bg-indigo-100 border-indigo-500 text-indigo-900'
                                  : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-400'
                              }`}
                            >
                              <span className="text-sm">{label}</span>
                              <span className="text-xl font-bold">{score}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* 제출 버튼 */}
          <div className="sticky bottom-0 bg-white shadow-lg rounded-lg p-6">
            <button
              type="submit"
              disabled={submitting || progress < 100}
              className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '제출 중...' : progress < 100 ? '모든 항목을 작성해주세요' : '제출하기'}
            </button>
          </div>
        </form>

        {/* 상단 토스트 알림 */}
        {showLimitModal && (
          <div
            className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4 pointer-events-none"
            style={{
              animation: isClosing ? 'fadeOut 0.2s ease-out forwards' : 'pulseIn 0.3s ease-out'
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 pointer-events-auto border-l-4 border-red-500">
              <div className="flex items-start gap-3">
                {/* 경고 아이콘 */}
                <div className="flex-shrink-0 w-6 h-6 mt-0.5">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>

                {/* 메시지 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 mb-1">
                    입력 최대치에 도달하였습니다
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {limitModalMessage}
                  </p>
                </div>

                {/* 닫기 버튼 */}
                <button
                  onClick={closeToast}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg -mt-1"
                  aria-label="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
