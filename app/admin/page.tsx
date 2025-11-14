import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Survey, SurveyWithResponseCount } from '@/lib/types/survey'
import { Plus } from 'lucide-react'
import { SurveyList } from './survey-list'

export const dynamic = 'force-dynamic'

async function getSurveysWithResponseCount(): Promise<SurveyWithResponseCount[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching surveys:', error)
    return []
  }

  const surveys = data as Survey[]

  // 각 설문의 응답 수 조회
  const surveysWithCount = await Promise.all(
    surveys.map(async (survey) => {
      const { count } = await supabase
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .eq('survey_id', survey.id)

      return {
        ...survey,
        responseCount: count || 0,
      }
    })
  )

  return surveysWithCount
}

export default async function AdminDashboard() {
  const surveys = await getSurveysWithResponseCount()

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">설문 목록</h2>
        <Link
          href="/admin/surveys/create"
          className="group inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-gray-900 to-gray-700 hover:from-gray-800 hover:to-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 shadow-lg shadow-gray-900/25 hover:shadow-xl hover:shadow-gray-900/30 transition-all duration-200 hover:-translate-y-0.5"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-200" />
          새 설문 만들기
        </Link>
      </div>

      <SurveyList surveys={surveys} />
    </div>
  )
}
