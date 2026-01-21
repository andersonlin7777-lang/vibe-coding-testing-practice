
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from '../DashboardPage';
import { useAuth } from '../../context/AuthContext';
import { productApi } from '../../api/productApi';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock Product API
vi.mock('../../api/productApi', () => ({
    productApi: {
        getProducts: vi.fn(),
    },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('DashboardPage', () => {
    const mockLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            user: { role: 'user', username: 'TestUser' },
            logout: mockLogout,
        });
        // Default success mock
        (productApi.getProducts as any).mockResolvedValue([]);
    });

    describe('UI 呈現', () => {
        it('檢查 Dashboard 頁面基本元素', async () => {
            render(
                <BrowserRouter>
                    <DashboardPage />
                </BrowserRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('儀表板')).toBeInTheDocument();
                expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
                expect(screen.getByText(/Welcome/)).toBeInTheDocument();
                expect(screen.getByText('商品列表')).toBeInTheDocument();
            });
        });

        it('驗證使用者資訊顯示', async () => {
            (useAuth as any).mockReturnValue({
                user: { role: 'user', username: 'TestUser' },
                logout: mockLogout,
            });

            render(
                <BrowserRouter>
                    <DashboardPage />
                </BrowserRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('Welcome, TestUser 👋')).toBeInTheDocument();
                expect(screen.getByText('T')).toBeInTheDocument();
                expect(screen.getByText('一般用戶')).toBeInTheDocument();
            });
        });
    });

    describe('權限顯示', () => {
        it('驗證 Admin 連結顯示 (Admin 角色)', async () => {
            (useAuth as any).mockReturnValue({
                user: { role: 'admin', username: 'TestAdmin' },
                logout: mockLogout,
            });

            render(
                <BrowserRouter>
                    <DashboardPage />
                </BrowserRouter>
            );

            await waitFor(() => {
                expect(screen.getByText('🛠️ 管理後台')).toBeInTheDocument();
            });
        });

        it('驗證 Admin 連結隱藏 (User 角色)', async () => {
            (useAuth as any).mockReturnValue({
                user: { role: 'user', username: 'TestUser' },
                logout: mockLogout,
            });

            render(
                <BrowserRouter>
                    <DashboardPage />
                </BrowserRouter>
            );

            await waitFor(() => {
                expect(screen.queryByText('🛠️ 管理後台')).not.toBeInTheDocument();
            });
        });
    });

    describe('API 互動', () => {
        it('驗證商品載入中狀態', () => {
            (productApi.getProducts as any).mockReturnValue(new Promise(() => { })); // Never resolves

            render(
                <BrowserRouter>
                    <DashboardPage />
                </BrowserRouter>
            );

            expect(screen.getByText('載入商品中...')).toBeInTheDocument();
        });

        it('驗證商品載入成功顯示', async () => {
            const mockProducts = [
                { id: 1, name: 'Product A', price: 100, description: 'Desc A' },
                { id: 2, name: 'Product B', price: 200, description: 'Desc B' }
            ];
            (productApi.getProducts as any).mockResolvedValue(mockProducts);

            render(
                <BrowserRouter>
                    <DashboardPage />
                </BrowserRouter>
            );

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
                expect(screen.getByText('Product A')).toBeInTheDocument();
                expect(screen.getByText('Product B')).toBeInTheDocument();
            });
        });

        it('驗證商品載入失敗顯示', async () => {
            const errorMessage = 'API Error';
            (productApi.getProducts as any).mockRejectedValue({
                response: { data: { message: errorMessage } }
            });

            render(
                <BrowserRouter>
                    <DashboardPage />
                </BrowserRouter>
            );

            await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
            });
        });
    });

    describe('互動行為', () => {
        it('驗證登出功能', async () => {
            render(
                <BrowserRouter>
                    <DashboardPage />
                </BrowserRouter>
            );

            // Wait for initial load to prevent state update warnings if needed, though button is typically always there
            await waitFor(() => screen.getByRole('button', { name: '登出' }));

            await userEvent.click(screen.getByRole('button', { name: '登出' }));

            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });
});
