import { SignIn } from "@clerk/remix";

export default function SignInPage() {
  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <SignIn />
    </div>
  );
}
