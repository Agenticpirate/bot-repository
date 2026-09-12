# Security Policy

## 🔒 Security Best Practices

### API Keys

- **NEVER** commit API keys to Git
- Store keys in `.env` file (already in `.gitignore`)
- Use different keys for development and production
- Rotate keys regularly
- Revoke compromised keys immediately

### Environment Variables

All sensitive data should be in `.env`:
- `GROK_API_KEY` - Your Grok API key
- `STRIPE_SECRET_KEY` - Payment processing (if applicable)
- `DATABASE_URL` - Database connection (if applicable)

### File Permissions

```bash
# Make .env file readable only by you
chmod 600 .env
```

## 🛡️ Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email: security@grok-agents-hub.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours.

## ✅ Security Checklist

Before committing code:

- [ ] No API keys in code
- [ ] No secrets in comments
- [ ] `.env` file is in `.gitignore`
- [ ] No hardcoded credentials
- [ ] Dependencies are up to date
- [ ] No sensitive data in logs

## 🔐 What We Protect

- User API keys
- Payment information (if applicable)
- User data
- Repository secrets

## 📋 Security Updates

We regularly:
- Update dependencies
- Audit for vulnerabilities
- Review security practices
- Monitor for threats

---

**Stay secure! 🔒**

