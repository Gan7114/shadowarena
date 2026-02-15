import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, RefreshCw, Wallet } from "lucide-react";
import { Contract } from "ethers";
import {
  connectWallet,
  createReadContract,
  formatMon,
  getWalletContracts,
  parseMon,
  shortAddress,
  ZERO_ADDRESS,
} from "../lib/onchain";
import {
  DEFAULT_CONFIG,
  SHADOW_MARKET_ABI,
  SHADOW_PHASES,
  SHADOW_PROTOCOL_ABI,
  SHADOW_RESULTS,
} from "../lib/contracts";
import { loadShadowConfig } from "../lib/runtimeConfig";

import { ShadowVisualizer } from "./ShadowVisualizer";

type AgentRow = {
  address: string;
  isEliminated: boolean;
  hasVotedThisRound: boolean;
  voteTarget: string;
  votesReceived: number;
  statementSubmitted: boolean;
  statementSpecificity: number;
  statementConfidence: number;
};

type ShadowSnapshot = {
  owner: string;
  currentGameId: number;
  phase: number;
  round: number;
  result: number;
  rewardPool: string;
  gameTimeRemaining: number;
  phaseTimeRemaining: number;
  agentCount: number;
  aliveCount: number;
  agents: AgentRow[];
  marketGameId: number;
  market: {
    citizenPool: string;
    spyPool: string;
    result: number;
    settled: boolean;
  } | null;
  myMarket: {
    citizenBet: string;
    spyBet: string;
    hasClaimed: boolean;
  } | null;
};

const JUDGE_MARKET_ADDRESS = "0x5700d5f755954c65e85fd2b2ffd456d0328e979d";

function phaseName(phase: number): string {
  return SHADOW_PHASES[phase] ?? `UNKNOWN(${phase})`;
}

function resultName(result: number): string {
  return SHADOW_RESULTS[result] ?? `UNKNOWN(${result})`;
}

function formatClock(seconds: number): string {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const mm = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const ss = String(safeSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function toNum(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const InferenceArena: React.FC = () => {
  const initialConfig = useMemo(
    () =>
      loadShadowConfig({
        ...DEFAULT_CONFIG.shadow,
        marketAddress: JUDGE_MARKET_ADDRESS,
      }),
    []
  );
  const [rpcUrl] = useState(initialConfig.rpcUrl);
  const [protocolAddress] = useState(initialConfig.protocolAddress);
  const [marketAddress] = useState(initialConfig.marketAddress);
  const [account, setAccount] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [txBusy, setTxBusy] = useState(false);
  const [error, setError] = useState("");
  const [marketBetSide, setMarketBetSide] = useState<"citizens" | "spies">("citizens");
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [snapshot, setSnapshot] = useState<ShadowSnapshot>({
    owner: ZERO_ADDRESS,
    currentGameId: 0,
    phase: 0,
    round: 0,
    result: 0,
    rewardPool: "0.0000",
    gameTimeRemaining: 0,
    phaseTimeRemaining: 0,
    agentCount: 0,
    aliveCount: 0,
    agents: [],
    marketGameId: 1,
    market: null,
    myMarket: null,
  });

  const protocolReader = useMemo(
    () => createReadContract(protocolAddress, SHADOW_PROTOCOL_ABI, rpcUrl),
    [protocolAddress, rpcUrl]
  );
  const marketReader = useMemo(
    () => createReadContract(marketAddress, SHADOW_MARKET_ABI, rpcUrl),
    [marketAddress, rpcUrl]
  );

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        owner,
        currentGameIdRaw,
        currentPhaseRaw,
        currentRoundRaw,
        gameResultRaw,
        rewardPoolRaw,
        gameTimeRemainingRaw,
        phaseTimeRemainingRaw,
        agentCountRaw,
        aliveCountRaw,
        agentList,
      ] = await Promise.all([
        protocolReader.owner(),
        protocolReader.currentGameId(),
        protocolReader.currentPhase(),
        protocolReader.currentRound(),
        protocolReader.gameResult(),
        protocolReader.rewardPool(),
        protocolReader.getGameTimeRemaining(),
        protocolReader.getPhaseTimeRemaining(),
        protocolReader.getAgentCount(),
        protocolReader.getAliveCount(),
        protocolReader.getAgentList(),
      ]);

      const currentRound = Number(currentRoundRaw);
      const agents: AgentRow[] = await Promise.all(
        (agentList as string[]).map(async (addr) => {
          const [agent, votes, statement] = await Promise.all([
            protocolReader.agents(addr),
            currentRound > 0 ? protocolReader.getVotesForAgent(currentRound, addr) : 0n,
            currentRound > 0
              ? protocolReader.getStatement(addr, currentRound)
              : [ZERO_ADDRESS, 0, 0, false],
          ]);

          return {
            address: addr,
            isEliminated: !!agent.isEliminated,
            hasVotedThisRound: !!agent.hasVotedThisRound,
            voteTarget: agent.voteTarget,
            votesReceived: Number(votes),
            statementSubmitted: !!statement[3],
            statementSpecificity: Number(statement[1]),
            statementConfidence: Number(statement[2]),
          };
        })
      );

      const currentGameId = Number(currentGameIdRaw);
      const marketGameId = currentGameId > 0 ? currentGameId : 1;

      let market: ShadowSnapshot["market"] = null;
      let myMarket: ShadowSnapshot["myMarket"] = null;

      try {
        const marketRaw = await marketReader.markets(marketGameId);
        market = {
          citizenPool: formatMon(marketRaw.citizenPool),
          spyPool: formatMon(marketRaw.spyPool),
          result: Number(marketRaw.result),
          settled: !!marketRaw.settled,
        };

        if (account) {
          const [citizenBet, spyBet, hasClaimed] = await Promise.all([
            marketReader.userBets(marketGameId, account, true),
            marketReader.userBets(marketGameId, account, false),
            marketReader.hasClaimed(marketGameId, account),
          ]);
          myMarket = {
            citizenBet: formatMon(citizenBet),
            spyBet: formatMon(spyBet),
            hasClaimed: !!hasClaimed,
          };
        }
      } catch {
        market = null;
        myMarket = null;
      }

      setSnapshot({
        owner,
        currentGameId,
        phase: Number(currentPhaseRaw),
        round: Number(currentRoundRaw),
        result: Number(gameResultRaw),
        rewardPool: formatMon(rewardPoolRaw),
        gameTimeRemaining: Number(gameTimeRemainingRaw),
        phaseTimeRemaining: Number(phaseTimeRemainingRaw),
        agentCount: Number(agentCountRaw),
        aliveCount: Number(aliveCountRaw),
        agents,
        marketGameId,
        market,
        myMarket,
      });
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Failed to sync");
    } finally {
      setLoading(false);
    }
  }, [account, marketReader, protocolReader]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => refresh(), 3200);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  const runWrite = async (
    label: string,
    runner: (protocol: Contract, market: Contract, signerAddress: string) => Promise<any>
  ) => {
    try {
      setTxBusy(true);
      setError("");
      const { signerAddress, contracts } = await getWalletContracts({
        protocol: { address: protocolAddress, abi: SHADOW_PROTOCOL_ABI },
        market: { address: marketAddress, abi: SHADOW_MARKET_ABI },
      });
      setAccount(signerAddress);
      const tx = await runner(contracts.protocol, contracts.market, signerAddress);
      if (tx?.wait) await tx.wait();
      await refresh();
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || `Failed: ${label}`);
    } finally {
      setTxBusy(false);
    }
  };

  const citizenPool = toNum(snapshot.market?.citizenPool || "0");
  const spyPool = toNum(snapshot.market?.spyPool || "0");
  const totalPool = citizenPool + spyPool;
  const citizenPct = totalPool > 0 ? (citizenPool / totalPool) * 100 : 50;
  const spyPct = totalPool > 0 ? (spyPool / totalPool) * 100 : 50;
  const citizenPrice = Math.max(1, Math.min(99, Math.round(citizenPct)));
  const spyPrice = Math.max(1, Math.min(99, 100 - citizenPrice));
  const marketTotalPool = (citizenPool + spyPool).toFixed(4);

  const handleWalletButton = async () => {
    if (account) {
      setAccount("");
      return;
    }

    try {
      const addr = await connectWallet();
      setAccount(addr);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Wallet connect failed");
    }
  };

  const [viewMode, setViewMode] = useState<"visual" | "table">("visual");

  return (
    <div className="h-screen bg-[#0a0c10] text-white p-4 lg:p-6 space-y-4 flex flex-col overflow-hidden">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-gray-800 pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-cyan-300 hover:text-white transition-colors text-base">
            <ArrowLeft className="inline mr-1" size={16} />
            Back
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Shadow Protocol <span className="text-cyan-300">Live Match TV</span>
            </h1>
            <div className="text-sm text-gray-400">
              Real-time agent feed + prediction market for judges
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="px-3 py-1.5 border border-cyan-500 text-cyan-300 hover:bg-cyan-500 hover:text-black rounded-md text-sm"
          >
            <RefreshCw size={14} className="inline mr-2" />
            Refresh
          </button>
          <button
            onClick={handleWalletButton}
            title={account ? "Tap to disconnect wallet" : "Connect wallet"}
            className="px-3 py-1.5 border border-emerald-500 text-emerald-300 hover:bg-emerald-500 hover:text-black rounded-md text-sm"
          >
            <Wallet size={14} className="inline mr-2" />
            {account ? shortAddress(account) : "Connect Wallet"}
          </button>
          <label className="px-3 py-1.5 border border-gray-700 rounded-md text-sm text-gray-300">
            <input
              className="mr-2"
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto refresh
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 shrink-0">
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-2">
          <div className="text-gray-400 text-[10px] uppercase">Game ID</div>
          <div className="text-lg font-semibold">{snapshot.currentGameId}</div>
        </div>
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-2">
          <div className="text-gray-400 text-[10px] uppercase">Phase</div>
          <div className="text-lg font-semibold">{phaseName(snapshot.phase)}</div>
        </div>
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-2">
          <div className="text-gray-400 text-[10px] uppercase">Round</div>
          <div className="text-lg font-semibold">{snapshot.round}</div>
        </div>
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-2">
          <div className="text-gray-400 text-[10px] uppercase">Result</div>
          <div className="text-lg font-semibold">{resultName(snapshot.result)}</div>
        </div>
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-2">
          <div className="text-gray-400 text-[10px] uppercase">Agents Alive</div>
          <div className="text-lg font-semibold">
            {snapshot.aliveCount} / {snapshot.agentCount}
          </div>
        </div>
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-2">
          <div className="text-gray-400 text-[10px] uppercase">Reward Pool</div>
          <div className="text-lg font-semibold">{snapshot.rewardPool} MON</div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid xl:grid-cols-[3fr_1fr] gap-4 overflow-hidden">
        <section className="bg-[#07090d] border border-cyan-800/60 rounded-xl p-4 flex flex-col gap-4 overflow-hidden h-full">
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="text-cyan-200 text-xl font-semibold tracking-wide flex items-center gap-2">
              Live Match TV {viewMode === "visual" && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
            </div>

            <div className="flex gap-2 items-center">
              <div className="flex text-xs gap-2">
                <div className="text-cyan-200 border border-cyan-900 bg-[#0d1420] rounded px-2 py-1">
                  Phase: {formatClock(snapshot.phaseTimeRemaining)}
                </div>
                <div className="text-cyan-200 border border-cyan-900 bg-[#0d1420] rounded px-2 py-1">
                  Match: {formatClock(snapshot.gameTimeRemaining)}
                </div>
              </div>

              <div className="flex bg-[#0d1420] rounded-lg p-1 border border-cyan-900/50">
                <button
                  onClick={() => setViewMode("visual")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === "visual" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Visualizer
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === "table" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-0 overflow-hidden relative rounded-lg border border-gray-800 bg-[#0d1118]">
            {viewMode === "visual" ? (
              <ShadowVisualizer
                agents={snapshot.agents}
                phase={snapshot.phase}
                round={snapshot.round}
              />
            ) : snapshot.agents.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-xl mb-2">Signal Lost...</div>
                  <div className="text-sm opacity-60">Waiting for agents to join the network.</div>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0f1722] text-cyan-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Agent</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Statement</th>
                      <th className="p-3">Vote Target</th>
                      <th className="p-3">Votes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.agents.map((agent) => (
                      <tr key={agent.address} className="border-t border-gray-800">
                        <td className="p-3">{shortAddress(agent.address)}</td>
                        <td className="p-3">
                          {agent.isEliminated ? (
                            <span className="text-red-400">Eliminated</span>
                          ) : (
                            <span className="text-emerald-400">Alive</span>
                          )}
                        </td>
                        <td className="p-3">
                          {agent.statementSubmitted
                            ? `S${agent.statementSpecificity}/C${agent.statementConfidence}`
                            : "No statement"}
                        </td>
                        <td className="p-3">
                          {agent.hasVotedThisRound && agent.voteTarget !== ZERO_ADDRESS
                            ? shortAddress(agent.voteTarget)
                            : "No vote"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    snapshot.aliveCount > 0 ? (agent.votesReceived / snapshot.aliveCount) * 100 : 0
                                  )}%`,
                                }}
                              />
                            </div>
                            <span>{agent.votesReceived}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-cyan-900/40 shrink-0">
            <button
              onClick={() => setShowHowToPlay((prev) => !prev)}
              className="text-xs text-cyan-300 hover:text-white underline underline-offset-4"
            >
              how to play game
            </button>
            {showHowToPlay && (
              <div className="mt-2 text-xs text-gray-400">
                <ul className="space-y-1.5 pl-1">
                  <li>1. <strong>Survival</strong>: 18 rounds of high-stakes social deduction.</li>
                  <li>2. <strong>Roles</strong>: Citizens must identify and vote out the Spy Anomaly.</li>
                  <li>3. <strong>Betting</strong>: Stake MON on the winning faction (Citizens vs Spies).</li>
                  <li>4. <strong>Victory</strong>: Survivors split the accumulated yield pool.</li>
                </ul>
              </div>
            )}
          </div>
        </section>

        <aside className="bg-white text-[#111827] border border-gray-200 rounded-xl p-4 space-y-3 overflow-y-auto h-full">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <BarChart3 size={18} />
            Prediction Market
          </div>

          <div className="text-xs text-gray-500">
            Game {snapshot.marketGameId} • {shortAddress(marketAddress)}
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 p-1 bg-gray-50">
            <button
              onClick={() => setMarketBetSide("citizens")}
              className={`py-2 rounded-md font-semibold text-sm ${marketBetSide === "citizens" ? "bg-emerald-500 text-white" : "bg-white text-gray-700"
                }`}
            >
              Citizens {citizenPrice}c
            </button>
            <button
              onClick={() => setMarketBetSide("spies")}
              className={`py-2 rounded-md font-semibold text-sm ${marketBetSide === "spies" ? "bg-rose-500 text-white" : "bg-white text-gray-700"
                }`}
            >
              Spies {spyPrice}c
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs font-medium text-gray-600">Fixed Amount</div>
            <div className="text-xl font-semibold mt-1">1 MON</div>
          </div>

          <button
            onClick={() =>
              runWrite("market.placeBet", (_, market) =>
                market.placeBet(marketBetSide === "citizens", { value: parseMon("1") })
              )
            }
            disabled={txBusy}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 text-sm"
          >
            {txBusy ? "Trading..." : "Trade 1 MON"}
          </button>

          <button
            onClick={() =>
              runWrite("market.claimPayout", (_, market) => market.claimPayout(BigInt(snapshot.marketGameId || 0)))
            }
            disabled={txBusy || snapshot.marketGameId <= 0}
            className="w-full py-2 rounded-md bg-slate-900 hover:bg-black text-white font-semibold disabled:opacity-50 text-sm"
          >
            {txBusy ? "Claiming..." : "Claim Payout"}
          </button>

          <div className="rounded-lg border border-gray-200 p-3 text-xs space-y-1">
            <div className="font-semibold text-gray-700">Market State</div>
            {snapshot.market ? (
              <>
                <div>Citizens Pool: {snapshot.market.citizenPool} MON</div>
                <div>Spies Pool: {snapshot.market.spyPool} MON</div>
                <div>Total Pool: {marketTotalPool} MON</div>
                <div>Status: {snapshot.market.settled ? `Settled (${resultName(snapshot.market.result)})` : "Open"}</div>
              </>
            ) : (
              <div>No market state yet.</div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 p-3 text-xs space-y-1">
            <div className="font-semibold text-gray-700">Your Position</div>
            <div>Citizens: {snapshot.myMarket?.citizenBet || "0.0000"} MON</div>
            <div>Spies: {snapshot.myMarket?.spyBet || "0.0000"} MON</div>
            <div>Claimed: {snapshot.myMarket?.hasClaimed ? "YES" : "NO"}</div>
          </div>
        </aside>
      </div>

      {error && <div className="text-sm text-red-400 shrink-0">{error}</div>}
    </div>
  );
};
