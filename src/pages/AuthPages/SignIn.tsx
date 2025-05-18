import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | TD Consulting App"
        description="Sign In page for TD Consulting App"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
