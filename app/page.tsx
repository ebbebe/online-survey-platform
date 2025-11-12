import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div className="mb-8">
          <ClipboardList className="w-20 h-20 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            온라인 설문 플랫폼
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            간편하게 설문을 만들고, 응답을 수집하고, 결과를 분석하세요.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            관리자 페이지
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            로그인
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="text-indigo-600 font-semibold mb-2">1. 설문 생성</div>
            <p className="text-sm text-gray-600">
              섹션과 문항을 자유롭게 구성하여 설문을 만드세요.
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="text-indigo-600 font-semibold mb-2">2. 응답 수집</div>
            <p className="text-sm text-gray-600">
              고유 URL을 공유하여 응답을 수집하세요.
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="text-indigo-600 font-semibold mb-2">3. 결과 분석</div>
            <p className="text-sm text-gray-600">
              실시간으로 통계를 확인하고 엑셀로 다운로드하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
