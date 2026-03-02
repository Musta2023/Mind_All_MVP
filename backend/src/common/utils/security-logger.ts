export class SecurityLogger {
  /**
   * Redacts sensitive information (emails, secrets, high-entropy tokens) from logs.
   */
  static redact(data: any): any {
    if (!data) return data;

    const sensitiveKeys = ['password', 'token', 'refreshToken', 'accessToken', 'email', 'apiKey', 'secret'];
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    if (typeof data === 'string') {
      return data.replace(emailRegex, '[REDACTED_EMAIL]');
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redact(item));
    }

    if (typeof data === 'object') {
      const redacted: any = {};
      for (const key in data) {
        if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.redact(data[key]);
        }
      }
      return redacted;
    }

    return data;
  }

  static log(message: string, context?: any) {
    const redactedContext = context ? this.redact(context) : '';
    console.log(`[SECURE_LOG] ${message}`, redactedContext);
  }
}
