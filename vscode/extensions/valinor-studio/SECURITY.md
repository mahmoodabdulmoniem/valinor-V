# 🔒 Security Guide - Valinor Studio Extension

## 🚨 **CRITICAL: Key Rotation Required for Production**

Due to the exposure of AWS credentials in the commit history, **ALL keys must be rotated before production deployment**.

## 📋 **Keys Requiring Rotation**

### 1. **AWS Credentials**
- **AWS Access Key ID**: `AKIAZK7WOGQQWPJA6WSP` ❌ **COMPROMISED**
- **AWS Secret Access Key**: `hhuR67DKFjl9P2/kkXNtsmz+p1a/F8kB97f4d3n2` ❌ **COMPROMISED**
- **AWS Region**: `us-east-1` ✅ **Safe to keep**

### 2. **SAM.gov API Key**
- **SAM API Key**: `FBmRkLtNNplrAEb2Kfnc4PqBQyRbZEyA2vj9TNSn` ❌ **COMPROMISED**

### 3. **Other API Keys**
- **OpenAI API Key**: Check if exposed
- **Google AI API Key**: Check if exposed
- **OpenSearch Credentials**: Check if exposed

## 🔄 **Key Rotation Procedures**

### **AWS Credentials Rotation**

1. **Access AWS IAM Console**
   ```bash
   # Go to AWS IAM Console
   https://console.aws.amazon.com/iam/
   ```

2. **Deactivate Current Access Key**
   - Navigate to IAM → Users → Your User
   - Find the compromised access key
   - Click "Deactivate" immediately

3. **Create New Access Key**
   - Click "Create access key"
   - Choose "Application running outside AWS"
   - Download the new credentials securely

4. **Update Environment Variables**
   ```bash
   # Update your .env file
   AWS_ACCESS_KEY_ID=your_new_access_key_here
   AWS_SECRET_ACCESS_KEY=your_new_secret_key_here
   ```

5. **Test New Credentials**
   ```bash
   cd vscode/extensions/valinor-studio
   node test-dynamodb.js
   ```

### **SAM.gov API Key Rotation**

1. **Access SAM.gov**
   - Go to https://sam.gov/
   - Log in to your account

2. **Generate New API Key**
   - Navigate to API Access
   - Revoke the old key
   - Generate a new API key

3. **Update Configuration**
   ```bash
   # Update your .env file
   SAM_KEY=your_new_sam_api_key_here
   ```

## 🛡️ **Production Security Checklist**

### **Environment Variables**
- [ ] All credentials moved to environment variables
- [ ] No hardcoded secrets in source code
- [ ] `.env` file added to `.gitignore`
- [ ] Production secrets stored securely (AWS Secrets Manager, etc.)

### **AWS Security**
- [ ] IAM roles with minimal required permissions
- [ ] Access keys rotated and old ones deactivated
- [ ] CloudTrail enabled for audit logging
- [ ] S3 bucket policies configured properly

### **API Security**
- [ ] All API keys rotated
- [ ] Rate limiting implemented
- [ ] API keys stored in secure vault
- [ ] Regular key rotation schedule established

### **Code Security**
- [ ] No secrets in commit history
- [ ] Security scanning enabled
- [ ] Dependencies updated and scanned
- [ ] Code review process for security

## 🔧 **Secure Configuration Setup**

### **Development Environment**
```bash
# Create .env file (never commit this)
cp .env.example .env

# Edit .env with your new credentials
nano .env
```

### **Production Environment**
```bash
# Use AWS Secrets Manager or similar
aws secretsmanager create-secret \
  --name "valinor-studio/prod" \
  --description "Valinor Studio Production Secrets" \
  --secret-string '{
    "AWS_ACCESS_KEY_ID": "your_new_key",
    "AWS_SECRET_ACCESS_KEY": "your_new_secret",
    "SAM_API_KEY": "your_new_sam_key",
    "OPENAI_API_KEY": "your_openai_key"
  }'
```

## 📊 **Monitoring & Alerting**

### **AWS CloudWatch Alarms**
- Monitor for unusual API usage
- Alert on failed authentication attempts
- Track DynamoDB access patterns

### **Security Monitoring**
- Enable AWS GuardDuty
- Set up CloudTrail alerts
- Monitor for credential exposure

## 🚨 **Emergency Procedures**

### **If Credentials Are Compromised**

1. **Immediate Actions**
   ```bash
   # Deactivate all compromised keys immediately
   # Generate new keys
   # Update all systems
   ```

2. **Investigation**
   - Review access logs
   - Identify breach scope
   - Document incident

3. **Recovery**
   - Rotate all affected keys
   - Update all applications
   - Test functionality

## 📞 **Contact Information**

- **AWS Support**: For AWS credential issues
- **SAM.gov Support**: For SAM API issues
- **Security Team**: For security incidents

## 🔄 **Regular Maintenance**

### **Monthly Tasks**
- [ ] Review IAM permissions
- [ ] Check for unused access keys
- [ ] Update dependencies
- [ ] Review security logs

### **Quarterly Tasks**
- [ ] Rotate all API keys
- [ ] Security audit
- [ ] Update security documentation
- [ ] Review access patterns

---

**⚠️ IMPORTANT**: This document should be updated whenever new credentials are added or security procedures change.

**Last Updated**: $(date)
**Next Review**: $(date -d "+30 days")
