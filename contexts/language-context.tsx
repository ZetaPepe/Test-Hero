"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

type Language = "en" | "zh"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  en: {
    // Web3 Wallet
    connectWallet: "Connect Wallet",
    walletConnected: "Connected",
    disconnect: "Disconnect",
    switchNetwork: "Switch to X Layer",
    wrongNetwork: "Wrong Network",
    connectingWallet: "Connecting...",
    walletError: "Connection Failed",

    // HeroX Presale
    presaleTitle: "HeroX Presale",
    presaleSubtitle: "Join the exclusive presale and get early access to $HeroX tokens",
    okbAmount: "OKB Amount",
    minimumOkb: "Minimum: 0.1 OKB",
    maximumOkb: "Maximum: 3 OKB",
    mint: "Mint",
    minting: "Minting...",
    connectWalletFirst: "Connect Wallet First",
    invalidAmount: "Amount must be between 0.1 and 3 OKB",
    mintSuccess: "Mint successful!",
    mintError: "Mint failed. Please try again.",
    presaleConnectNotice: "Connect your wallet using the button in the top-right corner to participate in the presale.",

    // HeroX Hero Section
    heroTitle: "Jump, Dodge, Collect. Earn $HeroX.",
    heroSubtitle: "A fun cowboy runner on XlayerChain — play, score, and get rewarded.",
    heroPlayButton: "Play Now",

    // Gameplay Section
    gameplayTitle: "How to Play",
    gameplaySubtitle: "Gameplay",
    gameplayRule1: "Jump over cactuses.",
    gameplayRule2: "Touch reward items to gain extra points.",
    gameplayRule3: "The longer you survive, the higher your score.",
    gameplayGoal: "Get the highest score possible.",

    // Leaderboard Section
    leaderboardTitle: "Leaderboard",
    leaderboardSubtitle: "Format: One global leaderboard.",
    leaderboardFormat: "One Global Leaderboard",
    leaderboardDisplay: "Rank • Player • Score",
    leaderboardRewards: "Top Scorers Earn $HeroX",
    leaderboardRank: "Rank",
    leaderboardPlayer: "Player",
    leaderboardScore: "Score",
    leaderboardTokens: "Tokens",
    leaderboardTopPlayer: "Champion",
    leaderboardElite: "Elite Player",
    leaderboardRising: "Rising Star",

    // Token Section
    tokenTitle: "Token ($HeroX)",
    tokenSubtitle:
      "Ticker: $HeroX • Distribution: 15% Game + Community Rewards • 85% Liquidity + Presale • Utility: Rewards for top players, future expansions.",
    tokenTicker: "$HeroX Token",
    tokenChain: "Built on XlayerChain",
    tokenTotalSupply: "Total Supply",
    tokenSupplyAmount: "1,000,000,000",
    tokenDistributionTitle: "Token Distribution",
    tokenTeamPercent: "15% Game + Community Rewards",
    tokenLiquidityPercent: "85% Liquidity + Presale",
    tokenUtilityTitle: "Token Utility",
    tokenUtilityRewards: "Player Rewards",
    tokenUtilityExpansions: "Future Expansions",
    tokenUtilityGovernance: "Community Governance",
    tokenEarnMore: "Start playing now to earn $HeroX tokens!",

    // Roadmap Section
    roadmapTitle: "Roadmap",
    roadmapSubtitle: "Our journey to revolutionize cowboy gaming with blockchain technology",
    gameRoadmapTitle: "🎮 Game Roadmap",
    tokenRoadmapTitle: "💰 Token Roadmap",
    gamePhase1: "Launch the basic cowboy parkour game (cactus + reward items).",
    gamePhase2: "Add a global leaderboard and offer $HeroX rewards.",
    gamePhase3: "Introduce more obstacles, items, and skins.",
    tokenPhase1: "Deploy the $HeroX contract on XlayerChain.",
    tokenPhase2: "Increase liquidity and launch trading.",
    tokenPhase3: "List on major decentralized exchanges (DEX) and apply for listing on centralized exchanges (CEX).",
    tokenPhase4: "Expand token functionality (skins, NFT market, governance).",

    // Menu
    howToPlay: "How to Play?",
    desktop: "Desktop",
    mobile: "Mobile",
    spaceToJump: "SPACE to jump, ↓ for fast descent",
    tapToJump: "Tap screen to jump",
    doubleJump: "Double jump available",
    collectItems: "Collect items for +100 points",
    avoidCactus: "Avoid cacti",
    playButton: "🐎 PLAY!",
    highScores: "🏆 High Scores",
    firstToPlay: "Be the first to play!",

    // Game
    score: "Score",
    spaceJump: "SPACE: Jump | ↓: Descent",
    tapScreenToJump: "Tap screen to jump",

    // Game Over
    gameOver: "💥 GAME OVER",
    finalScore: "Final Score",
    newRecord: "🎉 New personal record!",
    playAgain: "🔄 Play Again",
    mainMenu: "🏠 Main Menu",

    // Loading
    loading: "Loading Galope Libertador...",

    // Rotate screen
    rotatePhone: "Rotate Phone",
    rotateMessage: "Please rotate your device to landscape mode to play",
  },
  zh: {
    // Web3 Wallet
    connectWallet: "连接钱包",
    walletConnected: "已连接",
    disconnect: "断开连接",
    switchNetwork: "切换到 X Layer",
    wrongNetwork: "网络错误",
    connectingWallet: "连接中...",
    walletError: "连接失败",

    // HeroX Presale
    presaleTitle: "HeroX 预售",
    presaleSubtitle: "加入独家预售，抢先获得 $HeroX 代币",
    okbAmount: "OKB 数量",
    minimumOkb: "最小值：0.1 OKB",
    maximumOkb: "最大值：3 OKB",
    mint: "铸造",
    minting: "铸造中...",
    connectWalletFirst: "请先连接钱包",
    invalidAmount: "数量必须在 0.1 到 3 OKB 之间",
    mintSuccess: "铸造成功！",
    mintError: "铸造失败，请重试。",
    presaleConnectNotice: "请使用右上角的按钮连接您的钱包以参与预售。",

    // HeroX Hero Section
    heroTitle: "跳跃、躲避、收集。赚取 $HeroX。",
    heroSubtitle: "在 XlayerChain 上的有趣牛仔跑酷游戏 — 游戏、得分、获得奖励。",
    heroPlayButton: "立即游戏",

    // Gameplay Section
    gameplayTitle: "游戏玩法",
    gameplaySubtitle: "游戏规则",
    gameplayRule1: "跳过仙人掌。",
    gameplayRule2: "触碰奖励物品获得额外分数。",
    gameplayRule3: "生存时间越长，分数越高。",
    gameplayGoal: "获得尽可能高的分数。",

    // Leaderboard Section
    leaderboardTitle: "排行榜",
    leaderboardSubtitle: "格式：一个全球排行榜。",
    leaderboardFormat: "全球统一排行榜",
    leaderboardDisplay: "排名 • 玩家 • 分数",
    leaderboardRewards: "顶级玩家赚取 $HeroX",
    leaderboardRank: "排名",
    leaderboardPlayer: "玩家",
    leaderboardScore: "分数",
    leaderboardTokens: "代币",
    leaderboardTopPlayer: "冠军",
    leaderboardElite: "精英玩家",
    leaderboardRising: "新星",

    // Token Section
    tokenTitle: "代币 ($HeroX)",
    tokenSubtitle: "代币：$HeroX • 分配：15% 团队 • 85% 流动性 • 用途：顶级玩家奖励，未来扩展。",
    tokenTicker: "$HeroX 代币",
    tokenChain: "基于 XlayerChain 构建",
    tokenTotalSupply: "总供应量",
    tokenSupplyAmount: "1,000,000,000",
    tokenDistributionTitle: "代币分配",
    tokenTeamPercent: "15% 游戏➕社区奖励",
    tokenLiquidityPercent: "85% 流动性➕预售",
    tokenUtilityTitle: "代币用途",
    tokenUtilityRewards: "玩家奖励",
    tokenUtilityExpansions: "未来扩展",
    tokenUtilityGovernance: "社区治理",
    tokenEarnMore: "立即开始游戏赚取 $HeroX 代币！",

    // Roadmap Section
    roadmapTitle: "路线图",
    roadmapSubtitle: "我们用区块链技术革新牛仔游戏的旅程",
    gameRoadmapTitle: "🎮 游戏路线图",
    tokenRoadmapTitle: "💰 代币路线图",
    gamePhase1: "推出基础牛仔跑酷游戏（仙人掌 + 奖励物品）。",
    gamePhase2: "添加全球排行榜并提供 $HeroX 奖励。",
    gamePhase3: "引入更多障碍物、物品和皮肤。",
    tokenPhase1: "在 XlayerChain 上部署 $HeroX 合约。",
    tokenPhase2: "增加流动性并启动交易。",
    tokenPhase3: "在主要去中心化交易所（DEX）上市并申请中心化交易所（CEX）上市。",
    tokenPhase4: "扩展代币功能（皮肤、NFT 市场、治理）。",

    // Menu
    howToPlay: "如何游戏？",
    desktop: "桌面端",
    mobile: "移动端",
    spaceToJump: "空格键跳跃，↓ 快速下降",
    tapToJump: "点击屏幕跳跃",
    doubleJump: "可以二段跳",
    collectItems: "收集物品获得 +100 分",
    avoidCactus: "避开仙人掌",
    playButton: "🐎 开始游戏！",
    highScores: "🏆 最高分",
    firstToPlay: "成为第一个玩家！",

    // Game
    score: "分数",
    spaceJump: "空格键：跳跃 | ↓：下降",
    tapScreenToJump: "点击屏幕跳跃",

    // Game Over
    gameOver: "💥 游戏结束",
    finalScore: "最终分数",
    newRecord: "🎉 新的个人记录！",
    playAgain: "🔄 再玩一次",
    mainMenu: "🏠 主菜单",

    // Loading
    loading: "加载高卓解放者中...",

    // Rotate screen
    rotatePhone: "旋转手机",
    rotateMessage: "请将设备旋转至横屏模式以开始游戏",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en") // Default to English

  useEffect(() => {
    // Load saved language preference
    const saved = localStorage.getItem("galope-libertador-language")
    if (saved && (saved === "en" || saved === "zh")) {
      setLanguage(saved as Language)
    }
  }, [])

  useEffect(() => {
    // Save language preference
    localStorage.setItem("galope-libertador-language", language)

    // Update HTML lang attribute
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en"
  }, [language])

  const t = (key: string): string => {
    return translations[language][key as keyof (typeof translations)[typeof language]] || key
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
