import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { NotFoundPage } from './pages/NotFoundPage'

const AuthBoundary = lazy(() => import('./routes/AuthBoundary').then((module) => ({ default: module.AuthBoundary })))
const ProtectedRoute = lazy(() => import('./routes/ProtectedRoute').then((module) => ({ default: module.ProtectedRoute })))
const AppShell = lazy(() => import('./components/layout/AppShell').then((module) => ({ default: module.AppShell })))
const LoginPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.RegisterPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const CreateStartupPage = lazy(() => import('./pages/CreateStartupPage').then((module) => ({ default: module.CreateStartupPage })))
const OverviewPage = lazy(() => import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })))
const VisualPlanPage = lazy(() => import('./pages/VisualPlanPage').then((module) => ({ default: module.VisualPlanPage })))
const IdentityPage = lazy(() => import('./pages/IdentityPage').then((module) => ({ default: module.IdentityPage })))
const ProductPage = lazy(() => import('./pages/ProductPage').then((module) => ({ default: module.ProductPage })))
const BOMPage = lazy(() => import('./pages/BOMPage').then((module) => ({ default: module.BOMPage })))
const ManufacturingPage = lazy(() => import('./pages/ManufacturingPage').then((module) => ({ default: module.ManufacturingPage })))
const SupplyChainPage = lazy(() => import('./pages/SupplyChainPage').then((module) => ({ default: module.SupplyChainPage })))
const DistributionPage = lazy(() => import('./pages/DistributionPage').then((module) => ({ default: module.DistributionPage })))
const CompliancePage = lazy(() => import('./pages/CompliancePage').then((module) => ({ default: module.CompliancePage })))
const FinancePage = lazy(() => import('./pages/FinancePage').then((module) => ({ default: module.FinancePage })))
const TeamPage = lazy(() => import('./pages/TeamPage').then((module) => ({ default: module.TeamPage })))
const RiskPage = lazy(() => import('./pages/RiskPage').then((module) => ({ default: module.RiskPage })))
const ScalingPage = lazy(() => import('./pages/ScalingPage').then((module) => ({ default: module.ScalingPage })))
const RoadmapPage = lazy(() => import('./pages/RoadmapPage').then((module) => ({ default: module.RoadmapPage })))
const BlueprintPage = lazy(() => import('./pages/BlueprintPage').then((module) => ({ default: module.BlueprintPage })))
const CopilotPage = lazy(() => import('./pages/CopilotPage').then((module) => ({ default: module.CopilotPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function RouteLoading() {
  return <div className="flex min-h-[50vh] items-center justify-center"><span className="h-7 w-7 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" aria-label="Loading page" /></div>
}

export default function App() {
  return <Suspense fallback={<RouteLoading />}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />

      <Route element={<AuthBoundary />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/startup/new" element={<CreateStartupPage />} />
            <Route path="/startup/:startupId" element={<OverviewPage />} />
            <Route path="/startup/:startupId/visual-plan" element={<VisualPlanPage />} />
            <Route path="/startup/:startupId/identity" element={<IdentityPage />} />
            <Route path="/startup/:startupId/product" element={<ProductPage />} />
            <Route path="/startup/:startupId/bom" element={<BOMPage />} />
            <Route path="/startup/:startupId/manufacturing" element={<ManufacturingPage />} />
            <Route path="/startup/:startupId/supply-chain" element={<SupplyChainPage />} />
            <Route path="/startup/:startupId/distribution" element={<DistributionPage />} />
            <Route path="/startup/:startupId/compliance" element={<CompliancePage />} />
            <Route path="/startup/:startupId/finance" element={<FinancePage />} />
            <Route path="/startup/:startupId/team" element={<TeamPage />} />
            <Route path="/startup/:startupId/risks" element={<RiskPage />} />
            <Route path="/startup/:startupId/scaling" element={<ScalingPage />} />
            <Route path="/startup/:startupId/roadmap" element={<RoadmapPage />} />
            <Route path="/startup/:startupId/blueprint" element={<BlueprintPage />} />
            <Route path="/startup/:startupId/copilot" element={<CopilotPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
}
