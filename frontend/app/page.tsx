'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('loggedIn', 'true');
      router.push('/slabs');
    } else {
      setError('Invalid username or password');
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
            <label className="block mb-1 text-sm font-medium text-black">
              Username
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-black">
              Password
            </label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-lg hover:opacity-90"
          >
            Login
          </button>
        </form>
      </div>
    </main>
  );
}