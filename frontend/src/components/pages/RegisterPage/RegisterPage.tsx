import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@templates/index';
import { AuthPanel } from '@organisms/index';
import { useAuth } from '@/hooks/useAuth';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthLayout
      headline="Create an account"
      subhead="It's quick, and always will be - this clone stores everything in your own database."
    >
      <AuthPanel
        mode="register"
        onRegister={async (payload) => {
          await register(payload);
          navigate('/', { replace: true });
        }}
      />
    </AuthLayout>
  );
}
