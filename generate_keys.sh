# Generate private/public key pair
PRIVATE_KEY=./config/pems/private.key
PUBLIC_KEY=./config/pems/public.key

if test -f "$PRIVATE_KEY" && test -f "$PUBLIC_KEY"; then
  echo "Found private and public key"
else
  echo "Generating private and public key"
  mkdir -p ./config/pems/
  openssl genrsa -out $PRIVATE_KEY 2048
  openssl rsa -in $PRIVATE_KEY -pubout -out $PUBLIC_KEY
fi