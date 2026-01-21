
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPage } from '../AdminPage';
import { useAuth } from '../../context/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('AdminPage', () => {
    const mockLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            user: { role: 'admin', username: 'AdminUser' },
            logout: mockLogout,
        });
    });

    describe('UI 呈現', () => {
        it('檢查 Admin 頁面基本元素', () => {
            render(
                <BrowserRouter>
                    <AdminPage />
                </BrowserRouter>
            );


            expect(screen.getByText('🛠️ 管理後台')).toBeInTheDocument();
            expect(screen.getByText('← 返回')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登出' })).toBeInTheDocument();
            expect(screen.getByText('管理員專屬頁面')).toBeInTheDocument();
        });

        it('驗證管理員角色標記顯示', () => {
            (useAuth as any).mockReturnValue({
                user: { role: 'admin', username: 'AdminUser' },
                logout: mockLogout,
            });

            render(
                <BrowserRouter>
                    <AdminPage />
                </BrowserRouter>
            );

            expect(screen.getByText('管理員')).toBeInTheDocument();
        });

        it('驗證一般用戶角色標記顯示', () => {
            (useAuth as any).mockReturnValue({
                user: { role: 'user', username: 'NormalUser' },
                logout: mockLogout,
            });

            render(
                <BrowserRouter>
                    <AdminPage />
                </BrowserRouter>
            );

            expect(screen.getByText('一般用戶')).toBeInTheDocument();
        });
    });

    describe('互動行為', () => {
        it('驗證登出功能', async () => {
            render(
                <BrowserRouter>
                    <AdminPage />
                </BrowserRouter>
            );

            await userEvent.click(screen.getByRole('button', { name: '登出' }));

            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });

    describe('路由導轉', () => {
        it('驗證返回儀表板連結', async () => {
            render(
                <BrowserRouter>
                    <AdminPage />
                </BrowserRouter>
            );

            const backLink = screen.getByText('← 返回');
            expect(backLink.closest('a')).toHaveAttribute('href', '/dashboard');
        });
    });
});
