/**
 * Boots a local Anvil and deploys the Tinjau stack onto it (tasks T4.2–T4.5).
 *
 * ---------------------------------------------------------------------------------------
 * WHY THIS IS SEPARATE FROM THE HARNESS. The harness knows nothing about Anvil, forge, or
 * deployment. It takes a `TinjauChainConfig` and runs scenes. This file's only job is to
 * PRODUCE such a config for a local chain, so that the identical harness can later be handed a
 * config for X Layer Testnet without a line changing. If a scene ever needs something only this
 * file can provide, the harness has stopped being chain-agnostic.
 *
 * KEYS. The private keys here are Anvil's own published, deterministic development keys. They
 * are worthless by construction and are printed in Anvil's banner on every start. They must
 * never be reused anywhere. No key for any real network appears in this repository, ever.
 * ---------------------------------------------------------------------------------------
 */

import { spawn, type ChildProcess } from "node:child_process";
import { execFile } from "node:child_process";
import { createServer } from "node:net";
import { promisify } from "node:util";
import { privateKeyToAccount } from "viem/accounts";

import type { TinjauAddresses, TinjauChainConfig, TinjauEnvelope } from "./tinjauChain.js";

const execFileAsync = promisify(execFile);

/**
 * Anvil's standard development accounts. Published in its own startup banner and in Foundry's
 * documentation; they exist so local tests need no secrets. Never usable on a real network.
 */
export const ANVIL_DEV_KEYS = {
  deployerAndGuardian: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const,
  assessor: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as const,
  poster: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" as const,
  relayer: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" as const,
};

export interface LocalStack {
  config: TinjauChainConfig;
  assessorKey: `0x${string}`;
  stop(): Promise<void>;
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForRpc(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Anvil did not become reachable at ${url} within ${timeoutMs}ms`);
}

/** Parses the `KEY= value` block the deploy script prints between its two sentinel lines. */
export function parseDeploymentOutput(stdout: string): Record<string, string> {
  const begin = stdout.indexOf("---TINJAU-DEPLOYMENT-BEGIN---");
  const end = stdout.indexOf("---TINJAU-DEPLOYMENT-END---");
  if (begin === -1 || end === -1) {
    throw new Error(
      "Deploy script produced no TINJAU-DEPLOYMENT block. Its output is the only interface " +
        "between deployment and the harness, so an empty block means the deployment did not " +
        "complete, not that parsing failed.",
    );
  }
  const out: Record<string, string> = {};
  for (const line of stdout.slice(begin, end).split("\n")) {
    const match = /^\s*([A-Z0-9_]+)=\s*(.+?)\s*$/.exec(line);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

export interface StartLocalStackOptions {
  /** Repository path of the Foundry project. */
  contractsDir: string;
  /** Compressed timings, for rehearsing a chain that cannot warp. Default false. */
  demoEnvelope?: boolean;
  /** Anvil's starting block timestamp. Defaults to the real clock. */
  startTimestampSec?: number;
}

/**
 * Starts Anvil on a free port, deploys the whole stack, and returns a ready config.
 *
 * Broadcasting here targets `127.0.0.1` only. Nothing in this file can reach a public network:
 * the RPC URL is constructed from a locally-bound port, and the chain id guard in the deploy
 * script is set to Anvil's 31337.
 */
export async function startLocalStack(opts: StartLocalStackOptions): Promise<LocalStack> {
  const port = await findFreePort();
  const rpcUrl = `http://127.0.0.1:${port}`;

  const args = ["--port", String(port), "--chain-id", "31337", "--silent"];
  if (opts.startTimestampSec !== undefined) {
    args.push("--timestamp", String(opts.startTimestampSec));
  }
  const anvil: ChildProcess = spawn("anvil", args, { stdio: "ignore" });
  const stop = async (): Promise<void> => {
    if (!anvil.killed) anvil.kill("SIGTERM");
  };

  try {
    await waitForRpc(rpcUrl);

    const guardian = privateKeyToAccount(ANVIL_DEV_KEYS.deployerAndGuardian);
    const assessor = privateKeyToAccount(ANVIL_DEV_KEYS.assessor);
    const poster = privateKeyToAccount(ANVIL_DEV_KEYS.poster);
    const relayer = privateKeyToAccount(ANVIL_DEV_KEYS.relayer);

    const { stdout } = await execFileAsync(
      "forge",
      [
        "script",
        "script/DeployTinjauStack.s.sol:DeployTinjauStack",
        "--rpc-url",
        rpcUrl,
        "--broadcast",
        "--private-key",
        ANVIL_DEV_KEYS.deployerAndGuardian,
      ],
      {
        cwd: opts.contractsDir,
        maxBuffer: 64 * 1024 * 1024,
        env: {
          ...process.env,
          TINJAU_ALLOWED_CHAIN_IDS: "31337",
          ASSESSOR: assessor.address,
          // The deployer is the guardian so asset vetting happens in the same run.
          GUARDIAN: guardian.address,
          TINJAU_DEMO_ENVELOPE: opts.demoEnvelope ? "1" : "0",
        },
      },
    );

    const d = parseDeploymentOutput(stdout);
    const need = (key: string): string => {
      const value = d[key];
      if (!value) throw new Error(`deploy output is missing ${key}`);
      return value;
    };

    const addresses: TinjauAddresses = {
      registry: need("TINJAU_REGISTRY") as `0x${string}`,
      hook: need("TINJAU_HOOK") as `0x${string}`,
      poolManager: need("POOL_MANAGER") as `0x${string}`,
      swapRouter: need("SWAP_ROUTER") as `0x${string}`,
      liquidityRouter: need("LIQUIDITY_ROUTER") as `0x${string}`,
      riskAsset: need("RISK_ASSET") as `0x${string}`,
      quoteAsset: need("QUOTE_ASSET") as `0x${string}`,
      token0: need("TOKEN0") as `0x${string}`,
      token1: need("TOKEN1") as `0x${string}`,
      poolId: need("POOL_ID") as `0x${string}`,
      tickSpacing: Number(need("TICK_SPACING")),
    };

    const envelope: TinjauEnvelope = {
      baseFee: Number(need("BASE_FEE")),
      maxFee: Number(need("MAX_FEE")),
      widenDuration: Number(need("WIDEN_DURATION")),
      decayDuration: Number(need("DECAY_DURATION")),
      maxProtectDuration: Number(need("MAX_PROTECT_DURATION")),
      cooldown: Number(need("COOLDOWN")),
      demoEnvelope: need("DEMO_ENVELOPE") === "1",
    };

    const config: TinjauChainConfig = {
      rpcUrl,
      chainId: Number(need("CHAIN_ID")),
      networkLabel: "anvil-local",
      addresses,
      envelope,
      accounts: { assessor, poster, relayer, guardian },
      supportsTimeTravel: true,
    };

    return { config, assessorKey: ANVIL_DEV_KEYS.assessor, stop };
  } catch (err) {
    await stop();
    throw err;
  }
}
