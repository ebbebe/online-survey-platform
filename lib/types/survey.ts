// Survey Types

export interface SurveyQuestion {
  id: string
  text: string
}

export interface SurveySection {
  id: string
  title: string
  max_five_points: number // 5점을 선택할 수 있는 최대 개수
  max_one_points: number // 1점을 선택할 수 있는 최대 개수
  questions: SurveyQuestion[]
}

export interface BasicInfoAnswer {
  name: string // 이름
  department: string // 부서
  age: string // 연령
  career: string // 총 직장 경력기간
}

export interface SectionAnswers {
  [sectionId: string]: {
    [questionId: string]: number // 1-5점
  }
}

export interface Survey {
  id: string
  title: string
  description: string | null
  sections: SurveySection[]
  created_at: string
  updated_at: string
}

export interface Response {
  id: string
  survey_id: string
  basic_info: BasicInfoAnswer
  section_answers: SectionAnswers
  created_at: string
}

// Survey with response count (for admin list)
export interface SurveyWithResponseCount extends Survey {
  responseCount: number
}

// Create Survey Form Types
export interface CreateSurveyFormData {
  title: string
  description: string
  sections: SurveySection[]
}
