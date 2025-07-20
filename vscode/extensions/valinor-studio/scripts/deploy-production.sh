#!/bin/bash

# 🔒 Production Deployment Script - Valinor Studio Extension
# This script ensures secure deployment with proper credential management

set -e  # Exit on any error

echo "🚀 Starting Valinor Studio Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in production environment
if [ "$NODE_ENV" != "production" ]; then
    print_warning "Not running in production environment. Set NODE_ENV=production"
fi

# Step 1: Security Checks
print_status "🔒 Running security checks..."

# Check for hardcoded secrets
if grep -r "AKIA" src/ 2>/dev/null; then
    print_error "Found hardcoded AWS credentials in source code!"
    exit 1
fi

if grep -r "hhuR67DKFjl9P2" src/ 2>/dev/null; then
    print_error "Found hardcoded AWS secret in source code!"
    exit 1
fi

print_success "No hardcoded secrets found in source code"

# Step 2: Environment Variable Validation
print_status "🔧 Validating environment variables..."

REQUIRED_VARS=(
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "AWS_REGION"
    "SAM_API_KEY"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

print_success "All required environment variables are set"

# Step 3: AWS Credential Validation
print_status "🔑 Validating AWS credentials..."

# Test AWS credentials
if aws sts get-caller-identity >/dev/null 2>&1; then
    print_success "AWS credentials are valid"
else
    print_error "AWS credentials are invalid or expired"
    exit 1
fi

# Step 4: DynamoDB Connection Test
print_status "🗄️ Testing DynamoDB connection..."

if node test-dynamodb.js >/dev/null 2>&1; then
    print_success "DynamoDB connection successful"
else
    print_error "DynamoDB connection failed"
    exit 1
fi

# Step 5: Build Extension
print_status "🔨 Building extension..."

if npm run compile; then
    print_success "Extension compiled successfully"
else
    print_error "Extension compilation failed"
    exit 1
fi

# Step 6: Security Scan
print_status "🔍 Running security scan..."

# Check for vulnerabilities in dependencies
if npm audit --audit-level=high; then
    print_success "No high-severity vulnerabilities found"
else
    print_warning "High-severity vulnerabilities found. Review and fix before deployment."
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled due to security vulnerabilities"
        exit 1
    fi
fi

# Step 7: Create Production Package
print_status "📦 Creating production package..."

# Create production directory
PROD_DIR="production-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$PROD_DIR"

# Copy necessary files
cp -r out/ "$PROD_DIR/"
cp -r src/ "$PROD_DIR/"
cp package.json "$PROD_DIR/"
cp package-lock.json "$PROD_DIR/"
cp README.md "$PROD_DIR/"
cp SECURITY.md "$PROD_DIR/"

# Create production .env template
cat > "$PROD_DIR/.env.example" << 'EOF'
# Production Environment Variables
# Copy this file to .env and fill in your production credentials

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_production_access_key_here
AWS_SECRET_ACCESS_KEY=your_production_secret_key_here

# SAM.gov Configuration
SAM_KEY=your_production_sam_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_production_openai_key_here

# OpenSearch Configuration
OPENSEARCH_ENDPOINT=your_production_opensearch_endpoint
OPENSEARCH_USERNAME=your_production_username
OPENSEARCH_PASSWORD=your_production_password

# Environment
NODE_ENV=production
EOF

print_success "Production package created: $PROD_DIR"

# Step 8: Deployment Instructions
print_status "📋 Generating deployment instructions..."

cat > "$PROD_DIR/DEPLOYMENT.md" << 'EOF'
# 🚀 Production Deployment Instructions

## Prerequisites
- All credentials rotated and updated
- Environment variables configured
- Security scan passed
- AWS permissions verified

## Deployment Steps

1. **Upload to Production Server**
   ```bash
   # Upload the production directory to your server
   scp -r production-*/ user@your-server:/path/to/extension/
   ```

2. **Set Environment Variables**
   ```bash
   # Copy the example file
   cp .env.example .env

   # Edit with production credentials
   nano .env
   ```

3. **Install Dependencies**
   ```bash
   npm ci --only=production
   ```

4. **Test the Extension**
   ```bash
   node test-dynamodb.js
   ```

5. **Deploy to VS Code Marketplace** (if applicable)
   ```bash
   vsce publish
   ```

## Post-Deployment Verification

- [ ] DynamoDB connection working
- [ ] Chat interface functional
- [ ] AI responses working
- [ ] No errors in logs
- [ ] Security monitoring active

## Rollback Plan

If issues occur:
1. Stop the extension
2. Restore from backup
3. Investigate the issue
4. Deploy fix

## Monitoring

- Monitor AWS CloudWatch logs
- Check VS Code extension logs
- Review security alerts
- Monitor API usage
EOF

print_success "Deployment instructions created"

# Step 9: Final Security Check
print_status "🔒 Final security verification..."

# Check that no .env file was created
if [ -f ".env" ]; then
    print_warning ".env file found - ensure it's not committed to version control"
fi

# Verify .gitignore includes .env
if grep -q "\.env" .gitignore; then
    print_success ".env is properly ignored"
else
    print_warning ".env not found in .gitignore"
fi

# Step 10: Summary
print_status "📊 Deployment Summary"

echo "✅ Security checks passed"
echo "✅ Environment variables validated"
echo "✅ AWS credentials verified"
echo "✅ DynamoDB connection tested"
echo "✅ Extension compiled successfully"
echo "✅ Production package created: $PROD_DIR"
echo "✅ Deployment instructions generated"

print_success "🎉 Production deployment package ready!"

echo ""
echo "📋 Next Steps:"
echo "1. Rotate all credentials as documented in SECURITY.md"
echo "2. Upload $PROD_DIR to your production server"
echo "3. Follow DEPLOYMENT.md instructions"
echo "4. Monitor the deployment for any issues"
echo ""
echo "🔒 Remember: All credentials must be rotated before production use!"
