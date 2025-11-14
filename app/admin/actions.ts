'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { SurveySection, BasicInfoQuestion } from '@/lib/types/survey'

export async function deleteSurvey(surveyId: string) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    const { error } = await supabase.from('surveys').delete().eq('id', surveyId)

    if (error) {
      throw error
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || '삭제에 실패했습니다.' }
  }
}

export async function updateSurvey(
  surveyId: string,
  data: {
    title: string
    description: string
    basic_info_questions: BasicInfoQuestion[]
    sections: SurveySection[]
  }
) {
  try {
    const supabase = await createClient()

    // 1. 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Unauthorized' }
    }

    // 2. 응답 수 확인 (응답이 있으면 수정 불가)
    const { count } = await supabase
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('survey_id', surveyId)

    if (count && count > 0) {
      return { error: '응답이 있는 설문은 수정할 수 없습니다.' }
    }

    // 3. 설문 업데이트
    const { error } = await supabase
      .from('surveys')
      .update({
        title: data.title,
        description: data.description.trim() || null,
        basic_info_questions: data.basic_info_questions,
        sections: data.sections,
        updated_at: new Date().toISOString(),
      })
      .eq('id', surveyId)

    if (error) {
      throw error
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || '수정에 실패했습니다.' }
  }
}
