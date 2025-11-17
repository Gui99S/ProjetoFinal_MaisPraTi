import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { UserProvider } from './context/UserContext'
import { WebSocketProvider } from './context/WebSocketContext'
import Navbar from './components/Navbar/Navbar'
import AppRoutes from './routes'
import './styles/themes.css'
import './App.css'

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <UserProvider>
          <WebSocketProvider>
            <Router>
              <div>
                <Navbar />
                <main style={{ paddingTop: '60px' }}>
                  <AppRoutes />
                </main>
              </div>
            </Router>
          </WebSocketProvider>
        </UserProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
