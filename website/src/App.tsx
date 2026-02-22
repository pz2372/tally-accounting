import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AcceptInvite from './pages/AcceptInvite'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function App() {
  const location = useLocation()
  const isDashboard = location.pathname === '/dashboard'
  const isAcceptInvite = location.pathname.startsWith('/accept-invite')

  return (
    <>
      <ScrollToTop />
      {!isDashboard && !isAcceptInvite && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/accept-invite/:token" element={<AcceptInvite />} />
        </Routes>
      </main>
      {!isDashboard && !isAcceptInvite && <Footer />}
    </>
  )
}

export default App
