# Soroban Smart Contracts Integration

## Overview

Guide for integrating Soroban smart contracts into SocialFlow for decentralized content monetization, tipping, and reward distribution.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Setup](#setup)
3. [Contract Deployment](#contract-deployment)
4. [Contract Invocation](#contract-invocation)
5. [Common Use Cases](#common-use-cases)
6. [Best Practices](#best-practices)

---

## Introduction

Soroban is Stellar's smart contract platform that enables complex programmable logic on the Stellar network. SocialFlow uses Soroban for:

- Content creator tipping contracts
- Automated reward distribution
- Subscription management
- Content monetization

---

## Setup

### Install Dependencies

```bash
npm install @stellar/stellar-sdk soroban-client
```

### Initialize Soroban Client

```typescript
import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, SorobanRpc } from 'soroban-client';

/**
 * Creates a Soroban RPC server instance
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {SorobanRpc.Server} Configured RPC server
 */
export function createSorobanServer(network: 'testnet' | 'mainnet' = 'testnet'): SorobanRpc.Server {
  const rpcUrl = network === 'testnet'
    ? 'https://soroban-testnet.stellar.org'
    : 'https://soroban-mainnet.stellar.org';
  
  return new SorobanRpc.Server(rpcUrl);
}
```

---

## Contract Deployment

### Deploy Tipping Contract

```typescript
/**
 * Deploys a tipping smart contract
 * @param {string} wasmHash - Hash of uploaded WASM code
 * @param {string} deployerKey - Deployer account public key
 * @returns {Promise<string>} Contract address
 */
export async function deployTippingContract(
  wasmHash: string,
  deployerKey: string
): Promise<string> {
  const server = createSorobanServer('testnet');
  const account = await server.getAccount(deployerKey);
  
  const contract = new Contract(wasmHash);
  
  // Build deployment transaction
  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: StellarSdk.Networks.TESTNET
  })
    .addOperation(contract.call('initialize'))
    .setTimeout(180)
    .build();
  
  // Sign and submit (requires wallet integration)
  const signedXdr = await signWithWallet(transaction.toXDR());
  const result = await server.sendTransaction(signedXdr);
  
  return result.contractId;
}
```

---

## Contract Invocation

### Send Tip via Contract

```typescript
/**
 * Sends a tip to a creator through smart contract
 * @param {string} contractId - Tipping contract address
 * @param {string} creatorId - Creator's account address
 * @param {string} amount - Tip amount in XLM
 * @param {string} senderKey - Sender's public key
 * @returns {Promise<string>} Transaction hash
 */
export async function sendTipViaContract(
  contractId: string,
  creatorId: string,
  amount: string,
  senderKey: string
): Promise<string> {
  const server = createSorobanServer('testnet');
  const contract = new Contract(contractId);
  
  // Prepare contract invocation
  const transaction = await contract.call(
    'send_tip',
    StellarSdk.xdr.ScVal.scvAddress(creatorId),
    StellarSdk.xdr.ScVal.scvU128(BigInt(amount))
  );
  
  // Sign and submit
  const signedXdr = await signWithWallet(transaction.toXDR());
  const result = await server.sendTransaction(signedXdr);
  
  return result.hash;
}
```

### Query Contract State

```typescript
/**
 * Retrieves total tips received by a creator
 * @param {string} contractId - Contract address
 * @param {string} creatorId - Creator's account address
 * @returns {Promise<string>} Total tips amount
 */
export async function getCreatorTips(
  contractId: string,
  creatorId: string
): Promise<string> {
  const server = createSorobanServer('testnet');
  const contract = new Contract(contractId);
  
  const result = await contract.call(
    'get_tips',
    StellarSdk.xdr.ScVal.scvAddress(creatorId)
  );
  
  return result.toString();
}
```

---

## Common Use Cases

### 1. Creator Subscription Contract

```typescript
/**
 * Subscribes to a creator's content
 * @param {string} contractId - Subscription contract address
 * @param {string} creatorId - Creator to subscribe to
 * @param {number} months - Subscription duration
 * @returns {Promise<string>} Subscription ID
 */
export async function subscribeToCreator(
  contractId: string,
  creatorId: string,
  months: number
): Promise<string> {
  const server = createSorobanServer('testnet');
  const contract = new Contract(contractId);
  
  const transaction = await contract.call(
    'subscribe',
    StellarSdk.xdr.ScVal.scvAddress(creatorId),
    StellarSdk.xdr.ScVal.scvU32(months)
  );
  
  const signedXdr = await signWithWallet(transaction.toXDR());
  const result = await server.sendTransaction(signedXdr);
  
  return result.subscriptionId;
}
```

### 2. Reward Distribution

```typescript
/**
 * Distributes rewards to multiple creators
 * @param {string} contractId - Reward contract address
 * @param {Array<{address: string, amount: string}>} recipients - Reward recipients
 * @returns {Promise<string>} Transaction hash
 */
export async function distributeRewards(
  contractId: string,
  recipients: Array<{address: string, amount: string}>
): Promise<string> {
  const server = createSorobanServer('testnet');
  const contract = new Contract(contractId);
  
  const recipientsScVal = recipients.map(r => 
    StellarSdk.xdr.ScVal.scvMap([
      StellarSdk.xdr.ScVal.scvAddress(r.address),
      StellarSdk.xdr.ScVal.scvU128(BigInt(r.amount))
    ])
  );
  
  const transaction = await contract.call(
    'distribute_rewards',
    StellarSdk.xdr.ScVal.scvVec(recipientsScVal)
  );
  
  const signedXdr = await signWithWallet(transaction.toXDR());
  const result = await server.sendTransaction(signedXdr);
  
  return result.hash;
}
```

---

## Best Practices

### 1. Error Handling

```typescript
try {
  const result = await sendTipViaContract(contractId, creator, amount, sender);
  console.log('Tip sent:', result);
} catch (error) {
  if (error.message.includes('insufficient balance')) {
    showError('Insufficient balance for tip');
  } else if (error.message.includes('contract not found')) {
    showError('Tipping contract unavailable');
  } else {
    showError('Failed to send tip');
  }
}
```

### 2. Gas Estimation

```typescript
/**
 * Estimates gas cost for contract invocation
 */
async function estimateContractGas(transaction: StellarSdk.Transaction): Promise<string> {
  const server = createSorobanServer('testnet');
  const simulation = await server.simulateTransaction(transaction);
  return simulation.minResourceFee;
}
```

### 3. Contract Verification

```typescript
/**
 * Verifies contract is deployed and accessible
 */
async function verifyContract(contractId: string): Promise<boolean> {
  try {
    const server = createSorobanServer('testnet');
    const contract = await server.getContractData(contractId);
    return contract !== null;
  } catch {
    return false;
  }
}
```

---

## Additional Resources

- [Soroban Documentation](https://soroban.stellar.org/docs)
- [Soroban Examples](https://github.com/stellar/soroban-examples)
- [Smart Contract Best Practices](https://soroban.stellar.org/docs/learn/best-practices)

---

**Last Updated:** February 25, 2026  
**Maintained By:** SocialFlow Labs
