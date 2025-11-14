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

// 기본정보 문항 타입
export interface BasicInfoQuestion {
  id: string
  label: string // "귀하의 이름은?"
  type: 'text' | 'select'
  options?: string[] // type이 'select'일 때만 사용
}

// 기본정보 응답 (동적)
export interface BasicInfoAnswer {
  [questionId: string]: string // { "q1": "홍길동", "q2": "남성" }
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
  basic_info_questions: BasicInfoQuestion[] // 기본정보 문항
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
