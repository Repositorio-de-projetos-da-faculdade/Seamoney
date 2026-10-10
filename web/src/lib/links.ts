// Client-safe constants (no viem import) for links shown in the UI.
export const EXPLORER_BASE = 'https://explore.testnet.tempo.xyz'
export const explorerTx = (hash: string) => `${EXPLORER_BASE}/tx/${hash}`
export const explorerAddress = (address: string) => `${EXPLORER_BASE}/address/${address}`
export const NETWORK_NAME = 'Tempo Moderato (testnet)'
