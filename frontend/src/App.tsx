import { Routes, Route } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { HomeSearch } from './pages/HomeSearch'
import { WordResult } from './pages/WordResult'
import { OcrReview } from './pages/OcrReview'
import { MyDictionary } from './pages/MyDictionary'
import { Quizzes } from './pages/Quizzes'
import { QuizSession } from './pages/QuizSession'
import { Chat } from './pages/Chat'
import { Profile } from './pages/Profile'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomeSearch />} />
        <Route path="/word/:term" element={<WordResult />} />
        <Route path="/ocr" element={<OcrReview />} />
        <Route path="/dictionary" element={<MyDictionary />} />
        <Route path="/quizzes" element={<Quizzes />} />
        <Route path="/quizzes/:mode" element={<QuizSession />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}
