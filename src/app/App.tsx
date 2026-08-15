import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { EmergencyGate } from '@/components/auth/EmergencyGate'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { LifeLogPage } from '@/features/life-log/LifeLogPage'
import { ManutencaoPage } from '@/features/manutencao/ManutencaoPage'
import { DespensaPage } from '@/features/despensa/DespensaPage'
import { ViagensPage } from '@/features/viagens/ViagensPage'
import { AgendaPage } from '@/features/agenda/AgendaPage'

export default function App() {
  const isTrusted = useAuthStore((s) => s.isTrusted)

  return (
    <BrowserRouter>
      {isTrusted ? (
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/life-log" element={<LifeLogPage />} />
            <Route path="/manutencao" element={<ManutencaoPage />} />
            <Route path="/despensa" element={<DespensaPage />} />
            <Route path="/viagens" element={<ViagensPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      ) : (
        <EmergencyGate />
      )}
    </BrowserRouter>
  )
}