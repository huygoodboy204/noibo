import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

// Define types for context value
interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null; // Assuming user_role_enum will be a string here
  signOut: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authTimeout, setAuthTimeout] = useState(false);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      console.log(`[AuthContext] fetchUserRole called for userId: ${userId}`);
      const { data, error, status } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error(`[AuthContext] Error fetching user role (status ${status}):`, error.message, error.details || '', error.hint || '');
        setUserRole(null);
        console.log(`[AuthContext] userRole state set to null due to error for userId: ${userId}`);
        return;
      }

      if (data) {
        console.log(`[AuthContext] Successfully fetched role: ${data.role} for userId: ${userId}`);
        setUserRole(data.role);
        console.log(`[AuthContext] userRole state set to: ${data.role} for userId: ${userId}`);
      } else {
        console.warn(`[AuthContext] No data returned for user role query (userId: ${userId}). Setting role to null.`);
        setUserRole(null);
        console.log(`[AuthContext] userRole state set to null (no data) for userId: ${userId}`);
      }
    } catch (err: any) {
      console.error('[AuthContext] Exception in fetchUserRole:', err.message || err);
      setUserRole(null);
      console.log(`[AuthContext] userRole state set to null due to exception for userId: ${userId}`);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true); // Ensure loading is true at the start of initialization

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Initializing Auth...');
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (sessionError) {
          console.error('[AuthContext] Error getting initial session:', sessionError.message);
        }

        console.log('[AuthContext] Initial session fetched:', initialSession ? initialSession.user.id : 'No initial session');

        if (initialSession && initialSession.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          console.log(`[AuthContext] Initial session user ID: ${initialSession.user.id}. Fetching role...`);
          await fetchUserRole(initialSession.user.id);
        } else {
          // No initial session, user is not logged in
          setUserRole(null); // Explicitly set role to null if no session
          console.log('[AuthContext] No initial session or user. Role set to null.');
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (_event, currentSession) => {
            if (!mounted) return;
            console.log(`[AuthContext] onAuthStateChange event: ${_event}, session user:`, currentSession?.user?.id);

            setSession(currentSession);
            const currentUser = currentSession?.user ?? null;
            setUser(currentUser);

            // Bỏ qua việc fetch role khi có USER_UPDATED event
            if (_event === 'USER_UPDATED') {
              console.log('[AuthContext] Skipping role fetch for USER_UPDATED event');
              return;
            }

            if (currentUser && currentUser.id) {
              console.log(`[AuthContext] Auth state changed. User ID: ${currentUser.id}. Fetching role...`);
              await fetchUserRole(currentUser.id);
            } else {
              console.log('[AuthContext] Auth state changed. No user or user ID. Role set to null.');
              setUserRole(null);
            }
          }
        );

        return () => {
          if (authListener && authListener.subscription) {
            authListener.subscription.unsubscribe();
            console.log('[AuthContext] Auth listener unsubscribed.');
          }
        };
      } catch (error: any) {
        console.error('[AuthContext] Error in auth initialization catch block:', error.message || error);
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('[AuthContext] Auth initialization complete. Loading set to false.');
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      console.log('[AuthContext] AuthProvider unmounted.');
    };
  }, [fetchUserRole]);

  const signOut = useCallback(async () => {
    try {
      console.log('[AuthContext] Signing out...');
      
      // Tạo AbortController để có thể hủy request nếu cần
      const controller = new AbortController();
      const signal = controller.signal;

      // Xóa session trong Supabase với timeout
      const timeoutDuration = 5000; // 5 seconds
      const timeout = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error(`Sign out timed out after ${timeoutDuration}ms`));
        }, timeoutDuration);
      });

      // Thực hiện signOut với timeout
      const { error } = await Promise.race([
        supabase.auth.signOut(),
        timeout
      ]);

      if (error) throw error;

      // Reset state
      setSession(null);
      setUser(null);
      setUserRole(null);
      
      // Chuyển hướng về trang đăng nhập
      window.location.href = '/signin';
      
      console.log('[AuthContext] Sign out successful');
    } catch (error: any) {
      console.error('[AuthContext] Error signing out:', error.message || error);
      // Nếu có lỗi, vẫn reset state và chuyển hướng
      setSession(null);
      setUser(null);
      setUserRole(null);
      window.location.href = '/signin';
    }
  }, []);

  const isAuthenticated = useMemo(() => !!user && !!session && !!userRole, [user, session, userRole]);

  const value = useMemo(() => ({
    session,
    user,
    userRole,
    signOut,
    loading,
    isAuthenticated,
  }), [session, user, userRole, signOut, loading, isAuthenticated]);
  
  useEffect(() => {
    console.log('[AuthContext] Value updated - UserRole:', userRole, 'IsAuth:', isAuthenticated, 'Loading:', loading);
  }, [userRole, isAuthenticated, loading]);

  // Timeout logic: nếu loading quá 10s thì hiện thông báo
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setAuthTimeout(true), 10000);
      return () => clearTimeout(timer);
    } else {
      setAuthTimeout(false);
    }
  }, [loading]);

  // Render thông báo nếu timeout
  if (authTimeout) {
    return (
      <div style={{textAlign:'center',marginTop:40}}>
        <p>Xác thực quá lâu, vui lòng đăng nhập lại.</p>
        <button onClick={() => window.location.reload()} style={{padding:'8px 16px',borderRadius:6,background:'#2563eb',color:'#fff',border:'none'}}>Đăng nhập lại</button>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 