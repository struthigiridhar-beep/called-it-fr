

## Remaining Gap: Landing.tsx Auth Form vs Mockup (image-107)

The core flows (onboarding pages, create/join sheet, invite sheet, referral tracking, routing) are all wired and working. The only delta is the auth form on Landing.tsx doesn't match the mockup exactly.

### What's different

| Element | Mockup (image-107) | Current code |
|---------|-------------------|--------------|
| Heading | "Save your bet" | "Save your bet." (close enough) |
| Subtext | "Create an account to lock in your **50 coin** YES bet." | "Create an account to lock it in." |
| Display name field | Present, first field | Missing |
| Email placeholder | "Email address" | "your@email.com" |
| Password placeholder | "Password (min 8 chars)" | "Password" |
| Submit button | "Save my bet & continue →" | "Create account" |
| Sign-in toggle | "Already have an account? Sign in" | Same (matches) |

### Changes needed

**File: `src/pages/Landing.tsx`** (auth section, lines 312-353)

1. Add `displayName` state variable
2. Update subtext to include pending bet details: `"Create an account to lock in your {amount} coin {SIDE} bet."`
3. Add Display name input before email (same styling)
4. Change email placeholder to "Email address"
5. Change password placeholder to "Password (min 8 chars)"
6. Change submit button text from "Create account" to "Save my bet & continue →"
7. Pass display name to `signUp` via `raw_user_meta_data` so the `handle_new_user` trigger picks it up as the user's name

**File: `src/hooks/useAuth.tsx`** (line 35-38)

Update `signUp` to accept optional `displayName` parameter and pass it as `options.data.full_name` to `supabase.auth.signUp`. The existing `handle_new_user` trigger already reads `raw_user_meta_data.full_name`.

### Technical detail

```typescript
// useAuth.tsx signUp update
const signUp = async (email: string, password: string, displayName?: string) => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: displayName ? { data: { full_name: displayName } } : undefined,
  });
  if (error) throw error;
};
```

No other files need changes. Everything else matches the mockups.

