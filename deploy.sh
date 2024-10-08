#!/bin/bash

# Check if .env file exists, create it if it doesn't
if [ ! -f .env ]; then
    echo "Creating .env file..."
    touch .env
fi

# Load environment variables
set -a
source .env
set +a

# Check if MATIC_RPC_URL is set
if [ -z "$MATIC_RPC_URL" ]; then
    echo "Error: MATIC_RPC_URL is not set in .env file"
    exit 1
fi

# Deploy the contract
echo "Deploying contract to Polygon Amoy testnet..."
DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol:DeploySupplyChainManagement --rpc-url "$MATIC_RPC_URL" --private-key "$MATIC_PRIVATE_KEY" --broadcast)

# Extract the deployed contract address
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Contract Address: \K[0-9a-fA-F]{40}')

# If the above doesn't work, try this alternative method
if [ -z "$CONTRACT_ADDRESS" ]; then
    CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)
fi

# Check if CONTRACT_ADDRESS is empty
if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "Error: Failed to extract contract address"
    echo "Deploy output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

# Update the .env file with the new contract address
echo "Updating .env file..."
sed -i.bak "s/REACT_APP_CONTRACT_ADDRESS=.*/REACT_APP_CONTRACT_ADDRESS=$CONTRACT_ADDRESS/" .env

# Copy the ABI file to src/
echo "Copying ABI file to src/"
mkdir -p src/abi
cp out/SupplyChainManagement.sol/SupplyChainManagement.json src/abi/

echo "Contract deployed and .env updated with address: $CONTRACT_ADDRESS"
echo "ABI file copied to src/abi/SupplyChainManagement.json"