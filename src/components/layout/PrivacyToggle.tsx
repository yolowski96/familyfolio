'use client';

import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { usePrivacy } from '@/components/providers/PrivacyProvider';

export function PrivacyToggle() {
  const { isPrivate, toggle } = usePrivacy();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isPrivate ? 'Show values' : 'Hide values'}
    >
      {isPrivate ? (
        <IconEyeOff className="size-5" />
      ) : (
        <IconEye className="size-5" />
      )}
      <span className="sr-only">Toggle privacy</span>
    </Button>
  );
}
