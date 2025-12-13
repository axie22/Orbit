"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, Input, Button } from "@heroui/react";

export default function PasswordPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verify-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Incorrect password");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 items-center pb-0">
          <h1 className="text-xl font-bold text-slate-900">
            Restricted Access in Beta Phase
          </h1>
          <p className="text-sm text-slate-500">
            Please enter the passcode to continue
          </p>
        </CardHeader>
        <CardBody className="gap-4 py-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="password"
              label="Passcode"
              placeholder="Enter site password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              errorMessage={error}
              isInvalid={!!error}
              fullWidth
            />
            <Button
              type="submit"
              color="primary"
              isLoading={isLoading}
              fullWidth
            >
              Enter Site
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
