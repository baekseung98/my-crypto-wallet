import { SwapQuoteRequest, SwapQuoteResponse } from "./types";

export class SepoliaSwapEngine {
  private static readonly SEPOLIA_UNISWAP_ROUTER = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // Sepolia Uniswap V2 Router Mock

  // 실시간 예상 교환 비율(Quote) 및 Price Impact 계산 훅/엔진
  static async getSwapQuote(request: SwapQuoteRequest): Promise<SwapQuoteResponse> {
    const amountInNum = parseFloat(request.amountIn) || 0;
    
    // Sepolia 테스트넷 시뮬레이션 교환비율 (예: 1 ETH = 3000 MockUSDC)
    const exchangeRate = request.tokenInAddress === "0x0000000000000000000000000000000000000000" ? 3000.0 : 0.00033;
    const expectedOut = (amountInNum * exchangeRate).toFixed(6);
    
    // 슬리피지(Slippage Tolerance) 적용 최소 수령액 계산
    const slippageMultiplier = 1 - (request.slippageTolerancePercent / 100);
    const minimumOut = (parseFloat(expectedOut) * slippageMultiplier).toFixed(6);

    return {
      expectedAmountOut: expectedOut,
      minimumAmountOut: minimumOut,
      estimatedGasFeeEth: "0.0015",
      priceImpactPercent: amountInNum > 10 ? 0.85 : 0.05,
      routerAddress: this.SEPOLIA_UNISWAP_ROUTER,
    };
  }

  // 트랜잭션 유효 시간(Deadline, 기본 20분 후) 및 슬리피지가 반영된 Call Data 생성
  static generateSwapPayload(request: SwapQuoteRequest, minimumAmountOut: string) {
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    
    return {
      router: this.SEPOLIA_UNISWAP_ROUTER,
      path: [request.tokenInAddress, request.tokenOutAddress],
      amountIn: request.amountIn,
      amountOutMin: minimumAmountOut,
      deadline: deadlineTimestamp,
      network: "sepolia", // Strict Sepolia Binding
    };
  }
}