# Project Security Guidelines & Hardening Mandates

All subsequent modifications to this application MUST adhere strictly to these security design parameters:

## 1. Advanced Authentication & Session Security (Anti-Brute Force)
- **Rate Limiting**: All authentication/recovery endpoints (register, login, forgot-password) must be protected by the `authRateLimiter` middleware. It restricts to a maximum of 3 requests per 10 minutes per IP/Account.
- **Token Security**: Never store session tokens (`sessionToken`, etc.) in `localStorage` or `sessionStorage`. All sessions must be handled using secure `HttpOnly`, `SameSite=Strict`, and `Secure` cookies.
- **Inactivity Timeout**: The system enforces a strict 30-minute inactivity timeout. Both the server-side session checks and client-side mouse/keyboard/scroll event listeners must reset this timeout. If inactivity exceeds 30 minutes, automatically terminate the session, clear the cookies, and show the "Session Expired" warning.

## 2. Deep Data Sanitization & Input Defense (Anti-XSS & Injection)
- **Schema Validation**: Every endpoint receiving client payloads must validate inputs using strict server-side `zod` schemas.
- **Output Encoding & Sanitization**: All user-generated content must be escaped before storage and DOM rendering using the deep `sanitizeInput` recursive helper. This guards against reflected and stored XSS.
- **Prototype Pollution Prevention**: Any JSON parser or object copier must explicitly exclude keys like `__proto__`, `constructor`, and `prototype` to eliminate Prototype Pollution vulnerability.
- **No Evaluation Functions**: Under no circumstances should dangerous evaluation functions (such as `eval()`, `Function()`, or un-sanitized `dangerouslySetInnerHTML`) be introduced into the frontend.

## 3. Network Hardening & Clickjacking Mitigation
- **CORS Policies**: Cross-Origin Resource Sharing is strictly restricted to trusted origins (localhost, Google Run, AI Studio).
- **Helmet Headers**: Always mount the Helmet middleware suite. Since AI Studio renders the preview in an `iframe`, clickjacking protection is handled using the modern Content Security Policy `frame-ancestors` directive (which permits `ai.studio` and Google domains) rather than `X-Frame-Options: SAMEORIGIN`.

## 4. Social Engineering & Phishing Defense
- **Security Notice Banner**: The `AuthScreen` must display a bilingual high-visibility banner warning users that administrators will never ask for credentials or OTPs.
- **Security Activity Log**: The profile modal (HobbiesModal) must display the user's `lastLoginAt` timestamp alongside secure session status indicators, warning them of any unauthorized access attempts.
