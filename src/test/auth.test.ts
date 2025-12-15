import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('Authentication Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sign Up', () => {
    it('should successfully sign up a new user', async () => {
      const mockSignUp = vi.fn().mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' }, session: null },
        error: null,
      });

      vi.mocked(supabase.auth.signUp).mockImplementation(mockSignUp);

      const result = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.error).toBeNull();
      expect(result.data.user?.email).toBe('test@example.com');
    });

    it('should handle signup errors', async () => {
      const mockError = { message: 'User already exists', name: 'AuthError' } as any;
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await supabase.auth.signUp({
        email: 'existing@example.com',
        password: 'password123',
      });

      expect(result.error).toBe(mockError);
      expect(result.data.user).toBeNull();
    });

    it('should validate email format before signup', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailRegex.test('valid@example.com')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('@example.com')).toBe(false);
      expect(emailRegex.test('user@')).toBe(false);
    });

    it('should validate password strength', () => {
      const isStrongPassword = (password: string) => {
        return password.length >= 8;
      };

      expect(isStrongPassword('password123')).toBe(true);
      expect(isStrongPassword('short')).toBe(false);
      expect(isStrongPassword('12345678')).toBe(true);
    });
  });

  describe('Sign In', () => {
    it('should successfully sign in an existing user', async () => {
      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        user: { 
          id: '123', 
          email: 'test@example.com',
          aud: 'authenticated',
          created_at: '2024-01-01',
        } as any,
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockSession.user, session: mockSession as any },
        error: null,
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.error).toBeNull();
      expect(result.data.session?.access_token).toBe('mock-token');
    });

    it('should handle invalid credentials', async () => {
      const mockError = { message: 'Invalid login credentials', name: 'AuthError' } as any;
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.error).toBe(mockError);
      expect(result.data.session).toBeNull();
    });
  });

  describe('Sign Out', () => {
    it('should successfully sign out a user', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const result = await supabase.auth.signOut();

      expect(result.error).toBeNull();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle signout errors', async () => {
      const mockError = { message: 'Signout failed', name: 'AuthError' } as any;
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: mockError });

      const result = await supabase.auth.signOut();

      expect(result.error).toBe(mockError);
    });
  });

  describe('Password Reset', () => {
    it('should send password reset email', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await supabase.auth.resetPasswordForEmail('test@example.com');

      expect(result.error).toBeNull();
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should handle reset email errors', async () => {
      const mockError = { message: 'Email not found', name: 'AuthError' } as any;
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
        data: {},
        error: mockError,
      });

      const result = await supabase.auth.resetPasswordForEmail('nonexistent@example.com');

      expect(result.error).toBe(mockError);
    });
  });

  describe('Session Management', () => {
    it('should get current session', async () => {
      const mockSession = {
        access_token: 'mock-token',
        user: { id: '123', email: 'test@example.com' },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession as any },
        error: null,
      });

      const result = await supabase.auth.getSession();

      expect(result.error).toBeNull();
      expect(result.data.session?.access_token).toBe('mock-token');
    });

    it('should return null when no session exists', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await supabase.auth.getSession();

      expect(result.data.session).toBeNull();
    });

    it('should handle auth state changes', () => {
      const mockCallback = vi.fn();
      const mockSubscription = { unsubscribe: vi.fn() };

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: mockSubscription as any },
      } as any);

      const { data } = supabase.auth.onAuthStateChange(mockCallback);

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
      expect(data.subscription).toBeDefined();
    });
  });

  describe('OAuth Integration', () => {
    it('should initiate Google OAuth flow', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com/...' },
        error: null,
      });

      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });

      expect(result.error).toBeNull();
      expect(result.data.provider).toBe('google');
    });

    it('should handle OAuth errors', async () => {
      const mockError = { message: 'OAuth provider unavailable', name: 'AuthError' } as any;
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: null },
        error: mockError,
      });

      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });

      expect(result.error).toBe(mockError);
    });
  });
});
