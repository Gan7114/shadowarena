import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, RefreshCw, Wallet } from "lucide-react";
import { GlitchText } from "./GlitchText";
import { Contract } from "ethers";
import {
  connectWallet,
  createReadContract,
  formatMon,
  getWalletContracts,
  parseMon,
  safeAddress,
  shortAddress,
  ZERO_ADDRESS,
} from "../lib/onchain";
import {
  DEFAULT_CONFIG,
  IMPOSTERS_GAME_ABI,
  IMPOSTERS_MARKET_ABI,
  IMPOSTERS_PHASES,
} from "../lib/contracts"; // Fixed import
import { loadImpostersConfig } from "../lib/runtimeConfig";
import { ImposterVisualizer } from "./ImposterVisualizer";


type PlayerRow = {
  address: string;
  isAlive: boolean;
  hasJoined: boolean;
  tasksCompleted: number;
  x: number;
  y: number;
  yesPrice: string;
  noPrice: string;
};

type Snapshot = {
  owner: string;
  currentGameId: number;
  phase: number;
  round: number;
  playerCount: number;
  aliveCount: number;
  isSabotaged: boolean;
  sabotageEndBlock: number;
  currentMarketId: number;
  lastResolvedMarketId: number;
  players: PlayerRow[];
  marketState: {
    winningImposter: string;
    isResolved: boolean;
    totalWinningShares: string;
    totalPool: string;
    totalGlobalNoShares: string;
    betCount: number;
  } | null;
};

function phaseName(phase: number): string {
  return IMPOSTERS_PHASES[phase] ?? `UNKNOWN(${phase})`;
}

export const ImpostersGame: React.FC = () => {
  const initialConfig = useMemo(() => {
    return loadImpostersConfig(DEFAULT_CONFIG.imposters);
  }, []);

  const [rpcUrl] = useState(initialConfig.rpcUrl);
  const [gameAddress] = useState(initialConfig.gameAddress);
  const [marketAddress] = useState(initialConfig.marketAddress);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [account, setAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txBusy, setTxBusy] = useState(false);
  const [error, setError] = useState("");
  const [betTarget, setBetTarget] = useState("");
  const [betOutcome, setBetOutcome] = useState<"YES" | "NO">("YES");
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "table">("visual");


  const [snapshot, setSnapshot] = useState<Snapshot>({
    owner: ZERO_ADDRESS,
    currentGameId: 0,
    phase: 0,
    round: 0,
    playerCount: 0,
    aliveCount: 0,
    isSabotaged: false,
    sabotageEndBlock: 0,
    currentMarketId: 1,
    lastResolvedMarketId: 0,
    players: [],
    marketState: null,
  });

  const gameReader = useMemo(
    () => createReadContract(gameAddress, IMPOSTERS_GAME_ABI, rpcUrl),
    [gameAddress, rpcUrl]
  );
  const marketReader = useMemo(
    () => createReadContract(marketAddress, IMPOSTERS_MARKET_ABI, rpcUrl),
    [marketAddress, rpcUrl]
  );

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        owner,
        currentGameId,
        phase,
        round,
        playerCountRaw,
        aliveCountRaw,
        isSabotaged,
        sabotageEndBlockRaw,
        currentMarketIdRaw,
        lastResolvedMarketIdRaw,
      ] = await Promise.all([
        gameReader.owner(),
        gameReader.currentGameId(),
        gameReader.getCurrentPhase(),
        gameReader.getRoundNumber(),
        gameReader.getPlayerCount(),
        gameReader.getAliveCount(),
        gameReader.isSabotaged(),
        gameReader.sabotageEndBlock(),
        marketReader.currentMarketId(),
        marketReader.lastResolvedMarketId(),
      ]);

      const playerCount = Number(playerCountRaw);
      const addresses = await Promise.all(
        Array.from({ length: playerCount }, (_, i) => gameReader.getPlayerAddress(i))
      );

      const players: PlayerRow[] = await Promise.all(
        addresses.map(async (addr: string) => {
          const [pInfo, yesPrice, noPrice] = await Promise.all([
            gameReader.players(addr),
            marketReader.getPrice(addr, true),
            marketReader.getPrice(addr, false),
          ]);
          return {
            address: addr,
            isAlive: !!pInfo.isAlive,
            hasJoined: !!pInfo.hasJoined,
            tasksCompleted: Number(pInfo.tasksCompleted),
            x: Number(pInfo.x),
            y: Number(pInfo.y),
            yesPrice: formatMon(yesPrice),
            noPrice: formatMon(noPrice),
          };
        })
      );

      let marketState: Snapshot["marketState"] = null;
      try {
        const [marketStateRaw, betCountRaw] = await Promise.all([
          marketReader.getMarketState(currentMarketIdRaw),
          marketReader.getBetCountForMarket(currentMarketIdRaw),
        ]);
        marketState = {
          winningImposter: marketStateRaw.winningImposter,
          isResolved: !!marketStateRaw.isResolved,
          totalWinningShares: formatMon(marketStateRaw.totalWinningShares),
          totalPool: formatMon(marketStateRaw.totalPool),
          totalGlobalNoShares: formatMon(marketStateRaw.totalGlobalNoShares),
          betCount: Number(betCountRaw),
        };
      } catch {
        marketState = null;
      }

      setSnapshot({
        owner,
        currentGameId: Number(currentGameId),
        phase: Number(phase),
        round: Number(round),
        playerCount,
        aliveCount: Number(aliveCountRaw),
        isSabotaged: !!isSabotaged,
        sabotageEndBlock: Number(sabotageEndBlockRaw),
        currentMarketId: Number(currentMarketIdRaw),
        lastResolvedMarketId: Number(lastResolvedMarketIdRaw),
        players,
        marketState,
      });
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Failed to sync state");
    } finally {
      setLoading(false);
    }
  }, [gameReader, marketReader]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => refresh(), 4500);
    return () => clearInterval(id);
  }, [autoRefresh, refresh]);

  const runWrite = async (
    label: string,
    runner: (game: Contract, market: Contract, signerAddress: string) => Promise<any>
  ) => {
    try {
      setTxBusy(true);
      setError("");
      const { signerAddress, contracts } = await getWalletContracts({
        game: { address: gameAddress, abi: IMPOSTERS_GAME_ABI },
        market: { address: marketAddress, abi: IMPOSTERS_MARKET_ABI },
      });
      setAccount(signerAddress);
      const tx = await runner(contracts.game, contracts.market, signerAddress);
      if (tx?.wait) await tx.wait();
      await refresh();
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || `Failed: ${label}`);
    } finally {
      setTxBusy(false);
    }
  };

  useEffect(() => {
    if (snapshot.players.length === 0) {
      setBetTarget("");
      return;
    }
    const hasCurrent = snapshot.players.some((player) => player.address === betTarget);
    if (!hasCurrent) setBetTarget(snapshot.players[0].address);
  }, [snapshot.players, betTarget]);

  const selectedBetPlayer = useMemo(
    () => snapshot.players.find((player) => player.address === betTarget) ?? null,
    [snapshot.players, betTarget]
  );

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

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 lg:p-8 space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-cyan-300 hover:text-white transition-colors text-base">
            <ArrowLeft className="inline mr-1" size={16} />
            Back
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              <GlitchText text="IMPOSTERS" speed={30} /> <span className="text-green-300"><GlitchText text="LIVE_MATCH_TV" speed={40} /></span>
            </h1>
            <div className="text-sm text-gray-400">
              <GlitchText text="REAL_TIME_FEED_PLUS_PREDICTION_MARKET" speed={20} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="px-3 py-2 border border-cyan-500 text-cyan-300 hover:bg-cyan-500 hover:text-black rounded-md"
          >
            <RefreshCw size={16} className="inline mr-2" />
            Refresh
          </button>
          <button
            onClick={handleWalletButton}
            title={account ? "Tap to disconnect wallet" : "Connect wallet"}
            className="px-3 py-2 border border-emerald-500 text-emerald-300 hover:bg-emerald-500 hover:text-black rounded-md"
          >
            <Wallet size={16} className="inline mr-2" />
            {account ? shortAddress(account) : "Connect Wallet"}
          </button>
          <label className="px-3 py-2 border border-gray-700 rounded-md text-sm text-gray-300">
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

      <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-3">
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-xs uppercase"><GlitchText text="GAME_ID" speed={10} /></div>
          <div className="text-2xl font-semibold">{snapshot.currentGameId}</div>
        </div>
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-xs uppercase"><GlitchText text="PHASE" speed={10} /></div>
          <div className="text-2xl font-semibold"><GlitchText text={phaseName(snapshot.phase)} speed={30} /></div>
        </div>
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-xs uppercase"><GlitchText text="ROUND" speed={10} /></div>
          <div className="text-2xl font-semibold">{snapshot.round}</div>
        </div>
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-xs uppercase"><GlitchText text="ALIVE_NODES" speed={10} /></div>
          <div className="text-2xl font-semibold">
            {snapshot.aliveCount} / {snapshot.playerCount}
          </div>
        </div>
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-xs uppercase"><GlitchText text="ENTROPY_LEVEL" speed={10} /></div>
          <div className={`text-2xl font-semibold ${snapshot.isSabotaged ? "text-red-400" : "text-emerald-400"}`}>
            {snapshot.isSabotaged ? <GlitchText text="ACTIVE" speed={30} /> : <GlitchText text="CLEAR" speed={30} />}
          </div>
        </div>
        <div className="bg-[#11151c] border border-gray-800 rounded-lg p-3">
          <div className="text-gray-400 text-xs uppercase"><GlitchText text="MARKET_ID" speed={10} /></div>
          <div className="text-2xl font-semibold">{snapshot.currentMarketId}</div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[3fr_1fr] gap-5">


        <section className="bg-[#07090d] border border-cyan-800/60 rounded-xl p-4 md:p-6 space-y-5 flex flex-col min-h-[700px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <div className="text-xs text-cyan-200 border border-cyan-900 bg-[#0d1420] rounded px-2 py-1">
                Sabotage End Block: {snapshot.sabotageEndBlock || "-"}
              </div>
              <div className="text-xs text-cyan-200 border border-cyan-900 bg-[#0d1420] rounded px-2 py-1">
                Last Resolved Market: {snapshot.lastResolvedMarketId || "-"}
              </div>
            </div>

            <div className="flex bg-[#0d1420] rounded-lg p-1 border border-cyan-900/50">
              <button
                onClick={() => setViewMode("visual")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === "visual" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Map View
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${viewMode === "table" ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                List View
              </button>
            </div>
          </div>

          <div className="text-cyan-200 text-xl md:text-2xl font-semibold tracking-wide flex items-center gap-2">
            Live Match TV {viewMode === "visual" && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
          </div>

          <div className="flex-1 w-full min-h-0 overflow-hidden relative rounded-lg border border-gray-800 bg-[#0d1118]">
            {viewMode === "visual" ? (
              <ImposterVisualizer players={snapshot.players} isSabotaged={snapshot.isSabotaged} />
            ) : snapshot.players.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-xl mb-2"><GlitchText text="SIGNAL_LOST..." speed={40} /></div>
                  <div className="text-sm opacity-60"><GlitchText text="WAITING_FOR_AGENTS..." speed={20} /></div>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0f1722] text-cyan-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Player</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Tasks</th>
                      <th className="p-3">Position</th>
                      <th className="p-3">YES</th>
                      <th className="p-3">NO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.players.map((player) => (
                      <tr key={player.address} className="border-t border-gray-800">
                        <td className="p-3">{shortAddress(player.address)}</td>
                        <td className="p-3">
                          {player.isAlive ? (
                            <span className="text-emerald-400">Alive</span>
                          ) : (
                            <span className="text-red-400">Eliminated</span>
                          )}
                        </td>
                        <td className="p-3">{player.tasksCompleted}</td>
                        <td className="p-3">
                          {player.x},{player.y}
                        </td>
                        <td className="p-3">{player.yesPrice}</td>
                        <td className="p-3">{player.noPrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-cyan-900/40">

            <button
              onClick={() => setShowHowToPlay((prev) => !prev)}
              className="text-sm text-cyan-300 hover:text-white underline underline-offset-4"
            >
              how to play game
            </button>
            {showHowToPlay && (
              <div className="mt-3 bg-[#0d1118] border border-cyan-900 rounded-lg p-3 text-sm space-y-1 text-gray-200">
                <div>1. Agents run join, movement, tasks, and voting automatically.</div>
                <div>2. Humans watch this TV feed for live phase and elimination updates.</div>
                <div>3. Humans only use Prediction Market: Trade 1 MON and Claim Payout.</div>
              </div>
            )}
          </div>
        </section>

        <aside className="bg-white text-[#111827] border border-gray-200 rounded-xl p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <BarChart3 size={18} />
            Prediction Market
          </div>

          <div className="text-sm text-gray-500">
            Game {snapshot.currentMarketId} • Contract {shortAddress(marketAddress)}
          </div>

          {snapshot.players.length === 0 ? (
            <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-500">
              No market targets yet. Add players first.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 p-3 space-y-2">
                <div className="text-sm font-medium text-gray-600">Target Player</div>
                <select
                  className="w-full rounded-md border border-gray-300 px-2 py-2 bg-white"
                  value={betTarget}
                  onChange={(e) => setBetTarget(e.target.value)}
                >
                  {snapshot.players.map((player) => (
                    <option key={player.address} value={player.address}>
                      {shortAddress(player.address)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 p-1 bg-gray-50">
                <button
                  onClick={() => setBetOutcome("YES")}
                  className={`py-3 rounded-md font-semibold ${betOutcome === "YES" ? "bg-emerald-500 text-white" : "bg-white text-gray-700"
                    }`}
                >
                  YES {selectedBetPlayer?.yesPrice ?? "--"}c
                </button>
                <button
                  onClick={() => setBetOutcome("NO")}
                  className={`py-3 rounded-md font-semibold ${betOutcome === "NO" ? "bg-rose-500 text-white" : "bg-white text-gray-700"
                    }`}
                >
                  NO {selectedBetPlayer?.noPrice ?? "--"}c
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <div className="text-sm font-medium text-gray-600">Fixed Amount</div>
                <div className="text-2xl font-semibold mt-1">1 MON</div>
              </div>

              <button
                onClick={() =>
                  runWrite("market.bet", (_, market) =>
                    market.bet(safeAddress(betTarget), betOutcome === "YES", { value: parseMon("1") })
                  )
                }
                disabled={txBusy || !betTarget}
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
              >
                {txBusy ? "Trading..." : "Trade 1 MON"}
              </button>
            </>
          )}

          <button
            onClick={() => runWrite("market.claim", (_, market) => market.claim())}
            disabled={txBusy}
            className="w-full py-2 rounded-md bg-slate-900 hover:bg-black text-white font-semibold disabled:opacity-50"
          >
            {txBusy ? "Claiming..." : "Claim Payout"}
          </button>

          <div className="rounded-lg border border-gray-200 p-3 text-sm space-y-1">
            <div className="font-semibold text-gray-700">Market State</div>
            {snapshot.marketState ? (
              <>
                <div>Total Pool: {snapshot.marketState.totalPool} MON</div>
                <div>Winning Shares: {snapshot.marketState.totalWinningShares} MON</div>
                <div>Total NO Shares: {snapshot.marketState.totalGlobalNoShares} MON</div>
                <div>Total Bets: {snapshot.marketState.betCount}</div>
                <div>Status: {snapshot.marketState.isResolved ? "Resolved" : "Open"}</div>
                {snapshot.marketState.winningImposter !== ZERO_ADDRESS && (
                  <div>Winning Imposter: {shortAddress(snapshot.marketState.winningImposter)}</div>
                )}
              </>
            ) : (
              <div>No market state for current match yet.</div>
            )}
          </div>
        </aside>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
};
