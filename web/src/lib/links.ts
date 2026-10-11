// Client-safe constants (no viem import) for links shown in the UI.
export const EXPLORER_BASE = 'https://explore.testnet.tempo.xyz'
export const explorerTx = (hash: string) => `${EXPLORER_BASE}/tx/${hash}`
export const explorerAddress = (address: string) => `${EXPLORER_BASE}/address/${address}`
export const NETWORK_NAME = 'Tempo Moderato (testnet)'

/** The block explorer of the network a transaction went out on: Tempo testnet or Solana devnet. */
export const explorerTxOn = (network: 'tempo' | 'solana', hash: string) =>
  network === 'solana' ? `https://explorer.solana.com/tx/${hash}?cluster=devnet` : explorerTx(hash)
export const networkName = (network: 'tempo' | 'solana') => (network === 'solana' ? 'Solana devnet' : NETWORK_NAME)
