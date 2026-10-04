export interface SwapQuoteRequest {
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: string;
  slippageTolerancePercent: number; // e.g. 0.5%
}

export interface SwapQuoteResponse {
  expectedAmountOut: string;
  minimumAmountOut: string;
  estimatedGasFeeEth: string;
  priceImpactPercent: number;
  routerAddress: string;
}

export interface SepoliaSwapPipelineConfig {
  network: "sepolia"; // Strict Sepolia DEX Router Binding
  uniswapRouterAddress: string; // Sepolia Uniswap V2/V3 Router
  getQuote(request: SwapQuoteRequest): Promise<SwapQuoteResponse>;
  executeSwap(request: SwapQuoteRequest): Promise<{ txHash: string; success: boolean }>;
}