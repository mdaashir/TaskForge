import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.ts';
import { getErrorMessage, homeForRole } from '../../utils/helper.ts';

const SignUp = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setSubmitting(true);
        try {
            const user = await register(name, email, password);
            toast.success('Account created!');
            navigate(homeForRole(user.memberType), { replace: true });
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-sm"
            >
                <h1 className="text-2xl font-semibold text-slate-800">Create account</h1>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm password"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                    {submitting ? 'Creating…' : 'Create account'}
                </button>
                <p className="text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-primary">
                        Sign in
                    </Link>
                </p>
            </form>
        </div>
    );
};

export default SignUp;
