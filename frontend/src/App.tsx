import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { DEV_DEFAULT_SLUG } from '@/config';

// Área pública
import { PublicScope } from '@/layouts/PublicScope';
import { LandingPage } from '@/pages/public/LandingPage';
import { ServiceSelectionPage } from '@/pages/public/ServiceSelectionPage';
import { SlotSelectionPage } from '@/pages/public/SlotSelectionPage';
import { CustomerDataPage } from '@/pages/public/CustomerDataPage';
import { SuccessConfirmationPage } from '@/pages/public/SuccessConfirmationPage';

// Área administrativa
import { ProtectedRoute } from '@/layouts/ProtectedRoute';
import { AdminLayout } from '@/layouts/AdminLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { AppointmentsPage } from '@/pages/admin/AppointmentsPage';
import { ServicesManagementPage } from '@/pages/admin/ServicesManagementPage';
import { TeamManagementPage } from '@/pages/admin/TeamManagementPage';
import { SettingsTabbedPage } from '@/pages/admin/SettingsTabbedPage';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const NotFound: React.FC = () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center">
        <p className="text-5xl font-black text-zinc-200">404</p>
        <p className="mt-2 text-sm font-medium text-zinc-600">
            Página não encontrada.
        </p>
    </div>
);

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="top-center" />
    </QueryClientProvider>
);

export const App: React.FC = () => {
    return (
        <AppProviders>
            <BrowserRouter>
                <Routes>
                    {/* Raiz: redireciona para o slug de demonstração em dev */}
                    <Route
                        path="/"
                        element={
                            <Navigate to={`/${DEV_DEFAULT_SLUG}`} replace />
                        }
                    />

                    {/* Área pública multi-passos por slug */}
                    <Route path="/:slug/*" element={<PublicScope />}>
                        <Route index element={<LandingPage />} />
                        <Route path="agendar/servicos" element={<ServiceSelectionPage />} />
                        <Route path="agendar/horario" element={<SlotSelectionPage />} />
                        <Route path="agendar/dados" element={<CustomerDataPage />} />
                        <Route
                            path="agendar/confirmacao"
                            element={<SuccessConfirmationPage />}
                        />
                    </Route>

                    {/* Área administrativa */}
                    <Route path="/admin/login" element={<LoginPage />} />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute>
                                <AdminLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route
                            index
                            element={<Navigate to="dashboard" replace />}
                        />
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="agendamentos" element={<AppointmentsPage />} />
                        <Route
                            path="servicos"
                            element={<ServicesManagementPage />}
                        />
                        <Route path="equipe" element={<TeamManagementPage />} />
                        <Route
                            path="configuracoes"
                            element={<SettingsTabbedPage />}
                        />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </AppProviders>
    );
};
