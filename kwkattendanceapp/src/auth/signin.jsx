import { signInWithEmailAndPassword } from 'firebase/auth'
import { useState } from 'react'
import { auth } from '../firebase/firebase'

function SignIn() {
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [error, setError] = useState('')
const [loading, setLoading] = useState(false)

async function handleSubmit(event) {
event.preventDefault()
if (loading) return
setError('')
setLoading(true)

try {
    await signInWithEmailAndPassword(auth, email.trim(), password)
} catch {
    setError('Unable to sign in. Check your email, password, and connection.')
} finally {
    setLoading(false)
}
}

return (
<section className="container py-4 text-start" style={{ maxWidth: '420px' }}>
    <h1 className="h3">Instructor Sign In</h1>
    <form onSubmit={handleSubmit}>
    <div className="mb-3">
        <label htmlFor="signin-email" className="form-label">info@kenwakan.com</label>
        <input
        id="signin-email"
        type="email"
        className="form-control form-control-lg"
        autoComplete="username"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        />
    </div>
    <div className="mb-3">
        <label htmlFor="signin-password" className="form-label">Integrity108</label>
        <input
        id="signin-password"
        type="password"
        className="form-control form-control-lg"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        />
    </div>
    {error && <p className="text-danger" role="alert">{error}</p>}
    <button type="submit" className="btn btn-danger btn-lg w-100" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign In'}
    </button>
    </form>
</section>
)
}

export default SignIn
