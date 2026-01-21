
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';
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

describe('LoginPage', () => {
    const mockLogin = vi.fn();
    const mockClearAuthExpiredMessage = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            login: mockLogin,
            isAuthenticated: false,
            authExpiredMessage: '',
            clearAuthExpiredMessage: mockClearAuthExpiredMessage,
        });
    });

    describe('UI 呈現', () => {
        it('檢查登入頁面基本元素', () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            expect(screen.getByText('歡迎回來')).toBeInTheDocument();
            expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
            expect(screen.getByLabelText('密碼')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();

            // Assuming VITE_API_URL is not set in test env
            expect(screen.getByText(/測試帳號：/)).toBeInTheDocument();
        });

        it('驗證 Loading 狀態', async () => {
            // Setup login to hang so we can check loading state
            mockLogin.mockImplementation(() => new Promise(() => { }));

            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            await userEvent.type(emailInput, 'test@example.com');
            await userEvent.type(passwordInput, 'password123');
            await userEvent.click(submitButton);

            expect(submitButton).toBeDisabled();
            expect(screen.getByText('登入中...')).toBeInTheDocument();
        });
    });

    describe('表單驗證', () => {
        it('驗證無效的 Email 格式', async () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            const emailInput = screen.getByLabelText('電子郵件');
            const submitButton = screen.getByRole('button', { name: '登入' });

            await userEvent.type(emailInput, 'invalid-email');
            await userEvent.click(submitButton);

            expect(screen.getByText('請輸入有效的 Email 格式')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('驗證密碼長度不足', async () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            await userEvent.type(emailInput, 'test@example.com');
            await userEvent.type(passwordInput, '1234567'); // 7 chars
            await userEvent.click(submitButton);

            expect(screen.getByText('密碼必須至少 8 個字元')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('驗證密碼未包含英文字母與數字', async () => {
            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            const emailInput = screen.getByLabelText('電子郵件');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            // Test numbers only
            await userEvent.type(emailInput, 'test@example.com');
            await userEvent.type(passwordInput, '12345678');
            await userEvent.click(submitButton);
            expect(screen.getByText('密碼必須包含英文字母和數字')).toBeInTheDocument();

            // Test letters only
            await userEvent.clear(passwordInput);
            await userEvent.type(passwordInput, 'abcdefgh');
            await userEvent.click(submitButton);
            expect(screen.getByText('密碼必須包含英文字母和數字')).toBeInTheDocument();

            expect(mockLogin).not.toHaveBeenCalled();
        });
    });

    describe('API 互動', () => {
        it('驗證登入失敗處理', async () => {
            mockLogin.mockRejectedValue({
                response: {
                    data: {
                        message: '帳號或密碼錯誤'
                    }
                }
            });

            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            await userEvent.type(screen.getByLabelText('電子郵件'), 'test@example.com');
            await userEvent.type(screen.getByLabelText('密碼'), 'password123');
            await userEvent.click(screen.getByRole('button', { name: '登入' }));

            await waitFor(() => {
                expect(screen.getByText('帳號或密碼錯誤')).toBeInTheDocument();
            });
        });

        it('驗證登入成功導轉', async () => {
            mockLogin.mockResolvedValue(undefined);

            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            await userEvent.type(screen.getByLabelText('電子郵件'), 'test@example.com');
            await userEvent.type(screen.getByLabelText('密碼'), 'password123');
            await userEvent.click(screen.getByRole('button', { name: '登入' }));

            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
            });
        });
    });

    describe('路由導轉', () => {
        it('驗證已登入狀態自動導轉', () => {
            (useAuth as any).mockReturnValue({
                login: mockLogin,
                isAuthenticated: true,
                authExpiredMessage: '',
                clearAuthExpiredMessage: mockClearAuthExpiredMessage,
            });

            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
        });
    });

    describe('邏輯處理', () => {
        it('驗證 Auth Expired 訊息顯示', () => {
            (useAuth as any).mockReturnValue({
                login: mockLogin,
                isAuthenticated: false,
                authExpiredMessage: '請重新登入',
                clearAuthExpiredMessage: mockClearAuthExpiredMessage,
            });

            render(
                <BrowserRouter>
                    <LoginPage />
                </BrowserRouter>
            );

            expect(screen.getByText('請重新登入')).toBeInTheDocument();
            expect(mockClearAuthExpiredMessage).toHaveBeenCalled();
        });
    });
});
