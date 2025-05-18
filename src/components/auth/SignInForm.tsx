import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import { supabase } from "../../supabaseClient";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) {
        setError(error.message);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="w-full max-w-md pt-10 mx-auto">
        {/* Optional: Link back to a public page or remove if not needed */}
        {/* <Link
          to="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Back to dashboard
        </Link> */}
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password to sign in.
            </p>
          </div>
          <div>
            {/* OAuth buttons and "Or" divider removed */}
            <form onSubmit={handleLogin}>
              {error && <p className="mb-4 text-sm text-center text-red-500">{error}</p>}
              <div className="space-y-6">
                <div>
                  <Label htmlFor="email">
                    Email <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="info@example.com" 
                    required 
                  />
                </div>
                <div>
                  <Label htmlFor="password">
                    Password <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox id="keep-logged-in" checked={isChecked} onChange={() => setIsChecked(!isChecked)} />
                    <Label htmlFor="keep-logged-in" className="font-normal text-gray-700 dark:text-gray-400">
                      Keep me logged in
                    </Label>
                  </div>
                  {/* Forgot password link can remain if you intend to implement reset password functionality */}
                  <Link
                    to="/reset-password" 
                    className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div>
                  <Button type="submit" className="w-full" size="sm" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </div>
              </div>
            </form>

            {/* "Don't have an account? Sign Up" link removed */}
          </div>
        </div>
      </div>
    </div>
  );
}
