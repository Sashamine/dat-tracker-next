/**
 * Forward Industries (FWDI) — Solana wallet addresses
 * Source: Arkham Intelligence entity page (29 addresses)
 * https://intel.arkm.com/explorer/entity/forward-industries
 * Scraped: 2026-02-13
 *
 * Arkham tracks ~4.5M SOL across these wallets.
 * Verified on-chain via Solana RPC: 4,509,655 SOL total.
 *
 * Gap vs website (6.98M SOL-equiv):
 * ~2.5M SOL-equivalent is in fwdSOL liquid staking tokens,
 * likely deployed into DeFi protocols (borrow-lend vaults,
 * token-exchange pools) and not attributed to FWDI on Arkham.
 * The 10-Q classifies these as "digital assets NOT at fair value"
 * carried at cost ($201.6M).
 *
 * TODO: Find fwdSOL mint address and DeFi vault addresses
 * to track the remaining ~2.5M SOL-equivalent.
 */

export interface FwdiWallet {
  address: string;
  label: string;
  type: "stake-account" | "custody" | "hot-wallet" | "deposit" | "authority";
}

export const FWDI_WALLETS: FwdiWallet[] = [
  // === Stake Accounts (SOL staked to validators) ===
  {
    address: "6W72bUKNUcrNhTE13x7PbXuaUDUy8pTkKhofA6JaQ7Fp",
    label: "Stake Account (6W72b)",
    type: "stake-account",
  },
  {
    address: "JDW29Rk3QBqX5kSbeoatMS3tKZRmexFWWfoCzVFUGJnq",
    label: "Stake Account (JDW29)",
    type: "stake-account",
  },
  {
    address: "5kuumvgSX6GFgEvWsRw1NXJhggAXKp1TRRXVRfrueifD",
    label: "Stake Account (5kuum)",
    type: "stake-account",
  },
  {
    address: "2rCQCiAWqh5qZU6eLVfmwyk8K1rZaZ6GEabxPMbS2FbT",
    label: "Stake Account (2rCQC)",
    type: "stake-account",
  },
  {
    address: "3sDXAL3ojojK4znGuZJYL4bdMTXd9c5N4nSULAjgQJ6j",
    label: "Stake Account (3sDXA)",
    type: "stake-account",
  },
  {
    address: "ByDgEPVKudwLBHFYYhzq1khCWKHBNQfZVJD1L7gMQkw7",
    label: "Stake Account (ByDgE)",
    type: "stake-account",
  },
  {
    address: "Eqo5ep3A6A1kng6AybSvG1BExwGp48TbP6HymWupCTe7",
    label: "Stake Account (Eqo5e)",
    type: "stake-account",
  },
  {
    address: "HNhYTNCXgaskLRV2Zh6gVmTHSokKj19XcXsEsU2hKMqk",
    label: "Stake Account (HNhYT)",
    type: "stake-account",
  },
  {
    address: "9mZyj53THUNMiCSUEzaDSo4oc42XUbbAJzYDwu4YF71U",
    label: "Stake Account (9mZyj)",
    type: "stake-account",
  },
  {
    address: "GTw9vw39HEVUJTbzJkstghpNyS3XDSXf6rKfX4QpsPVc",
    label: "Stake Account (GTw9v)",
    type: "stake-account",
  },
  {
    address: "Foa3XmYxiFRsptJKPovTz8v1Mg4ZdgtHneTxRifK6WrN",
    label: "Stake Account (Foa3X)",
    type: "stake-account",
  },

  // === Custody ===
  {
    address: "7d4ZhfBRamc2szcuHbVGYbuKFNfjZoKeXm2S3JC2uXeP",
    label: "Coinbase Prime Custody (7d4Zh)",
    type: "custody",
  },
  {
    address: "5AYVHr45axSVr3Nw314PFcEY87cUG6iPiBbaiDAu5NYp",
    label: "Fireblocks Custody (5AYVH)",
    type: "custody",
  },
  {
    address: "FoGiv38RLeE79PeSvxN1XKbTuFuMV2TKvtM7ecq6YvkH",
    label: "Fireblocks Custody (FoGiv)",
    type: "custody",
  },

  // === Hot Wallet ===
  {
    address: "3vxheE5C46XzK4XftziRhwAf8QAfipD7HXXWj25mgkom",
    label: "Hot Wallet (3vxhe)",
    type: "hot-wallet",
  },

  // === Deposit ===
  {
    address: "6qY6bz9nH2qZ4KoxPG3Cbw56zs2SVPiayuKFpop9qzBD",
    label: "Coinbase Prime Deposit (6qY6b)",
    type: "deposit",
  },

  // === Authority ===
  {
    address: "59L2oxymiQQ9Hvhh92nt8Y7nDYjsauFkdb3SybdnsG6h",
    label: "Gas Supplier & Staking Authority (59L2o)",
    type: "authority",
  },
];

// Unique addresses only (deduplicated from Arkham's 29 which includes duplicates)
export const FWDI_WALLET_ADDRESSES = FWDI_WALLETS.map((w) => w.address);

// Stake accounts — these earn staking rewards
export const FWDI_STAKE_ACCOUNTS = FWDI_WALLETS.filter(
  (w) => w.type === "stake-account"
).map((w) => w.address);

// All custody/hot wallets — these hold unstaked SOL
export const FWDI_CUSTODY_WALLETS = FWDI_WALLETS.filter(
  (w) => w.type === "custody" || w.type === "hot-wallet" || w.type === "deposit"
).map((w) => w.address);
