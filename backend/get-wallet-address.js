const { ethers } = require('ethers');
require('dotenv').config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
    console.error('PRIVATE_KEY not found in .env file');
    process.exit(1);
}

try {
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    console.log('Backend Wallet Address:', wallet.address);
    console.log('');
    console.log('Add this to contracts/.env as:');
    console.log('BACKEND_VALIDATOR_ADDRESS=' + wallet.address);
} catch (error) {
    console.error('Error deriving wallet address:', error.message);
    process.exit(1);
}

