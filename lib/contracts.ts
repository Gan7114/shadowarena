export const IMPOSTERS_PHASES = [
  "LOBBY",
  "TASK",
  "SABOTAGE",
  "DISCUSSION",
  "VOTING",
  "ENDED",
] as const;

export const SHADOW_PHASES = [
  "Idle",
  "Registration",
  "CommitWaiting",
  "RevealWaiting",
  "WordDistribution",
  "Statement",
  "Voting",
  "Elimination",
  "GameOver",
] as const;

export const SHADOW_RESULTS = [
  "None",
  "CitizensWin",
  "SpyWins",
  "Timeout",
  "Cancelled",
] as const;

export const DEFAULT_CONFIG = {
  imposters: {
    rpcUrl: (import.meta.env.VITE_IMPOSTERS_RPC_URL as string) || "https://rpc.monad.xyz",
    gameAddress:
      (import.meta.env.VITE_IMPOSTERS_GAME_ADDRESS as string) ||
      "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    marketAddress:
      (import.meta.env.VITE_IMPOSTERS_MARKET_ADDRESS as string) ||
      "0x9fE46736679d2d9a65F0992F2272dE9f3c7fa6e0",
  },
  shadow: {
    rpcUrl: (import.meta.env.VITE_SHADOW_RPC_URL as string) || "https://rpc.monad.xyz",
    protocolAddress:
      (import.meta.env.VITE_SHADOW_PROTOCOL_ADDRESS as string) ||
      "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    marketAddress:
      (import.meta.env.VITE_SHADOW_MARKET_ADDRESS as string) ||
      "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  },
};

export const IMPOSTERS_GAME_ABI = [
  "function owner() view returns (address)",
  "function currentGameId() view returns (uint256)",
  "function currentPhase() view returns (uint8)",
  "function currentRound() view returns (uint256)",
  "function isSabotaged() view returns (bool)",
  "function sabotageEndBlock() view returns (uint256)",
  "function getCurrentPhase() view returns (uint8)",
  "function getRoundNumber() view returns (uint256)",
  "function getPlayerCount() view returns (uint256)",
  "function getPlayerAddress(uint256 index) view returns (address)",
  "function getAliveCount() view returns (uint256)",
  "function isPlayerAlive(address p) view returns (bool)",
  "function isPlayerAlive(address p) view returns (bool)",
  "function isImposter(address p) view returns (bool)",
  "function imposters(uint256) view returns (address)",
  "function players(address) view returns (address addr,bool isAlive,bool hasJoined,uint256 tasksCompleted,uint256 joinedAt,int256 x,int256 y,uint256 lastMoveBlock)",
  "function pendingWithdrawals(address) view returns (uint256)",
  "function joinGame() payable",
  "function startGame()",
  "function move(int256 x, int256 y)",
  "function performTask(uint8 roomId)",
  "function sabotage()",
  "function fixSabotage()",
  "function eliminate(address target)",
  "function callMeeting()",
  "function reportBody(address deadPlayer)",
  "function vote(address suspect)",
  "function advancePhase()",
  "function resetGame()",
  "function claimPending()",
] as const;

export const IMPOSTERS_MARKET_ABI = [
  "function currentMarketId() view returns (uint256)",
  "function lastResolvedMarketId() view returns (uint256)",
  "function getPrice(address target, bool outcome) view returns (uint256)",
  "function getPriceForMarket(uint256 marketId, address target, bool outcome) view returns (uint256)",
  "function getMarketState(uint256 marketId) view returns (address deprecatedWinningImposter,bool isResolved,uint256 totalWinningShares,uint256 totalPool,uint256 totalGlobalNoShares,uint256 betCount)",
  "function getBetCount() view returns (uint256)",
  "function getBetCountForMarket(uint256 marketId) view returns (uint256)",
  "function getAgentAccuracy(address agent) view returns (uint256)",
  "function getAgentAccuracyForMarket(uint256 marketId, address agent) view returns (uint256)",
  "function bet(address target, bool outcome) payable",
  "function claim()",
  "function claimForMarket(uint256 marketId)",
] as const;

export const SHADOW_PROTOCOL_ABI = [
  "function owner() view returns (address)",
  "function currentGameId() view returns (uint256)",
  "function currentPhase() view returns (uint8)",
  "function currentRound() view returns (uint256)",
  "function gameResult() view returns (uint8)",
  "function rewardPool() view returns (uint256)",
  "function config() view returns (uint256 stakeAmount,uint256 maxAgents,uint256 numSpies,address treasury)",
  "function commitData() view returns (bytes32 commitHash,bool committed,bool revealed,uint256 revealDeadline,uint256 revealedWordSetId,bytes32 revealedSalt,bytes32 spyMerkleRoot)",
  "function getAgentCount() view returns (uint256)",
  "function getAliveCount() view returns (uint256)",
  "function getAgentList() view returns (address[])",
  "function getAliveAgents() view returns (address[])",
  "function getVotesForAgent(uint256 _round, address _agent) view returns (uint256)",
  "function getStatement(address _agent, uint256 _round) view returns (bytes32 contentHash,uint8 specificityLevel,uint8 confidenceScore,bool submitted)",
  "function getGameTimeRemaining() view returns (uint256)",
  "function getPhaseTimeRemaining() view returns (uint256)",
  "function gameHistory(uint256 _gameId) view returns (uint8)",
  "function agents(address _agent) view returns (address addr,uint256 stake,bool isEliminated,bool isRegistered,uint256 pendingWithdrawal,bool hasVotedThisRound,address voteTarget,uint8 inactiveRounds)",
  "function createGame(uint256 _stakeAmount,uint256 _maxAgents,uint256 _numSpies,address _treasury,address _gamemaster,uint256 _gamemasterStakeAmount) payable",
  "function register() payable",
  "function commitRoleAssignment(bytes32 _commitHash)",
  "function revealRoleAssignment(uint256 _wordSetId,bytes32 _salt,bytes32 _spyMerkleRoot)",
  "function handleRevealTimeout()",
  "function confirmWordDistribution()",
  "function submitStatement(bytes32 _contentHash,uint8 _specificityLevel,uint8 _confidenceScore)",
  "function castVote(address _target)",
  "function processElimination()",
  "function confirmSpyElimination(address _eliminatedAgent,bytes32 _leafSalt,bytes32[] _proof)",
  "function declareResult(address[] _spyAddresses,bytes32[] _leafSalts,bytes32[][] _proofs)",
  "function withdraw()",
  "function advancePhase()",
] as const;

export const SHADOW_MARKET_ABI = [
  "function markets(uint256) view returns (uint256 citizenPool,uint256 spyPool,uint8 result,bool settled)",
  "function userBets(uint256,address,bool) view returns (uint256)",
  "function hasClaimed(uint256,address) view returns (bool)",
  "function placeBet(bool _betOnCitizens) payable",
  "function settleMarket(uint256 _gameId)",
  "function claimPayout(uint256 _gameId)",
] as const;
