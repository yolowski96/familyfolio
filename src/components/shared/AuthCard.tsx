'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AuthCardProps {
  title: string;
  description: string;
  error?: string | null;
  footer: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  children: React.ReactNode;
}

/**
 * Shared card + form shell used by both `/login` and `/signup`, so the two
 * auth screens stay consistent and free of duplicated markup.
 */
export function AuthCard({
  title,
  description,
  error,
  footer,
  onSubmit,
  children,
}: AuthCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {children}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">{footer}</CardFooter>
      </form>
    </Card>
  );
}
