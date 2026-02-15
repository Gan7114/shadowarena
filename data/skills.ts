export const IMPOSTER_SKILL_MD = `# IMPOSTERS - Agent Skill File

Detailed skill file for autonomous agents and operators in \`among-us-5\`.

This document is written from the current repository implementation:
- Game contract: \`ImpostersGame\`
- Market contract: \`PredictionMarketV4\`
- Spatial checks: \`SpatialValidator\`
- Agent runtime: \`src/agents/*\`

## 1. System Overview

Imposters is an on-chain social deduction game with spatial movement and a per-player prediction market.

Primary components:
- Core game: \`/Users/nexus/Documents/monadgames/among-us-5/contracts/core/ImpostersGame.sol\`
- Market: \`/Users/nexus/Documents/monadgames/among-us-5/contracts/market/PredictionMarketV4.sol\`
- Spatial validation: \`/Users/nexus/Documents/monadgames/among-us-5/contracts/core/SpatialValidator.sol\`
- Agent runner: \`/Users/nexus/Documents/monadgames/among-us-5/src/agents/agentRunner.ts\`

## 2. Network and Contracts

Configured in:
- \`/Users/nexus/Documents/monadgames/among-us-5/src/config.ts\`
- \`/Users/nexus/Documents/monadgames/among-us-5/hardhat.config.ts\`

Defaults:
- Local chain id: \`31337\`
- RPC: \`MONAD_RPC\` env (fallback testnet URL in config)
- \`GAME_CONTRACT\` env -> \`ImpostersGame\`
- \`PREDICTION_MARKET\` env -> \`PredictionMarketV4\`

Deployment command:
\`\`\`bash
cd /Users/nexus/Documents/monadgames/among-us-5
npm run compile
npx hardhat run scripts/deploy.ts --network hardhat
\`\`\`

## 3. Game Constants (On-chain)

From \`ImpostersGame.sol\`:
- \`ENTRY_FEE = 1 ether\` (exactly 1 MON)
- \`MIN_PLAYERS = 3\`
- \`MAX_PLAYERS = 10\`
- \`TASKS_PER_PLAYER = 3\`
- \`KILL_COOLDOWN = 10 blocks\`
- \`MEETING_COOLDOWN = 15 blocks\`
- \`SABOTAGE_DURATION = 10 blocks\`
- \`PHASE_DURATION = 50 blocks\`

## 4. Phase Machine

Phases (\`IImposters.Phase\`):
1. \`LOBBY\`
2. \`TASK\`
3. \`SABOTAGE\`
4. \`DISCUSSION\`
5. \`VOTING\`
6. \`ENDED\`

Typical flow:
1. Players call \`joinGame()\` with 1 MON.
2. Owner calls \`startGame()\`.
3. Task / sabotage / meeting / body-report actions occur.
4. Discussion transitions to voting.
5. \`vote(address)\` then tally.
6. Game ends on task completion, imposter elimination, or low alive count.

## 5. Transaction Map by Role

### 5.1 Agent Player (in-game)

Core game transactions:
- \`joinGame()\` payable, exactly 1 MON
- \`move(int256 x, int256 y)\`
- \`performTask(uint8 roomId)\` (non-imposter only)
- \`sabotage()\` (imposter only)
- \`fixSabotage()\`
- \`eliminate(address target)\` (imposter only)
- \`callMeeting()\`
- \`reportBody(address deadPlayer)\`
- \`vote(address suspect)\` where \`address(0)\` is skip vote
- \`claimPending()\` for fallback payout transfers

### 5.2 Owner / Operator

Operator transactions:
- \`setMarket(address)\`
- \`startGame()\`
- \`advancePhase()\` (after phase duration)
- \`resetGame()\` (after \`ENDED\`)

### 5.3 Human Predictor (market only)

Prediction transactions:
- \`bet(address target, bool outcome)\` payable
- \`claim()\`
- \`claimForMarket(uint256 marketId)\`

## 6. Prediction Market Mechanics

From \`PredictionMarketV4.sol\`:
- Betting only while game phase is between \`LOBBY\` and \`ENDED\`.
- Self-bet is blocked: \`target != msg.sender\`.
- Pricing is per target using YES/NO shares:
  - YES price = \`yes / (yes + no)\`
  - NO price = \`no / (yes + no)\`
- Resolution is called by game contract: \`resolve(imposterAddress)\`.
- Claims are proportional to winning shares.

Useful reads:
- \`getPrice(target, outcome)\`
- \`getMarketState(marketId)\`
- \`getBetCountForMarket(marketId)\`
- \`getAgentAccuracy(agent)\`

## 7. Spatial Model

From \`SpatialValidator.sol\`:
- Map bounds: \`0..100\` on x/y
- Room IDs: \`0..7\`
- Move validity enforced by block delta and \`MAX_VELOCITY = 10\`
- Room checks via \`isPlayerInRoom(x, y, roomId)\`
- Proximity checks via \`canObserve(...)\`

Room centers are defined on-chain:
- \`0 Meeting (50,50)\`
- \`1 Reactor (10,50)\`
- \`2 Electrical (30,20)\`
- \`3 Navigation (90,50)\`
- \`4 Medbay (30,80)\`
- \`5 Security (15,65)\`
- \`6 O2 (70,20)\`
- \`7 Weapons (75,80)\`

## 8. Agent Runtime (Current Implementation)

Entrypoint:
- \`/Users/nexus/Documents/monadgames/among-us-5/src/agents/agentRunner.ts\`

Runner behavior:
- Uses unlocked RPC wallet signers from local node.
- Creates agents by index:
  - index 0 -> \`ImposterV4\`
  - index 1..3 -> \`HonestV4\`
  - remaining -> \`SpectatorV4\`
- Tries to \`joinGame()\` all agent wallets with 1 MON each.
- Starts game from first unlocked signer if in lobby.
- Starts each agent loop.

Current practical note:
- Some gameplay actions in \`HonestV4\` and \`ImposterV4\` are still local-sim logic (logs/perception) rather than complete on-chain action wiring.
- Market betting logic is wired through \`PredictionBettor\`.

## 9. Runtime Skill Config (JSON)

Skill file used by agent code:
- \`/Users/nexus/Documents/monadgames/among-us-5/src/agents/skills/imposters-agent-skill.json\`

Loader:
- \`/Users/nexus/Documents/monadgames/among-us-5/src/agents/agentSkillConfig.ts\`

Override path with env:
- \`IMPOSTERS_AGENT_SKILL_FILE\`

### Fields

\`default\`:
- \`moveStepDeltaSeconds\` (0.01..1)
- \`loopTickMs\` (10..5000)

\`honest\`:
- \`voteConfidenceThreshold\` (0..1)
- \`preferredTaskRooms\` (room ids 1..7)
- \`enablePredictionBetting\` (bool)

\`imposter\`:
- \`enableDeceptionBetting\` (bool)
- \`sabotageTarget.name\`
- \`sabotageTarget.x\`
- \`sabotageTarget.y\`

\`spectator\`:
- \`analysisDelayMs\`
- \`momentumThreshold\` (0..1)
- \`reversionThreshold\` (0..1)
- \`reversionChance\` (0..1)
- \`enablePredictionBetting\` (bool)

## 10. Quick Start (Local)

### 10.1 Start local chain
\`\`\`bash
cd /Users/nexus/Documents/monadgames/among-us-5
npx hardhat node
\`\`\`

### 10.2 Deploy contracts
\`\`\`bash
cd /Users/nexus/Documents/monadgames/among-us-5
npm run compile
npx hardhat run scripts/deploy.ts --network hardhat
\`\`\`

### 10.3 Run agent simulation
\`\`\`bash
cd /Users/nexus/Documents/monadgames/among-us-5
export MONAD_RPC=http://127.0.0.1:8545
export GAME_CONTRACT=<deployed_imposters_game_address>
export PREDICTION_MARKET=<deployed_prediction_market_address>
export AGENT_WALLET_COUNT=5
npm run simulate
\`\`\`

No-key behavior:
- Runner always uses unlocked RPC accounts from local node.

## 11. On-chain Read Checklist

Use these reads for monitoring and dashboards:
- Game:
  - \`getCurrentPhase()\`
  - \`getRoundNumber()\`
  - \`getPlayerCount()\`
  - \`getAliveCount()\`
  - \`players(address)\`
  - \`isSabotaged()\`
  - \`sabotageEndBlock()\`
- Market:
  - \`currentMarketId()\`
  - \`lastResolvedMarketId()\`
  - \`getPrice(target, true|false)\`
  - \`getMarketState(marketId)\`
  - \`getBetCountForMarket(marketId)\`

## 12. Common Failure Cases

- \`Must deposit exactly 1 MON\`:
  - \`joinGame\` value must be exactly \`1 ether\`.
- \`Wrong phase\`:
  - Action executed outside its phase window.
- \`Cannot bet on yourself\`:
  - Market self-bet protection.
- \`Invalid move: too fast or blocked\`:
  - Position delta exceeds validator constraints for block delta.

## 13. Human vs Agent Responsibilities

Recommended usage pattern for your current product:
- Agents: play game logic (join, move/task/sabotage/vote loops).
- Humans: prediction market only (bet/claim).
- Dashboard: live feed + market panel; no human game-action buttons.
- No private-key prompts required in local automation when using unlocked RPC accounts.
`;

export const SHADOW_SKILL_MD = `# SHADOW PROTOCOL - Agent Skill File

Detailed skill file for autonomous agents, gamemaster automation, and human prediction users in \`shadow-protocol\`.

This document is based on current repository implementation:
- Core protocol: \`SpyProtocol\`
- Prediction market: \`ShadowPredictionMarket\`
- Agent runtime: \`AgentEngine\`
- Orchestration: \`GameMaster\`, \`GameLoop\`

## 1. System Overview

Shadow Protocol is a timed, phase-gated, adversarial game with commit-reveal role assignment and Merkle proof confirmation for spy eliminations.

Primary components:
- \`/Users/nexus/Documents/monadgames/shadow-protocol/contracts/SpyProtocol.sol\`
- \`/Users/nexus/Documents/monadgames/shadow-protocol/contracts/ShadowPredictionMarket.sol\`
- \`/Users/nexus/Documents/monadgames/shadow-protocol/src/agents/AgentEngine.ts\`
- \`/Users/nexus/Documents/monadgames/shadow-protocol/src/game/GameMaster.ts\`
- \`/Users/nexus/Documents/monadgames/shadow-protocol/src/game/GameLoop.ts\`

## 2. Network and Contracts

Configured in:
- \`/Users/nexus/Documents/monadgames/shadow-protocol/hardhat.config.ts\`

Defaults:
- Mainnet chain id: \`143\`
- Mainnet RPC: \`https://rpc.monad.xyz\`
- Local hardhat chain id: \`31337\`

Deploy command:
\`\`\`bash
cd /Users/nexus/Documents/monadgames/shadow-protocol
npm run compile
npx hardhat run scripts/deploy.ts --network hardhat
\`\`\`

## 3. Core Timers and Limits

From \`SpyProtocol.sol\`:
- \`MAX_ROUNDS = 3\`
- \`REGISTRATION_DURATION = 2 minutes\`
- \`STATEMENT_DURATION = 1 minute\`
- \`VOTING_DURATION = 1 minute\`
- \`HARD_TIME_CAP = 10 minutes\`
- \`REVEAL_DEADLINE_BUFFER = 3 minutes\`
- \`BURN_RATE_BPS = 2000\` (20%)
- \`SPECIFICITY_PENALTY_BPS = 500\` (5%)
- \`MIN_AGENTS = 4\`
- \`ABSOLUTE_MAX_AGENTS = 100\`

## 4. Phase Machine

\`GamePhase\` values:
1. \`Idle\`
2. \`Registration\`
3. \`CommitWaiting\`
4. \`RevealWaiting\`
5. \`WordDistribution\`
6. \`Statement\`
7. \`Voting\`
8. \`Elimination\`
9. \`GameOver\`

Auto-advance behavior is enforced by \`_tryAutoAdvancePhase()\` and can be nudged by calling \`advancePhase()\`.

## 5. Transaction Map by Role

### 5.1 Gamemaster / Operator

Primary tx flow:
1. \`createGame(...)\`
2. \`commitRoleAssignment(commitHash)\`
3. \`revealRoleAssignment(wordSetId, salt, spyMerkleRoot)\`
4. \`confirmWordDistribution()\`
5. Per round: \`processElimination()\`
6. If eliminated player was a spy: \`confirmSpyElimination(...)\`
7. End: \`declareResult(spyAddresses, leafSalts, proofs)\`
8. Cleanup: \`cleanupGame()\`

Emergency/admin:
- \`pause()\` / \`unpause()\`
- \`emergencyReset()\` (paused only)

### 5.2 Agent Player

Agent tx flow:
- Registration: \`register()\` with exact \`stakeAmount\`
- Statement phase: \`submitStatement(contentHash, specificity, confidence)\`
- Voting phase: \`castVote(target)\`
- Endgame: \`withdraw()\`

### 5.3 Human Predictor

Market tx flow:
- During registration only: \`placeBet(bool betOnCitizens)\`
- After game: \`settleMarket(gameId)\`
- Claim: \`claimPayout(gameId)\`

Market restriction:
- Registered game agents cannot place prediction bets.

## 6. Commit-Reveal and Spy Proofs

Role privacy model:
- No public on-chain \`isSpy\` mapping.
- Gamemaster commits to hash of \`(wordSetId, salt, spyMerkleRoot)\`.
- Gamemaster later reveals these values.
- Eliminated spies are confirmed with Merkle proofs via \`confirmSpyElimination\`.

At final declaration, gamemaster must provide all spy addresses plus proof material to \`declareResult\`.

## 7. Win Conditions

Key end conditions in protocol:
- Citizens win when confirmed eliminated spies >= configured spy count.
- Spies win when alive count is too low or after rounds/certain terminal states.
- Timeout when hard cap is exceeded.
- Cancelled when commit/reveal lifecycle fails.

\`GameResult\` enum:
- \`None\`
- \`CitizensWin\`
- \`SpyWins\`
- \`Timeout\`
- \`Cancelled\`

## 8. Reward and Slashing Model

- Eliminated/inactive stakes are split:
  - Burn accumulator (\`pendingBurnAmount\`, 20%)
  - Reward pool (80%)
- Specificity below round requirement can trigger a 5% penalty.
- Final payouts are assigned to \`pendingWithdrawal\` and claimed by \`withdraw()\`.
- Burn amount is transferred to treasury at finalization.

## 9. Prediction Market Mechanics (ShadowPredictionMarket)

For each game id:
- Pools: \`citizenPool\`, \`spyPool\`
- Result mapping:
  - \`1\` Citizens
  - \`2\` Spies
  - \`3\` Timeout/Cancelled (refund)

Payout:
- If Citizens win: winners share \`(userCitizenBet / citizenPool) * totalPool\`
- If Spies win: winners share \`(userSpyBet / spyPool) * totalPool\`
- Timeout/Cancelled: refund both sides

## 10. Agent Runtime and Scripts

### 10.1 One-command local full simulation
\`\`\`bash
cd /Users/nexus/Documents/monadgames/shadow-protocol
npm run compile
npx hardhat run scripts/runGame.ts
\`\`\`

Script knobs:
- \`PLAYER_COUNT\` (>=4)
- \`NUM_SPIES\` (script currently supports demo with \`1\`)

### 10.2 Autonomous gamemaster loop
\`\`\`bash
cd /Users/nexus/Documents/monadgames/shadow-protocol
export CONTRACT_ADDRESS=0x...
export MONAD_RPC_URL=http://127.0.0.1:8545
export STAKE_AMOUNT=1000000000000000000
export MAX_AGENTS=12
export NUM_SPIES=2
export TREASURY=0x...
export GM_SIGNER_INDEX=0
npx hardhat run scripts/run_gamemaster.ts --network hardhat
\`\`\`

### 10.3 Autonomous single agent loop
\`\`\`bash
cd /Users/nexus/Documents/monadgames/shadow-protocol
export CONTRACT_ADDRESS=0x...
export MARKET_CONTRACT_ADDRESS=0x...
export MONAD_RPC_URL=http://127.0.0.1:8545
export AGENT_ROLE=citizen
export AGENT_WORD=Ocean
export STAKE_AMOUNT=1000000000000000000
export AGENT_SIGNER_INDEX=1
npx hardhat run scripts/run_agent.ts --network hardhat
\`\`\`

No-key behavior:
- \`run_gamemaster.ts\` uses local unlocked signer by \`GM_SIGNER_INDEX\`.
- \`run_agent.ts\` uses local unlocked signer by \`AGENT_SIGNER_INDEX\`.

## 11. Runtime Skill Config (JSON)

Skill file used by agent code:
- \`/Users/nexus/Documents/monadgames/shadow-protocol/src/agents/skills/shadow-agent-skill.json\`

Loader:
- \`/Users/nexus/Documents/monadgames/shadow-protocol/src/agents/agentSkillConfig.ts\`

Override path with env:
- \`SHADOW_AGENT_SKILL_FILE\`

### Fields

\`default\`:
- \`pollIntervalMs\` (agent loop poll interval)

\`citizen\`:
- \`baseRiskTolerance\`
- \`baseAggressiveness\`
- \`betRiskFloor\`
- \`betConfidenceThreshold\`
- \`aggressivenessByRound.round1..round5\`

\`spy\`:
- \`baseRiskTolerance\`
- \`baseAggressiveness\`
- \`betAggressivenessFloor\`
- \`detectionRiskBluffThreshold\`
- \`lateGameRiskTolerance\`
- \`lateGameAggressiveness\`
- \`endGameRiskTolerance\`
- \`endGameAggressiveness\`

## 12. Dashboard and Read APIs (On-chain)

Useful reads for live views:
- Protocol:
  - \`currentGameId()\`
  - \`currentPhase()\`
  - \`currentRound()\`
  - \`gameResult()\`
  - \`getAgentList()\`
  - \`getAliveCount()\`
  - \`getStatement(agent, round)\`
  - \`getVotesForAgent(round, agent)\`
  - \`getGameTimeRemaining()\`
  - \`getPhaseTimeRemaining()\`
- Market:
  - \`markets(gameId)\`
  - \`userBets(gameId, user, side)\`
  - \`hasClaimed(gameId, user)\`

## 13. Common Failure Cases

- \`SP: exactly stakeAmount required\`:
  - \`register\` value mismatch.
- \`SPM: betting closed\`:
  - market betting outside Registration phase.
- \`SPM: agents cannot bet\`:
  - in-game players are blocked from market side.
- \`SP: hash mismatch\`:
  - reveal data does not match committed hash.
- \`SP: invalid spy proof\`:
  - wrong leaf salt/proof/root combination.

## 14. Human vs Agent Responsibilities

Recommended production mode for your dashboard:
- Agents execute gameplay logic: register, statements, votes, elimination progression.
- Humans use only prediction market: place bet, claim payout.
- Live UI should expose feed + market, not player action buttons.
- For human play, use wallet connect UI (no manual key entry).
`;
