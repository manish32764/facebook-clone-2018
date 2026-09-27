import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@templates/index';
import { AuthPanel } from '@organisms/index';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthLayout
      headline="Facebook helps you connect and share with the people in your life."
      subhead="Sign in to see photos and updates from your friends."
    >
      <AuthPanel
        mode="login"
        onLogin={async (payload) => {
          await login(payload);
          navigate('/', { replace: true });
        }}
      />
    </AuthLayout>
  );
}
