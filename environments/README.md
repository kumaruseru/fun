# CosmicProto v2.0 Environment Configuration

## 🚨 SECURITY NOTICE
**NEVER commit actual credentials to version control!**

The environment files in this repository are **TEMPLATES** with placeholder values. You must replace all placeholder values with your actual credentials before deployment.

## 📁 Environment Structure

```
environments/
├── dev/
│   └── .env.development          # Development environment
├── staging/
│   └── .env.staging              # Staging environment (template)
└── production/
    └── .env.production           # Production environment (template)
```

## 🔧 Setup Instructions

### 1. Development Environment
```bash
cp environments/dev/.env.development .env
# Edit .env with your development credentials
```

### 2. Staging Environment  
```bash
cp environments/staging/.env.staging .env.staging
# Edit .env.staging with your staging credentials
```

### 3. Production Environment
```bash
cp environments/production/.env.production .env.production
# Edit .env.production with your production credentials
```

## 🗝️ Required Credentials

### Database
- **MySQL**: Host, port, username, password, database name
- **MongoDB**: Connection URI with credentials
- **Redis**: Host, port, password
- **Neo4j**: URI, username, password

### Security
- **JWT_SECRET**: At least 64 characters long
- **ENCRYPTION_KEY**: 32-byte hex key
- **SESSION_SECRET**: Strong random string

### Email
- **SMTP**: Host, port, username, password
- **IMAP/POP3**: Host, port credentials

## 🛡️ Security Best Practices

1. **Generate Strong Secrets**:
   ```bash
   # Generate JWT secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Generate encryption key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Use Environment Variables**: Never hardcode credentials in source code

3. **Separate Environments**: Use different credentials for dev/staging/production

4. **Regular Rotation**: Rotate secrets regularly

5. **Access Control**: Limit who has access to production credentials

## 📋 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Application environment | `production` |
| `PORT` | Server port | `10000` |
| `MYSQL_HOST` | MySQL database host | `localhost` |
| `MYSQL_PASSWORD` | MySQL password | `your-secure-password` |
| `JWT_SECRET` | JWT signing secret | `64-char-hex-string` |
| `CORS_ORIGIN` | Allowed CORS origins | `https://yourdomain.com` |

## 🚀 CosmicProto v2.0 Specific

CosmicProto v2.0 uses enhanced configuration for:
- **Connection Pooling**: MySQL2 with connection limits
- **Circuit Breakers**: Database resilience patterns  
- **Rate Limiting**: Request throttling configuration
- **Encryption**: Field-level and quantum encryption settings
- **Monitoring**: Health check and performance tracking

Ensure all CosmicProto-specific environment variables are properly configured for optimal performance and security.
