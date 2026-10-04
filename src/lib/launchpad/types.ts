export interface LaunchpadProject {
  projectId: string;
  projectName: string;
  tokenSymbol: string;
  tokenContractAddress: string;
  totalRaiseGoalSepEth: string;
  currentRaisedSepEth: string;
  startTime: number;
  endTime: number;
  isClaimActive: boolean;
}

export interface LaunchpadCommitRequest {
  projectId: string;
  contributorAddress: string;
  amountSepEth: string;
}

export interface LaunchpadLaunchpadConfig {
  network: "sepolia";
  launchpadContractAddress: string; // Sepolia Launchpad Router Mock
  fetchActiveProjects(): Promise<LaunchpadProject[]>;
  commitFunds(request: LaunchpadCommitRequest): Promise<{ success: boolean; txHash?: string }>;
  claimTokens(projectId: string, userAddress: string): Promise<{ success: boolean; txHash?: string }>;
}