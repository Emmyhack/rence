export interface ChainTvl {
  name: string
  tvl: number
}

export interface YieldPool {
  pool: string
  chain: string
  project: string
  symbol: string
  apy: number
  tvlUsd: number
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}`)
  return res.json()
}

export async function fetchKaiaChainTvl(): Promise<number | null> {
  try {
    const chains: ChainTvl[] = await fetchJson('https://api.llama.fi/v2/chains')
    // DefiLlama still uses Klaytn as chain name for Kaia
    const entry = chains.find(c => c.name.toLowerCase() === 'klaytn' || c.name.toLowerCase() === 'kaia')
    return entry ? entry.tvl : null
  } catch {
    return null
  }
}

export async function fetchTopKaiaYields(limit = 5): Promise<YieldPool[]> {
  try {
    const data = await fetchJson<{ data: YieldPool[] }>('https://yields.llama.fi/pools')
    const pools = (data.data || [])
      .filter(p => (p.chain?.toLowerCase?.() === 'klaytn' || p.chain?.toLowerCase?.() === 'kaia') && p.apy && p.tvlUsd)
      .sort((a, b) => b.tvlUsd - a.tvlUsd)
      .slice(0, limit)
    return pools
  } catch {
    return []
  }
}