import { ethers } from "ethers";
import { NetworkConfig } from "../network/network-manager";

export class VerifiedRpcProvider {
  private provider: ethers.JsonRpcProvider | null = null;

  async connectAndValidate(config: NetworkConfig): Promise<ethers.JsonRpcProvider> {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    // RPC 연결 후 즉시 eth_chainId 무결성 강제 검증
    const network = await provider.getNetwork();
    const remoteChainId = Number(network.chainId);

    if (remoteChainId !== config.chainId) {
      throw new Error(
        `Chain ID Mismatch Attack Detected! Expected: ${config.chainId}, Remote RPC returned: ${remoteChainId}`
      );
    }

    this.provider = provider;
    return provider;
  }

  getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) throw new Error("RPC Provider is not connected or verified.");
    return this.provider;
  }
}