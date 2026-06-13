# ADR-003: Store JWT in localStorage (MVP)

## Status: Accepted

## Context
The frontend needs to persist the JWT access token between page loads. The two options are:
1. **localStorage** — simple, universally supported, accessible to JS
2. **httpOnly cookie** — more secure against XSS, but requires CSRF protection and a more complex backend setup

## Decision
Store the JWT in `localStorage` for the MVP. A 24-hour token TTL limits the exposure window.

## Consequences
**Easier:** No CSRF tokens, no cookie configuration, simpler Axios interceptor setup.

**Harder:** Vulnerable to XSS token theft. Acceptable for MVP because: (a) React escapes output by default, (b) no `dangerouslySetInnerHTML`, (c) no user-generated HTML rendered. Post-MVP: migrate to httpOnly cookie + short-lived access token + refresh token rotation.
