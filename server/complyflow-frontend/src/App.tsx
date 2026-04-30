import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import OnboardingLayout from '@/onboarding/components/OnboardingLayout'
import WelcomeScreen from '@/onboarding/components/WelcomeScreen/WelcomeScreen'
import RegulationSelection from '@/onboarding/components/RegulationSelection/RegulationSelection'
import PrioritySetup from '@/onboarding/components/PrioritySetup/PrioritySetup'
import TeamInvitation from '@/onboarding/components/TeamInvitation/TeamInvitation'
import AccountFinalization from '@/onboarding/components/AccountFinalization/AccountFinalization'
import Dashboard from '@/pages/Dashboard'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        
        {/* Onboarding Flow */}
        <Route path="/onboarding" element={<OnboardingLayout />}>
          <Route index element={<Navigate to="welcome" replace />} />
          <Route path="welcome" element={<WelcomeScreen />} />
          <Route path="regulations" element={<RegulationSelection />} />
          <Route path="priority" element={<PrioritySetup />} />
          <Route path="team" element={<TeamInvitation />} />
          <Route path="finalize" element={<AccountFinalization />} />
        </Route>
        
        {/* Main App */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    </Router>
  )
}

export default App