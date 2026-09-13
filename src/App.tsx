import { AuthProvider } from '@/providers/auth-provider'
import { ProfileProvider } from '@/providers/profile-provider'
import { SafetyProvider } from '@/providers/safety-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { AppRouter } from '@/routes/app-router'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <SafetyProvider><AppRouter /></SafetyProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
