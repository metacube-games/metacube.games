import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define interfaces for type safety
interface StarkNetEvent {
    from_address: string;
    keys: string[];
    data: string[];
    block_hash: string;
    block_number: number;
    transaction_hash: string;
}

interface EventsResponse {
    jsonrpc: string;
    id: number;
    result: {
        events: StarkNetEvent[];
        continuation_token?: string;
    };
}

interface ContractState {
    lastProcessedBlock: number;
    ownershipMap: Map<string, Set<string>>;
}

interface ListingDetails {
    price: string;
    paymentToken: string;
    expirationTimestamp: string;
    owner: string;
    block_number: number;
}

// Configuration
const CONTRACTS: Record<string, { deploymentBlock: number, type: 'nft' | 'marketplace' }> = {
    "0x007ca74fd0a9239678cc6355e38ac1e7820141501727ae37f9c733e5ed1c3592": { deploymentBlock: 636421, type: 'nft' },
    "0x0602c301f6a1c2ef174bafaab7389c3f6165df34736befcf2ca3df7764934caf": { deploymentBlock: 645335, type: 'nft' },
    "0x05c15109745fd726f302ac7a16fad3f5f073aa07ff6e0fa9291e2c89eb7bc5cd": { deploymentBlock: 1246403, type: 'nft' },
    "0x05bee0ba034b07c6246c2e1e6fea2fb7df2c2108603895c367bdece3d0e0b478": { deploymentBlock: 1246403, type: 'nft' },
    "0x0680e5fe0b71702a1227fa8bcd083c7a8cf7aa535e848b2dd0a82b4d01257255": { deploymentBlock: 1290037, type: 'nft' },
    "0x039189a5de1c0a4ff558276ee48dd1ae9d6a5bd498635420f1f6344e8416b3f7": { deploymentBlock: 1448853, type: 'nft' },
    "0x03ffcdb47b567c5621150e355f652244690c7afe64a31cdc06037444fa7b9ffb": { deploymentBlock: 1330278, type: 'marketplace' }
};

const MARKETPLACE_ADDRESS = "0x03ffcdb47b567c5621150e355f652244690c7afe64a31cdc06037444fa7b9ffb";

const LIST_ORDER_EVENT_KEY = "0x39a1f3de35fbd4b78dfbf2fbe356060694f64466547bd7ae74f77b0c3d4dadf".toLowerCase();
const DELIST_ORDER_EVENT_KEY = "0x23fbe7e6e31b75bd3d25158bf985a4c41355017ac26cf4ee890518b726393d3".toLowerCase();
const TRANSFER_EVENT_KEY = '0x99cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9'.toLowerCase();

if (!process.env.API_URL) {
    console.error('API_URL is not set');
    process.exit(1);
}
const API_URL = process.env.API_URL;
const STATE_FILE = '/persistent/state.json';
const PORT = 8080;
const MAX_BLOCK_RANGE = 100_000;
// Reorg safety: stay this many blocks behind the tip so shallow reorgs can't corrupt state.
const CONFIRMATIONS = 10;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_FETCH_ATTEMPTS = 3;

function normalizeAddress(addr: string): string {
    return '0x' + addr.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

// Pre-computed normalized zero address. The raw form is "0x0"; after
// normalizeAddress it's "0x" + 64 zeros — compare against this constant
// rather than the literal "0x0" (which never matches the normalized form).
const ZERO_ADDRESS = normalizeAddress('0x0');

// State
let contractsState: Map<string, ContractState>;
let marketplaceState: { lastProcessedBlock: number, listings: Map<string, Map<string, ListingDetails>> };

// In-flight guard: a slow cycle must not overlap the next interval tick.
let running = false;
let initialized = false;
let saveCounter = 0;

// Initialize Express app
const app = express();

// Load state from file or initialize fresh
function loadState(): { contracts: Map<string, ContractState>, marketplace: { lastProcessedBlock: number, listings: Map<string, Map<string, ListingDetails>> } } {
    let state = {
        contracts: new Map<string, ContractState>(),
        marketplace: {
            lastProcessedBlock: CONTRACTS[MARKETPLACE_ADDRESS].deploymentBlock - 1,
            listings: new Map<string, Map<string, ListingDetails>>()
        }
    };

    try {
        const data = fs.readFileSync(STATE_FILE, 'utf8');
        const json = JSON.parse(data);

        for (const [contract, contractData] of Object.entries(json.contracts)) {
            const ownership = new Map<string, Set<string>>();
            for (const [owner, tokenIds] of Object.entries(contractData.ownership)) {
                ownership.set(owner, new Set(tokenIds));
            }
            state.contracts.set(contract, {
                lastProcessedBlock: contractData.last_processed_block,
                ownershipMap: ownership
            });
        }

        if (json.marketplace) {
            state.marketplace.lastProcessedBlock = json.marketplace.last_processed_block;
            for (const [contract, tokens] of Object.entries(json.marketplace.listings)) {
                const tokenMap = new Map<string, ListingDetails>();
                for (const [tokenId, details] of Object.entries(tokens)) {
                    tokenMap.set(tokenId, details);
                }
                state.marketplace.listings.set(contract, tokenMap);
            }
        }
    } catch (error) {
        console.log('No state file found or error parsing, initializing');
    }

    for (const [contractAddress, contractInfo] of Object.entries(CONTRACTS)) {
        if (contractInfo.type === 'nft' && !state.contracts.has(contractAddress)) {
            state.contracts.set(contractAddress, {
                lastProcessedBlock: contractInfo.deploymentBlock - 1,
                ownershipMap: new Map()
            });
        }
    }

    return state;
}

async function saveState() {
    const json = {
        contracts: Object.fromEntries(
            Array.from(contractsState.entries()).map(([contract, contractState]) => [
                contract,
                {
                    last_processed_block: contractState.lastProcessedBlock,
                    ownership: Object.fromEntries(
                        Array.from(contractState.ownershipMap.entries()).map(([owner, tokenIds]) => [owner, Array.from(tokenIds)])
                    )
                }
            ])
        ),
        marketplace: {
            last_processed_block: marketplaceState.lastProcessedBlock,
            listings: Object.fromEntries(
                Array.from(marketplaceState.listings.entries()).map(([contract, tokenMap]) => [
                    contract,
                    Object.fromEntries(
                        Array.from(tokenMap.entries()).map(([tokenId, details]) => [tokenId, details])
                    )
                ])
            )
        }
    };
    // Unique per-write name so concurrent writes can't corrupt each other's rename.
    const tmp = `${STATE_FILE}.${process.pid}.${saveCounter++}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(json, null, 2));
    await fs.promises.rename(tmp, STATE_FILE);
    console.log(`State saved`);
}

async function rpcFetch(body: object): Promise<any> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            lastError = error;
            if (attempt < MAX_FETCH_ATTEMPTS) {
                const backoff = 500 * 2 ** (attempt - 1);
                console.warn(`RPC fetch attempt ${attempt}/${MAX_FETCH_ATTEMPTS} failed: ${error}. Retrying in ${backoff}ms`);
                await new Promise(resolve => setTimeout(resolve, backoff));
            }
        } finally {
            clearTimeout(timer);
        }
    }
    throw new Error(`RPC fetch failed after ${MAX_FETCH_ATTEMPTS} attempts: ${lastError}`);
}

async function getLatestBlockNumber(): Promise<number> {
    const data = await rpcFetch({
        id: 1,
        jsonrpc: "2.0",
        method: "starknet_blockNumber"
    });
    if ('error' in data) {
        throw new Error(`API Error: ${JSON.stringify(data.error)}`);
    }
    const latest = data.result;
    // Guard against garbage RPC responses poisoning the range math downstream.
    if (typeof latest !== 'number' || !Number.isInteger(latest) || !Number.isFinite(latest)) {
        throw new Error(`Invalid block number from RPC: ${JSON.stringify(latest)}`);
    }
    return latest;
}

async function getEventsInRange(fromBlock: number, toBlock: number, contractAddress: string, keys: string[][]): Promise<StarkNetEvent[]> {
    const allEvents: StarkNetEvent[] = [];

    for (let chunkFrom = fromBlock; chunkFrom <= toBlock; chunkFrom += MAX_BLOCK_RANGE) {
        const chunkTo = Math.min(chunkFrom + MAX_BLOCK_RANGE - 1, toBlock);
        let continuationToken: string | undefined = undefined;

        do {
            const data: EventsResponse = await rpcFetch({
                id: 1,
                jsonrpc: "2.0",
                method: "starknet_getEvents",
                params: [{
                    "from_block": { "block_number": chunkFrom },
                    "to_block": { "block_number": chunkTo },
                    "address": contractAddress,
                    "keys": keys,
                    "chunk_size": 1000,
                    ...(continuationToken && { "continuation_token": continuationToken })
                }]
            });
            if ("error" in data) {
                throw new Error(`API Error: ${JSON.stringify(data.error)}`);
            }
            if (!data.result) {
                throw new Error(`No result for block range ${chunkFrom}-${chunkTo}, contract ${contractAddress}`);
            }

            allEvents.push(...data.result.events);
            continuationToken = data.result.continuation_token;
        } while (continuationToken);
    }

    return allEvents;
}

async function updateState() {
    if (running) {
        console.log('Update already in progress, skipping this tick');
        return;
    }
    running = true;
    try {
        const latestBlock = await getLatestBlockNumber();
        console.log(`Latest block: ${latestBlock}`);

        // Reorg safety: index only up to the confirmed tip, never the raw tip.
        const targetBlock = latestBlock - CONFIRMATIONS;
        if (targetBlock < 0) {
            console.log(`Latest block ${latestBlock} is below confirmation depth ${CONFIRMATIONS}, skipping cycle`);
            initialized = true;
            return;
        }

        const marketplaceFromBlock = marketplaceState.lastProcessedBlock + 1;
        // Skip when no new confirmed blocks; never let the cursor regress.
        const marketplaceHasNewBlocks = targetBlock > marketplaceState.lastProcessedBlock;
        let marketplaceEvents: StarkNetEvent[] = [];
        if (marketplaceHasNewBlocks) {
            console.log(`Fetching marketplace events from block ${marketplaceFromBlock} to ${targetBlock}`);
            marketplaceEvents = await getEventsInRange(marketplaceFromBlock, targetBlock, MARKETPLACE_ADDRESS, [[LIST_ORDER_EVENT_KEY, DELIST_ORDER_EVENT_KEY]]);
        }

        const nftContracts = Array.from(contractsState.keys());
        const eventPromises = nftContracts.map(contract => {
            const fromBlock = contractsState.get(contract)!.lastProcessedBlock + 1;
            if (targetBlock < fromBlock) {
                return Promise.resolve([] as StarkNetEvent[]);
            }
            return getEventsInRange(fromBlock, targetBlock, contract, [[TRANSFER_EVENT_KEY]]);
        });
        const allEvents = await Promise.all(eventPromises);

        for (const event of marketplaceEvents) {
            try {
                if (!event.keys || event.keys.length < 3) {
                    console.warn(`Skipping malformed marketplace event (keys): ${JSON.stringify(event.keys)}`);
                    continue;
                }
                const eventKey = event.keys[0].toLowerCase();

                const contractAddress = normalizeAddress(event.keys[1]);
                if (!CONTRACTS[contractAddress] || CONTRACTS[contractAddress].type !== 'nft') continue;
                const tokenIdHex = event.keys[2];
                const tokenId = BigInt(tokenIdHex).toString();

                if (eventKey === LIST_ORDER_EVENT_KEY) {
                    if (!event.data || event.data.length < 5) {
                        console.warn(`Skipping malformed LIST event (data) for token ${tokenId} on ${contractAddress}`);
                        continue;
                    }
                    const priceHex = event.data[0];
                    const price = BigInt(priceHex).toString();
                    const paymentToken = event.data[2].toLowerCase();
                    const expirationTimestampHex = event.data[3];
                    const expirationTimestamp = BigInt(expirationTimestampHex).toString();
                    const owner = normalizeAddress(event.data[4]);

                    if (!marketplaceState.listings.has(contractAddress)) {
                        marketplaceState.listings.set(contractAddress, new Map());
                    }
                    const tokenMap = marketplaceState.listings.get(contractAddress)!;
                    tokenMap.set(tokenId, {
                        price,
                        paymentToken,
                        expirationTimestamp,
                        owner,
                        block_number: event.block_number
                    });
                } else if (eventKey === DELIST_ORDER_EVENT_KEY) {
                    const tokenMap = marketplaceState.listings.get(contractAddress);
                    if (tokenMap) {
                        tokenMap.delete(tokenId);
                        if (tokenMap.size === 0) {
                            marketplaceState.listings.delete(contractAddress);
                        }
                    }
                }
            } catch (error) {
                console.warn(`Skipping malformed marketplace event: ${error}`);
                continue;
            }
        }
        if (marketplaceHasNewBlocks) {
            marketplaceState.lastProcessedBlock = Math.max(marketplaceState.lastProcessedBlock, targetBlock);
            console.log(`Updated marketplace state up to block ${targetBlock}. Total listings: ${Array.from(marketplaceState.listings.values()).reduce((sum, m) => sum + m.size, 0)}`);
        }

        nftContracts.forEach((contract, index) => {
            const contractState = contractsState.get(contract)!;
            if (targetBlock <= contractState.lastProcessedBlock) {
                console.log(`No new blocks for contract ${contract}`);
                return;
            }
            const events = allEvents[index];
            if (events.length === 0) {
                console.log(`No new events for contract ${contract}`);
                contractState.lastProcessedBlock = Math.max(contractState.lastProcessedBlock, targetBlock);
                return;
            }
            for (const event of events) {
                try {
                    if (!event.keys || event.keys.length < 5) {
                        console.warn(`Skipping malformed transfer event (keys) on ${contract}: ${JSON.stringify(event.keys)}`);
                        continue;
                    }
                    const from = normalizeAddress(event.keys[1]);
                    const to = normalizeAddress(event.keys[2]);
                    const tokenIdLow = BigInt(event.keys[3]);
                    const tokenIdHigh = BigInt(event.keys[4]);
                    const tokenId = (tokenIdHigh << 128n) + tokenIdLow;
                    const tokenIdStr = tokenId.toString();

                    if (from !== ZERO_ADDRESS) {
                        const fromSet = contractState.ownershipMap.get(from);
                        if (fromSet) {
                            fromSet.delete(tokenIdStr);
                            if (fromSet.size === 0) {
                                contractState.ownershipMap.delete(from);
                            }
                        }
                    }
                    if (to !== ZERO_ADDRESS) {
                        if (!contractState.ownershipMap.has(to)) {
                            contractState.ownershipMap.set(to, new Set());
                        }
                        contractState.ownershipMap.get(to)!.add(tokenIdStr);
                    }

                    const listingContractMap = marketplaceState.listings.get(contract);
                    if (listingContractMap && listingContractMap.has(tokenIdStr)) {
                        const listingBlock = listingContractMap.get(tokenIdStr)!.block_number;
                        const transferBlock = event.block_number;
                        if (listingBlock < transferBlock) {
                            console.log(`Removing listing for token ${tokenIdStr} on contract ${contract} due to transfer`);
                            listingContractMap.delete(tokenIdStr);
                            if (listingContractMap.size === 0) {
                                marketplaceState.listings.delete(contract);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Skipping malformed transfer event on ${contract}: ${error}`);
                    continue;
                }
            }
            contractState.lastProcessedBlock = Math.max(contractState.lastProcessedBlock, targetBlock);
            console.log(`Updated state for contract ${contract} up to block ${targetBlock}. Ownership map size: ${contractState.ownershipMap.size}`);
        });

        await saveState();
        initialized = true;
    } catch (error) {
        // Cursor not advanced; next tick retries from the same point.
        console.error('Error updating state, aborting cycle (cursor not advanced):', error);
    } finally {
        running = false;
    }
}

app.get('/health', (req, res) => {
    const contracts = Array.from(contractsState.entries()).map(([contract, s]) => ({
        contract,
        lastProcessedBlock: s.lastProcessedBlock
    }));
    res.json({
        status: initialized ? 'ready' : 'starting',
        syncing: running,
        confirmations: CONFIRMATIONS,
        marketplace: { lastProcessedBlock: marketplaceState.lastProcessedBlock },
        contracts
    });
});

app.get('/owned/:contract/:address', (req, res) => {
    const contract = normalizeAddress(req.params.contract);
    const address = normalizeAddress(req.params.address);
    if (!contractsState.has(contract)) {
        res.status(404).json({ error: 'Contract not found' });
        return;
    }
    const contractState = contractsState.get(contract)!;
    const tokenIds = contractState.ownershipMap.get(address) || new Set<string>();
    const sortedTokenIds = Array.from(tokenIds).sort((a, b) => BigInt(a) > BigInt(b) ? 1 : -1);
    res.json(sortedTokenIds);
});

app.get('/listing/collection/:contract/:tokenId', (req, res) => {
    const contract = normalizeAddress(req.params.contract);
    const tokenId = req.params.tokenId;
    const tokenMap = marketplaceState.listings.get(contract);
    if (tokenMap && tokenMap.has(tokenId)) {
        res.json(tokenMap.get(tokenId));
    } else {
        res.status(404).json({ error: 'Listing not found' });
    }
});

app.get('/listing/collection/:contract', (req, res) => {
    const contract = normalizeAddress(req.params.contract);
    const tokenMap = marketplaceState.listings.get(contract);
    if (tokenMap) {
        const listings = Array.from(tokenMap.entries()).map(([tokenId, details]) => ({ tokenId, details }));
        res.json(listings);
    } else {
        // answer with empty array if no listings
        res.json([]);
    }
});

app.get('/listing/owner/:address', (req, res) => {
    const address = normalizeAddress(req.params.address);
    const listings: { contract: string, tokenId: string, details: ListingDetails }[] = [];
    for (const [contract, tokenMap] of marketplaceState.listings.entries()) {
        for (const [tokenId, details] of tokenMap.entries()) {
            if (details.owner === address) {
                listings.push({ contract, tokenId, details });
            }
        }
    }
    res.json(listings);
});

async function main() {
    const state = loadState();
    contractsState = state.contracts;
    marketplaceState = state.marketplace;
    console.log(`Loaded state for ${contractsState.size} contracts and marketplace`);

    // Serve immediately so /health is probeable; backfill runs in the background.
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

    updateState();
    setInterval(updateState, 20 * 1000);
}

main().catch(error => console.error('Main error:', error));