import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import BoardPage from './pages/BoardPage'
import PostDetailPage from './pages/PostDetailPage'
import WritePostPage from './pages/WritePostPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import WikiListPage from './pages/WikiListPage'
import WikiDetailPage from './pages/WikiDetailPage'
import WikiEditPage from './pages/WikiEditPage'
import WikiHistoryPage from './pages/WikiHistoryPage'
import ArenaListPage from './pages/ArenaListPage'
import ArenaDetailPage from './pages/ArenaDetailPage'
import AppleArenaListPage from './pages/AppleArenaListPage'
import AppleArenaRoomPage from './pages/AppleArenaRoomPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '10px',
                fontFamily: 'Noto Sans KR, sans-serif',
                fontSize: '14px',
              },
            }}
          />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/board" element={<BoardPage />} />
              <Route path="/board/:categorySlug" element={<BoardPage />} />
              <Route path="/posts/:postId" element={<PostDetailPage />} />
              <Route path="/write" element={<WritePostPage />} />
              <Route path="/posts/:postId/edit" element={<WritePostPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/wiki" element={<WikiListPage />} />
              <Route path="/wiki/new" element={<WikiEditPage />} />
              <Route path="/wiki/:wikiId" element={<WikiDetailPage />} />
              <Route path="/wiki/:wikiId/edit" element={<WikiEditPage />} />
              <Route path="/wiki/:wikiId/history" element={<WikiHistoryPage />} />
              <Route path="/arena" element={<ArenaListPage />} />
              <Route path="/arena/:arenaId" element={<ArenaDetailPage />} />
              <Route path="/apple-arena" element={<AppleArenaListPage />} />
              <Route path="/apple-arena/:roomId" element={<AppleArenaRoomPage />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
