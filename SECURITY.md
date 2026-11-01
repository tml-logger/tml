# Security policy

## Report a vulnerability

Report suspected vulnerabilities through
[GitHub's private vulnerability reporting form](https://github.com/tml-logger/tml/security/advisories/new).
Please keep exploit details out of public issues and pull requests while the
report is being investigated.

Include the affected package and version, the runtime, steps to reproduce,
and the security impact. A minimal reproduction using synthetic data is useful.
Do not include live credentials, personal data, or production logs.

If the private reporting form is unavailable, open an issue asking for a
private reporting channel without including vulnerability details.

## Scope

This policy covers `@tmlog/core`, `@tmlog/browser`, `@tmlog/node`, and the code
in this repository. Please report issues affecting any version and indicate
whether you can reproduce them on the latest release or `master`. Reports are
reviewed by the maintainers; no fixed response time or backport schedule is
promised.

## Logging and sensitive data

Alert redaction matches configured field names; it does not detect arbitrary
secrets embedded in messages or strings. Ordinary console logs and Node.js
buffer events are not automatically redacted. Avoid logging credentials or
personal data, and sanitize server events before exposing them to a browser.
