'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
