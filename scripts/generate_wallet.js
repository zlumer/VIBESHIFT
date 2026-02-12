const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

const keypair = Keypair.generate();
const secretKey = JSON.stringify(Array.from(keypair.secretKey));
const publicKey = keypair.publicKey.toString();

console.log('Public Key:', publicKey);

const envContent = `TREASURY_PRIVATE_KEY=${secretKey}\n`;

fs.appendFileSync('.env.local', envContent);
console.log('Wallet generated and saved to .env.local');
