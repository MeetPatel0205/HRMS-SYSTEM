#!/bin/bash

# Script to generate self-signed SSL certificates for development
# For production, use proper certificates from a trusted CA

CERT_DIR="./certs"
DAYS_VALID=365

echo "Generating self-signed SSL certificates for development..."

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
openssl genrsa -out "$CERT_DIR/key.pem" 2048

# Generate certificate signing request
openssl req -new -key "$CERT_DIR/key.pem" -out "$CERT_DIR/csr.pem" \
  -subj "/C=US/ST=State/L=City/O=HRMS/OU=Development/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days $DAYS_VALID -in "$CERT_DIR/csr.pem" \
  -signkey "$CERT_DIR/key.pem" -out "$CERT_DIR/cert.pem"

# Clean up CSR
rm "$CERT_DIR/csr.pem"

echo "✓ SSL certificates generated successfully in $CERT_DIR/"
echo "  - Private key: $CERT_DIR/key.pem"
echo "  - Certificate: $CERT_DIR/cert.pem"
echo ""
echo "Note: These are self-signed certificates for development only."
echo "For production, obtain certificates from a trusted Certificate Authority."
