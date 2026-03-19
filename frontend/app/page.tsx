'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setSession } from './lib/auth';

type LoginResponse = {
  access_token: string;
  user: {
    username: string;
    role: 'admin' | 'warehouse_user' | 'guest';
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const finishLogin = (payload: LoginResponse) => {
    setSession({
      accessToken: payload.access_token,
      username: payload.user.username,
      role: payload.user.role,
    });
    router.push('/slabs');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Invalid username or password');
      }

      const payload = (await res.json()) as LoginResponse;
      finishLogin(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/guest-login', {
        method: 'POST',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Guest login failed');
      }

      const payload = (await res.json()) as LoginResponse;
      finishLogin(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guest login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm bg-white p-8 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-black">
          StoneSlabApp Login
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-black">Username</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-black">Password</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white py-2 rounded-lg hover:opacity-90 disabled:opacity-60"
          >
            Sign in
          </button>
        </form>

        <button
          onClick={handleGuestLogin}
          disabled={submitting}
          className="mt-3 w-full rounded-lg border border-gray-400 py-2 text-sm text-black hover:bg-gray-50 disabled:opacity-60"
        >
          Continue as Guest (read-only)
        </button>
      </div>
    </main>
  );
}
