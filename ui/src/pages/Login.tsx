import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Brain, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/stores/auth";
import { loginSchema } from "@/schemas/auth";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      await login(value.email, value.password);
      navigate({ to: "/" });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to continue to OCEAN Personality Detection
          </p>
        </div>

        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <LogIn className="w-5 h-5 text-white" />
              </div>
              Sign In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              <form.Field name="email">
                {(field) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor={field.name}
                      className="flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4 text-gray-500" />
                      Email
                    </Label>
                    <Input
                      id={field.name}
                      type="email"
                      placeholder="Enter your email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="bg-white"
                    />
                    {form.state.isSubmitted &&
                      field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-red-500">
                          {field.state.meta.errors
                            .map((e) => e.message)
                            .join(", ")}
                        </p>
                      )}
                  </div>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <Label
                      htmlFor={field.name}
                      className="flex items-center gap-2"
                    >
                      <Lock className="w-4 h-4 text-gray-500" />
                      Password
                    </Label>
                    <Input
                      id={field.name}
                      type="password"
                      placeholder="Enter your password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="bg-white"
                    />
                    {form.state.isSubmitted &&
                      field.state.meta.errors.length > 0 && (
                        <p className="text-sm text-red-500">
                          {field.state.meta.errors
                            .map((e) => e.message)
                            .join(", ")}
                        </p>
                      )}
                  </div>
                )}
              </form.Field>

              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Sign In
                      </>
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
