import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Tentative 1 : Yahoo Finance autocomplete (endpoint alternatif)
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&listsCount=0&enableFuzzyQuery=true&enableCb=false&enableNavLinks=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://finance.yahoo.com/",
        "Origin": "https://finance.yahoo.com",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
      },
    });

    if (res.ok) {
      const data = await res.json();
      const quotes: any[] = data?.quotes ?? [];
      const results = quotes
        .filter(item => item.symbol && ["EQUITY","ETF","CRYPTOCURRENCY","MUTUALFUND","INDEX"].includes(item.quoteType))
        .slice(0, 8)
        .map(item => ({
          ticker: item.symbol,
          name: item.longname || item.shortname || item.symbol,
          exchange: item.exchDisp || item.exchange || "",
          type: item.quoteType === "CRYPTOCURRENCY" ? "Crypto" : "Bourse",
          typeLabel: item.quoteType === "ETF" ? "ETF" : item.quoteType === "CRYPTOCURRENCY" ? "Crypto" : item.quoteType === "MUTUALFUND" ? "Fonds" : "Action",
        }));
      if (results.length > 0) return NextResponse.json({ results });
    }
  } catch (_) {}

  // Tentative 2 : endpoint query1
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com/",
      },
    });
    if (res.ok) {
      const data = await res.json();
      const quotes: any[] = data?.quotes ?? [];
      const results = quotes
        .filter(item => item.symbol && ["EQUITY","ETF","CRYPTOCURRENCY","MUTUALFUND"].includes(item.quoteType))
        .slice(0, 8)
        .map(item => ({
          ticker: item.symbol,
          name: item.longname || item.shortname || item.symbol,
          exchange: item.exchDisp || item.exchange || "",
          type: item.quoteType === "CRYPTOCURRENCY" ? "Crypto" : "Bourse",
          typeLabel: item.quoteType === "ETF" ? "ETF" : item.quoteType === "CRYPTOCURRENCY" ? "Crypto" : item.quoteType === "MUTUALFUND" ? "Fonds" : "Action",
        }));
      if (results.length > 0) return NextResponse.json({ results });
    }
  } catch (_) {}

  // Fallback statique étendu — CAC 40 complet + ETF + Crypto
  const STATIC = [
    // CAC 40 complet
    { ticker: "AI.PA",    name: "Air Liquide S.A.",                    exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "AIR.PA",   name: "Airbus SE",                           exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "ALO.PA",   name: "Alstom S.A.",                         exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "MT.AS",    name: "ArcelorMittal S.A.",                  exchange: "Euronext",       type: "Bourse", typeLabel: "Action" },
    { ticker: "CS.PA",    name: "AXA S.A.",                            exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "BNP.PA",   name: "BNP Paribas S.A.",                   exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "EN.PA",    name: "Bouygues S.A.",                       exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "CAP.PA",   name: "Capgemini SE",                        exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "CA.PA",    name: "Carrefour S.A.",                      exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "ACA.PA",   name: "Crédit Agricole S.A.",                exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "BN.PA",    name: "Danone S.A.",                         exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "DSY.PA",   name: "Dassault Systèmes SE",               exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "ENGI.PA",  name: "Engie S.A.",                          exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "EL.PA",    name: "EssilorLuxottica S.A.",               exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "ERF.PA",   name: "Eurofins Scientific SE",              exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "RMS.PA",   name: "Hermès International S.A.",           exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "KER.PA",   name: "Kering S.A.",                         exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "LR.PA",    name: "Legrand S.A.",                        exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "OR.PA",    name: "L'Oréal S.A.",                        exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "MC.PA",    name: "LVMH Moët Hennessy Louis Vuitton",   exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "ML.PA",    name: "Michelin S.C.A.",                     exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "ORA.PA",   name: "Orange S.A.",                         exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "RI.PA",    name: "Pernod Ricard S.A.",                  exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "PUB.PA",   name: "Publicis Groupe S.A.",                exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "RNO.PA",   name: "Renault S.A.",                        exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "SAF.PA",   name: "Safran S.A.",                         exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "SGO.PA",   name: "Saint-Gobain S.A.",                   exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "SAN.PA",   name: "Sanofi S.A.",                         exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "SU.PA",    name: "Schneider Electric SE",               exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "GLE.PA",   name: "Société Générale S.A.",               exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "STLAP.PA", name: "Stellantis N.V.",                     exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "STM.PA",   name: "STMicroelectronics N.V.",             exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "TEP.PA",   name: "Teleperformance SE",                  exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "HO.PA",    name: "Thales S.A.",                         exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "TTE.PA",   name: "TotalEnergies SE",                    exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "URW.PA",   name: "Unibail-Rodamco-Westfield SE",        exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "VIE.PA",   name: "Veolia Environnement S.A.",           exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "DG.PA",    name: "Vinci S.A.",                          exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "VIV.PA",   name: "Vivendi SE",                          exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "WLN.PA",   name: "Worldline S.A.",                      exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    // Grandes valeurs hors CAC
    { ticker: "CNP.PA",   name: "CNP Assurances",                      exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "COFA.PA",  name: "Coface S.A.",                         exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "DBG.PA",   name: "Dior (Christian Dior SE)",            exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    { ticker: "FP.PA",    name: "TotalEnergies (FP)",                  exchange: "Euronext Paris", type: "Bourse", typeLabel: "Action" },
    // Actions US
    { ticker: "AAPL",     name: "Apple Inc.",                           exchange: "NASDAQ",         type: "Bourse", typeLabel: "Action" },
    { ticker: "MSFT",     name: "Microsoft Corporation",                exchange: "NASDAQ",         type: "Bourse", typeLabel: "Action" },
    { ticker: "GOOGL",    name: "Alphabet Inc. (Google)",               exchange: "NASDAQ",         type: "Bourse", typeLabel: "Action" },
    { ticker: "AMZN",     name: "Amazon.com Inc.",                      exchange: "NASDAQ",         type: "Bourse", typeLabel: "Action" },
    { ticker: "NVDA",     name: "NVIDIA Corporation",                   exchange: "NASDAQ",         type: "Bourse", typeLabel: "Action" },
    { ticker: "META",     name: "Meta Platforms (Facebook)",            exchange: "NASDAQ",         type: "Bourse", typeLabel: "Action" },
    { ticker: "TSLA",     name: "Tesla Inc.",                           exchange: "NASDAQ",         type: "Bourse", typeLabel: "Action" },
    { ticker: "JPM",      name: "JPMorgan Chase & Co.",                 exchange: "NYSE",           type: "Bourse", typeLabel: "Action" },
    { ticker: "V",        name: "Visa Inc.",                            exchange: "NYSE",           type: "Bourse", typeLabel: "Action" },
    { ticker: "WMT",      name: "Walmart Inc.",                         exchange: "NYSE",           type: "Bourse", typeLabel: "Action" },
    { ticker: "JNJ",      name: "Johnson & Johnson",                    exchange: "NYSE",           type: "Bourse", typeLabel: "Action" },
    { ticker: "MA",       name: "Mastercard Inc.",                      exchange: "NYSE",           type: "Bourse", typeLabel: "Action" },
    { ticker: "PG",       name: "Procter & Gamble Co.",                 exchange: "NYSE",           type: "Bourse", typeLabel: "Action" },
    { ticker: "HD",       name: "The Home Depot Inc.",                  exchange: "NYSE",           type: "Bourse", typeLabel: "Action" },
    // ETF populaires
    { ticker: "IWDA.AS",  name: "iShares Core MSCI World ETF",          exchange: "Amsterdam",      type: "Bourse", typeLabel: "ETF"    },
    { ticker: "CW8.PA",   name: "Amundi MSCI World ETF",                exchange: "Euronext Paris", type: "Bourse", typeLabel: "ETF"    },
    { ticker: "VWCE.DE",  name: "Vanguard FTSE All-World ETF (Acc)",    exchange: "XETRA",          type: "Bourse", typeLabel: "ETF"    },
    { ticker: "CSPX.L",   name: "iShares Core S&P 500 ETF",             exchange: "London",         type: "Bourse", typeLabel: "ETF"    },
    { ticker: "SP500.PA", name: "Amundi S&P 500 ETF",                   exchange: "Euronext Paris", type: "Bourse", typeLabel: "ETF"    },
    { ticker: "QQQ",      name: "Invesco QQQ Trust (NASDAQ 100)",       exchange: "NASDAQ",         type: "Bourse", typeLabel: "ETF"    },
    { ticker: "SPY",      name: "SPDR S&P 500 ETF Trust",               exchange: "NYSE",           type: "Bourse", typeLabel: "ETF"    },
    { ticker: "PAEEM.PA", name: "Amundi MSCI Emerging Markets ETF",     exchange: "Euronext Paris", type: "Bourse", typeLabel: "ETF"    },
    { ticker: "PANX.PA",  name: "Amundi NASDAQ-100 ETF",                exchange: "Euronext Paris", type: "Bourse", typeLabel: "ETF"    },
    { ticker: "LYXCAC.PA",name: "Lyxor CAC 40 ETF",                    exchange: "Euronext Paris", type: "Bourse", typeLabel: "ETF"    },
    // Crypto
    { ticker: "BTC-USD",  name: "Bitcoin",                              exchange: "Crypto",         type: "Crypto", typeLabel: "Crypto" },
    { ticker: "ETH-USD",  name: "Ethereum",                             exchange: "Crypto",         type: "Crypto", typeLabel: "Crypto" },
    { ticker: "SOL-USD",  name: "Solana",                               exchange: "Crypto",         type: "Crypto", typeLabel: "Crypto" },
    { ticker: "BNB-USD",  name: "BNB (Binance)",                        exchange: "Crypto",         type: "Crypto", typeLabel: "Crypto" },
    { ticker: "XRP-USD",  name: "XRP (Ripple)",                         exchange: "Crypto",         type: "Crypto", typeLabel: "Crypto" },
    { ticker: "ADA-USD",  name: "Cardano",                              exchange: "Crypto",         type: "Crypto", typeLabel: "Crypto" },
    { ticker: "DOGE-USD", name: "Dogecoin",                             exchange: "Crypto",         type: "Crypto", typeLabel: "Crypto" },
    { ticker: "DOT-USD",  name: "Polkadot",                             exchange: "Crypto",         type: "Crypto", typeLabel: "Crypto" },
    { ticker: "AVAX-USD", name: "Avalanche",                            exchange: "Crypto",         type: "Crypto", typeLabel: "Crypto" },
    { ticker: "MATIC-USD",name: "Polygon (MATIC)",                      exchange: "Crypto",         type: "Crypto", typeLabel: "Crypto" },
    // Métaux précieux — ETF
    { ticker: "GLD",      name: "SPDR Gold Shares ETF",                 exchange: "NYSE",           type: "Bourse", typeLabel: "ETF"    },
    { ticker: "IAU",      name: "iShares Gold Trust ETF",               exchange: "NYSE",           type: "Bourse", typeLabel: "ETF"    },
    { ticker: "SLV",      name: "iShares Silver Trust ETF",             exchange: "NYSE",           type: "Bourse", typeLabel: "ETF"    },
    { ticker: "SIVR",     name: "Aberdeen Standard Physical Silver ETF",exchange: "NYSE",           type: "Bourse", typeLabel: "ETF"    },
    { ticker: "PPLT",     name: "Aberdeen Standard Physical Platinum ETF",exchange: "NYSE",         type: "Bourse", typeLabel: "ETF"    },
    { ticker: "PALL",     name: "Aberdeen Standard Physical Palladium ETF",exchange: "NYSE",        type: "Bourse", typeLabel: "ETF"    },
    { ticker: "PHAU.L",   name: "WisdomTree Physical Gold ETC",         exchange: "London",         type: "Bourse", typeLabel: "ETF"    },
    { ticker: "PHAG.L",   name: "WisdomTree Physical Silver ETC",       exchange: "London",         type: "Bourse", typeLabel: "ETF"    },
    { ticker: "PHPT.L",   name: "WisdomTree Physical Platinum ETC",     exchange: "London",         type: "Bourse", typeLabel: "ETF"    },
    { ticker: "PHPM.L",   name: "WisdomTree Physical Precious Metals ETC",exchange: "London",       type: "Bourse", typeLabel: "ETF"    },
    { ticker: "SGOL",     name: "Aberdeen Standard Physical Gold ETF",  exchange: "NYSE",           type: "Bourse", typeLabel: "ETF"    },
    { ticker: "GC=F",     name: "Or (Gold Futures)",                    exchange: "COMEX",          type: "Bourse", typeLabel: "ETF"    },
    { ticker: "SI=F",     name: "Argent (Silver Futures)",              exchange: "COMEX",          type: "Bourse", typeLabel: "ETF"    },
  ];

  const qLower = q.toLowerCase();
  const filtered = STATIC.filter(a =>
    a.name.toLowerCase().includes(qLower) ||
    a.ticker.toLowerCase().includes(qLower)
  ).slice(0, 8);

  return NextResponse.json({ results: filtered });
}