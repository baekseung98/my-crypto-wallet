export interface NetworkConfig {
  chainId: number;
  chainHex: string;
  name: string;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
  isTestnet: boolean;
}

export const SEPOLIA_CONFIG: NetworkConfig = {
  chainId: 11155111,
  chainHex: "0xaa36a7",
  name: "Sepolia Testnet",
  rpcUrl: "https://rpc.sepolia.org",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "SEP",
    decimals: 18,
  },
  blockExplorer: "https://sepolia.etherscan.io",
  isTestnet: true,
};

export class NetworkManager {
  private currentNetwork: NetworkConfig = SEPOLIA_CONFIG;

  getActiveNetwork(): NetworkConfig {
    // Environment Guard: Mainnet 승인 전까지 Sepolia만 반환하도록 강제
    if (this.currentNetwork.chainId !== 11155111) {
      throw new Error("Security Guard: Mainnet is strictly blocked.");
    }
    return this.currentNetwork;
  }

  validateChainId(incomingChainId: number): boolean {
    return incomingChainId === this.currentNetwork.chainId;
  }
}