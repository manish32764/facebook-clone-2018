import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Divider, Input, Link } from '@atoms/index';
import { ErrorNotice } from '@molecules/index';
import type { LoginPayload, RegisterPayload } from '@/types';
import styles from './AuthPanel.module.css';

export interface AuthPanelProps {
  mode: 'login' | 'register';
  onLogin?: (payload: LoginPayload) => Promise<void>;
  onRegister?: (payload: RegisterPayload) => Promise<void>;
}

const DEMO_ACCOUNT: LoginPayload = { email: 'mark@facebook.dev', password: 'password123' };

/** Both auth forms in one organism - the fields differ, the flow does not. */
export function AuthPanel({ mode, onLogin, onRegister }: AuthPanelProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const isRegister = mode === 'register';

  async function submit(payload: () => Promise<void>) {
    setIsSubmitting(true);
    setError(null);
    try {
      await payload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    void submit(async () => {
      if (isRegister) {
        await onRegister?.({ firstName, lastName, email, password, birthDate: birthDate || undefined });
      } else {
        await onLogin?.({ email, password });
      }
    });
  }

  function fillDemo() {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit} noValidate>
      <div className={styles.fields}>
        {error && <ErrorNotice message={error} />}

        {isRegister && (
          <div className={styles.nameRow}>
            <Input
              label="First name"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Surname"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        )}

        <Input
          type="email"
          label={isRegister ? 'Email address' : undefined}
          placeholder="Email address"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          type="password"
          label={isRegister ? 'New password' : undefined}
          placeholder="Password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          required
          minLength={6}
          hint={isRegister ? 'At least 6 characters' : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {isRegister && (
          <Input
            type="date"
            label="Date of birth"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        )}

        <div className={styles.submit}>
          <Button
            type="submit"
            size="lg"
            fullWidth
            variant={isRegister ? 'success' : 'primary'}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Please wait...' : isRegister ? 'Sign Up' : 'Log In'}
          </Button>
        </div>

      </div>

      {isRegister ? (
        <>
          <p className={styles.legal}>
            By clicking Sign Up, you agree to our Terms, Data Policy and Cookie Policy. This is a
            learning project and not affiliated with Facebook.
          </p>
          <Divider />
          <div className={styles.switch}>
            <Link to="/login" bold>
              Already have an account?
            </Link>
          </div>
        </>
      ) : (
        <>
          <Link to="/register" className={styles.forgot}>
            Forgotten account?
          </Link>
          <Divider />
          <div className={styles.switch}>
            <Button variant="success" size="lg" onClick={() => navigate('/register')}>
              Create New Account
            </Button>
          </div>
          <div className={styles.demo}>
            <span className={styles.demoTitle}>Try the demo account</span>
            <span className={styles.demoCreds}>
              {DEMO_ACCOUNT.email} &nbsp;/&nbsp; {DEMO_ACCOUNT.password}
            </span>
            <button type="button" className={styles.demoButton} onClick={fillDemo}>
              Fill it in for me
            </button>
          </div>
        </>
      )}
    </form>
  );
}
