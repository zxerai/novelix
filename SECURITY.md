# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in JiaOS, please report it privately.

**Do not** open a public issue. Instead:

- Open a **draft security advisory**: https://github.com/zxerai/jiaos/security/advisories/new
- Or contact the maintainers via GitHub

We will acknowledge receipt within 48 hours and provide an estimated timeline for a fix.

## Scope

Security issues include, but are not limited to:

- **Prompt injection** through book content that could leak API keys
- **Path traversal** via bookId or file path manipulation
- **API key exposure** through logs, error messages, or config files
- **SSRF** via LLM provider base URL configuration
- **Unauthorized file access** through truth file or chapter endpoints

## Supported Versions

| Version | Supported |
|---------|-----------|
| >= 1.4.x | ✅ |
| < 1.4 | ⚠️ Limited |

## Security Best Practices

- Store API keys in `.jiaos/secrets.json` or environment variables — never commit them
- Review LLM provider base URLs before connecting to custom endpoints
- Keep dependencies updated: `npm update` or `pnpm update`
