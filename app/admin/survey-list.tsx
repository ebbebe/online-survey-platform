'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SurveyWithResponseCount } from '@/lib/types/survey'
import { Trash2, Edit, Eye, Plus } from 'lucide-react'
import { deleteSurvey } from './actions'
import { useRouter } from 'next/navigation'

export function SurveyList({ surveys }: { surveys: SurveyWithResponseCount[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (surveyId: string, surveyTitle: string) => {
    if (!confirm(`"${surveyTitle}" 설문을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 모든 응답 데이터도 함께 삭제됩니다.`)) {
      return
    }

    setDeleting(surveyId)

    const result = await deleteSurvey(surveyId)

    if (result.error) {
      alert(`삭제 실패: ${result.error}`)
      setDeleting(null)
    } else {
      router.refresh()
    }
  }

  if (surveys.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <p className="text-gray-500">아직 생성된 설문이 없습니다.</p>
        <Link
          href="/admin/surveys/create"
          className="mt-4 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-500"
        >
          <Plus size={16} />
          첫 설문 만들기
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <ul className="divide-y divide-gray-200">
        {surveys.map((survey) => (
          <li key={survey.id} className="hover:bg-gray-50">
            <div className="px-4 py-5 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {survey.title}
                  </h3>
                  {survey.description && (
                    <p className="mt-1 text-sm text-gray-500">{survey.description}</p>
                  )}
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <span>
                      생성일: {new Date(survey.created_at).toLocaleDateString('ko-KR')}
                    </span>
                    <span className="mx-2">•</span>
                    <span>섹션 {survey.sections.length}개</span>
                    <span className="mx-2">•</span>
                    <span className={survey.responseCount > 0 ? 'text-indigo-600 font-medium' : ''}>
                      응답 {survey.responseCount}개
                    </span>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <Link
                    href={`/surveys/${survey.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    title="설문 보기"
                  >
                    <Eye size={16} />
                    보기
                  </Link>
                  <Link
                    href={`/admin/surveys/${survey.id}/edit`}
                    className={`inline-flex items-center gap-1 px-3 py-2 border text-sm font-medium rounded-md ${
                      survey.responseCount > 0
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                    }`}
                    title={survey.responseCount > 0 ? '응답이 있어 수정 불가' : '설문 수정'}
                    onClick={(e) => {
                      if (survey.responseCount > 0) {
                        e.preventDefault()
                      }
                    }}
                  >
                    <Edit size={16} />
                    수정
                  </Link>
                  <Link
                    href={`/admin/surveys/${survey.id}/results`}
                    className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    title="결과 보기"
                  >
                    <Eye size={16} />
                    결과
                  </Link>
                  <button
                    onClick={() => handleDelete(survey.id, survey.title)}
                    disabled={deleting === survey.id}
                    className="inline-flex items-center gap-1 px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="삭제"
                  >
                    <Trash2 size={16} />
                    {deleting === survey.id ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
