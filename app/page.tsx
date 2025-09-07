"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { Card } from "@/components/ui/card"
import HeroXPresale from "@/components/herox-presale"

interface GameObject {
  x: number
  y: number
  width: number
  height: number
  type: "obstacle" | "collectible"
  variant?: number
  collectibleType?: string
}

interface HighScore {
  score: number
  date: string
}

interface FloatingScore {
  id: number
  x: number
  y: number
  opacity: number
  offsetY: number
}

const getGameConfig = () => ({
  CANVAS_WIDTH: 1200,
  CANVAS_HEIGHT: 600,
  GROUND_HEIGHT: 100,
  PLAYER_WIDTH: 80,
  PLAYER_HEIGHT: 80,
  GRAVITY: 0.8,
  JUMP_FORCE: -15,
  GAME_SPEED: 5,
  OBSTACLE_SPAWN_RATE: 0.012,
  COLLECTIBLE_SPAWN_RATE: 0.008,
})

export default function GalopeLibertador() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const audioRef = useRef<HTMLAudioElement>(null)
  const backgroundImageRef = useRef<HTMLImageElement>(null)
  const playerImagesRef = useRef<HTMLImageElement[]>([])
  const obstacleImagesRef = useRef(getGameConfig())
  const [isClient, setIsClient] = useState(false)
  const { language, setLanguage, t } = useLanguage()

  const [walletAddress, setWalletAddress] = useState<string>("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [walletError, setWalletError] = useState<string>("")
  const [okbAmount, setOkbAmount] = useState<string>("1.0")
  const [isMinting, setIsMinting] = useState(false)

  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">("menu")
  const [score, setScore] = useState(0)
  const [highScores, setHighScores] = useState<HighScore[]>([])
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([])
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 600 })
  const [isPortrait, setIsPortrait] = useState(false)
  const [wantsToPlayOnMobile, setWantsToPlayOnMobile] = useState(false)

  const [player, setPlayer] = useState({
    x: 100,
    y: 0,
    velocityY: 0,
    isJumping: false,
    canDoubleJump: true,
    spriteIndex: 0,
    animationCounter: 0,
  })

  const [gameObjects, setGameObjects] = useState<GameObject[]>([])
  const [backgroundX, setBackgroundX] = useState(0)

  const gameConfigRef = useRef(getGameConfig())

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 768
      const isPortraitMode = window.innerHeight > window.innerWidth
      setIsPortrait(isMobile && isPortraitMode)

      if (wantsToPlayOnMobile && isMobile && !isPortraitMode && gameState === "menu") {
        startGame()
        setWantsToPlayOnMobile(false)
      }
    }

    checkOrientation()
    window.addEventListener("resize", checkOrientation)
    window.addEventListener("orientationchange", checkOrientation)

    return () => {
      window.removeEventListener("resize", checkOrientation)
      window.removeEventListener("orientationchange", checkOrientation)
    }
  }, [isClient, wantsToPlayOnMobile, gameState])

  useEffect(() => {
    if (!isClient) return

    const updateCanvasSize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      setCanvasSize({ width, height })
      gameConfigRef.current.CANVAS_WIDTH = width
      gameConfigRef.current.CANVAS_HEIGHT = height

      setPlayer((prev) => ({
        ...prev,
        y: height - gameConfigRef.current.GROUND_HEIGHT - gameConfigRef.current.PLAYER_HEIGHT,
      }))
    }

    updateCanvasSize()
    window.addEventListener("resize", updateCanvasSize)

    backgroundImageRef.current = new Image()
    backgroundImageRef.current.src = "/images/background.jpeg"

    for (let i = 1; i <= 5; i++) {
      const img = new Image()
      img.src = `/images/guemes${i}.png`
      playerImagesRef.current[i - 1] = img
    }

    for (let i = 1; i <= 3; i++) {
      const img = new Image()
      img.src = `/images/cactus${i}.png`
      obstacleImagesRef.current[i - 1] = img
    }

    return () => {
      window.removeEventListener("resize", updateCanvasSize)
    }
  }, [isClient])

  useEffect(() => {
    if (!isClient || !audioRef.current) return

    audioRef.current.volume = 0.3
    audioRef.current.loop = true
  }, [isClient])

  const toggleMusic = useCallback(async () => {
    if (!isClient || !audioRef.current) return

    try {
      if (isMusicPlaying) {
        audioRef.current.pause()
        setIsMusicPlaying(false)
      } else {
        await audioRef.current.play()
        setIsMusicPlaying(true)
      }
    } catch (error) {
      console.log("Audio play failed:", error)
    }
  }, [isMusicPlaying, isClient])

  useEffect(() => {
    if (!isClient) return

    const startMusic = async () => {
      try {
        if (audioRef.current && !isMusicPlaying) {
          await audioRef.current.play()
          setIsMusicPlaying(true)
        }
      } catch (error) {
        console.log("Auto-play blocked")
      }
    }

    const timer = setTimeout(startMusic, 1000)
    return () => clearTimeout(timer)
  }, [isClient])

  useEffect(() => {
    if (!isClient) return

    try {
      const saved = localStorage.getItem("galope-libertador-scores")
      if (saved) {
        setHighScores(JSON.parse(saved))
      }
    } catch (error) {
      console.log("Error loading high scores:", error)
    }
  }, [isClient])

  const saveHighScore = useCallback(
    (newScore: number) => {
      if (!isClient) return

      const newHighScore: HighScore = {
        score: newScore,
        date: new Date().toLocaleDateString(),
      }

      const updatedScores = [...highScores, newHighScore].sort((a, b) => b.score - a.score).slice(0, 5)

      setHighScores(updatedScores)
      try {
        localStorage.setItem("galope-libertador-scores", JSON.stringify(updatedScores))
      } catch (error) {
        console.log("Error saving high scores:", error)
      }
    },
    [highScores, isClient],
  )

  const addFloatingScore = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random()
    setFloatingScores((prev) => [...prev, { id, x, y, opacity: 1, offsetY: 0 }])

    setTimeout(() => {
      setFloatingScores((prev) => prev.filter((score) => score.id !== id))
    }, 2000)
  }, [])

  useEffect(() => {
    if (!isClient || floatingScores.length === 0) return

    const interval = setInterval(() => {
      setFloatingScores((prev) =>
        prev
          .map((score) => ({
            ...score,
            opacity: score.opacity - 0.02,
            offsetY: score.offsetY - 2,
          }))
          .filter((score) => score.opacity > 0),
      )
    }, 16)

    return () => clearInterval(interval)
  }, [floatingScores.length, isClient])

  useEffect(() => {
    if (!isClient || gameState !== "playing") return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        setPlayer((prev) => {
          if (!prev.isJumping) {
            return {
              ...prev,
              velocityY: gameConfigRef.current.JUMP_FORCE,
              isJumping: true,
              canDoubleJump: true,
            }
          } else if (prev.canDoubleJump) {
            return {
              ...prev,
              velocityY: gameConfigRef.current.JUMP_FORCE,
              canDoubleJump: false,
            }
          }
          return prev
        })
      }

      if (e.code === "ArrowDown") {
        e.preventDefault()
        setPlayer((prev) => ({
          ...prev,
          velocityY: prev.isJumping ? 20 : prev.velocityY,
        }))
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [gameState, isClient])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      if (gameState !== "playing") return

      setPlayer((prev) => {
        if (!prev.isJumping) {
          return {
            ...prev,
            velocityY: gameConfigRef.current.JUMP_FORCE,
            isJumping: true,
            canDoubleJump: true,
          }
        } else if (prev.canDoubleJump) {
          return {
            ...prev,
            velocityY: gameConfigRef.current.JUMP_FORCE,
            canDoubleJump: false,
          }
        }
        return prev
      })
    },
    [gameState],
  )

  const checkCollision = useCallback((obj1: any, obj2: any) => {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    )
  }, [])

  useEffect(() => {
    if (!isClient || gameState !== "playing") return

    const gameLoop = () => {
      setPlayer((prev) => {
        const groundY = canvasSize.height - gameConfigRef.current.GROUND_HEIGHT - gameConfigRef.current.PLAYER_HEIGHT
        let newY = prev.y + prev.velocityY
        let newVelocityY = prev.velocityY + gameConfigRef.current.GRAVITY
        let newIsJumping = prev.isJumping
        let newCanDoubleJump = prev.canDoubleJump

        if (newY >= groundY) {
          newY = groundY
          newVelocityY = 0
          newIsJumping = false
          newCanDoubleJump = true
        }

        const newAnimationCounter = prev.animationCounter + 1
        const newSpriteIndex = Math.floor(newAnimationCounter / 8) % 5

        return {
          ...prev,
          y: newY,
          velocityY: newVelocityY,
          isJumping: newIsJumping,
          canDoubleJump: newCanDoubleJump,
          spriteIndex: newSpriteIndex,
          animationCounter: newAnimationCounter,
        }
      })

      setBackgroundX((prev) => {
        const newX = prev - 2
        return newX <= -canvasSize.width ? 0 : newX
      })

      setGameObjects((prev) => {
        const newObjects = [...prev]

        if (Math.random() < gameConfigRef.current.OBSTACLE_SPAWN_RATE) {
          const variant = Math.floor(Math.random() * 3) + 1
          newObjects.push({
            x: canvasSize.width,
            y: canvasSize.height - gameConfigRef.current.GROUND_HEIGHT - 60,
            width: 40,
            height: 60,
            type: "obstacle",
            variant,
          })
        }

        if (Math.random() < gameConfigRef.current.COLLECTIBLE_SPAWN_RATE) {
          const minHeight = canvasSize.height - gameConfigRef.current.GROUND_HEIGHT - 50
          const maxHeight = canvasSize.height - gameConfigRef.current.GROUND_HEIGHT - 200
          const randomY = Math.random() * (minHeight - maxHeight) + maxHeight
          const collectibleType = Math.random() > 0.5 ? "🧉" : "🥟"

          newObjects.push({
            x: canvasSize.width,
            y: randomY,
            width: 30,
            height: 30,
            type: "collectible",
            collectibleType,
          })
        }

        return newObjects
          .map((obj) => ({ ...obj, x: obj.x - gameConfigRef.current.GAME_SPEED }))
          .filter((obj) => obj.x > -100)
      })

      setGameObjects((prev) => {
        const playerRect = {
          x: player.x,
          y: player.y,
          width: gameConfigRef.current.PLAYER_WIDTH,
          height: gameConfigRef.current.PLAYER_HEIGHT,
        }

        const remainingObjects: GameObject[] = []
        let scoreIncrease = 0

        for (const obj of prev) {
          if (checkCollision(playerRect, obj)) {
            if (obj.type === "obstacle") {
              setGameState("gameOver")
              saveHighScore(score)
              return prev
            } else if (obj.type === "collectible") {
              scoreIncrease += 100
              addFloatingScore(obj.x, obj.y)
            }
          } else {
            remainingObjects.push(obj)
          }
        }

        if (scoreIncrease > 0) {
          setScore((prevScore) => prevScore + scoreIncrease)
        }

        return remainingObjects
      })

      setScore((prev) => prev + 1)

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState, player.x, player.y, score, checkCollision, saveHighScore, canvasSize, addFloatingScore, isClient])

  useEffect(() => {
    if (!isClient) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    if (backgroundImageRef.current && backgroundImageRef.current.complete) {
      const bgWidth = canvasSize.width
      const bgHeight = canvasSize.height

      ctx.drawImage(backgroundImageRef.current, backgroundX, 0, bgWidth, bgHeight)
      ctx.drawImage(backgroundImageRef.current, backgroundX + bgWidth, 0, bgWidth, bgHeight)
    }

    if (gameState === "playing") {
      const playerImg = playerImagesRef.current[player.spriteIndex]
      if (playerImg && playerImg.complete) {
        ctx.drawImage(
          playerImg,
          player.x,
          player.y,
          gameConfigRef.current.PLAYER_WIDTH,
          gameConfigRef.current.PLAYER_HEIGHT,
        )
      }

      gameObjects.forEach((obj) => {
        if (obj.type === "obstacle" && obj.variant) {
          const obstacleImg = obstacleImagesRef.current[obj.variant - 1]
          if (obstacleImg && obstacleImg.complete) {
            ctx.drawImage(obstacleImg, obj.x, obj.y, obj.width, obj.height)
          }
        } else if (obj.type === "collectible") {
          ctx.font = "32px Arial"
          ctx.textAlign = "center"
          ctx.fillStyle = "#FFD700"
          ctx.strokeStyle = "#8B4513"
          ctx.lineWidth = 2
          const item = obj.collectibleType || "🧉"
          ctx.strokeText(item, obj.x + obj.width / 2, obj.y + obj.height)
          ctx.fillText(item, obj.x + obj.width / 2, obj.y + obj.height)
        }
      })

      floatingScores.forEach((floatingScore) => {
        ctx.font = "bold 24px Arial"
        ctx.textAlign = "center"
        ctx.fillStyle = `rgba(255, 215, 0, ${floatingScore.opacity})`
        ctx.strokeStyle = `rgba(139, 69, 19, ${floatingScore.opacity})`
        ctx.lineWidth = 2
        ctx.strokeText("+100", floatingScore.x, floatingScore.y + floatingScore.offsetY)
        ctx.fillText("+100", floatingScore.x, floatingScore.y + floatingScore.offsetY)
      })
    }
  }, [gameState, player, gameObjects, backgroundX, canvasSize, floatingScores, isClient])

  const startGame = () => {
    const isMobile = window.innerWidth <= 768
    const isPortraitMode = window.innerHeight > window.innerWidth

    if (isMobile && isPortraitMode) {
      setWantsToPlayOnMobile(true)
      return
    }

    setGameState("playing")
    setScore(0)
    setPlayer({
      x: 100,
      y: canvasSize.height - gameConfigRef.current.GROUND_HEIGHT - gameConfigRef.current.PLAYER_HEIGHT,
      velocityY: 0,
      isJumping: false,
      canDoubleJump: true,
      spriteIndex: 0,
      animationCounter: 0,
    })
    setGameObjects([])
    setBackgroundX(0)
    setFloatingScores([])
  }

  const backToMenu = () => {
    setGameState("menu")
    setWantsToPlayOnMobile(false)
  }

  const MusicIcon = ({ isPlaying }: { isPlaying: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
      {isPlaying ? (
        <>
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </>
      ) : (
        <>
          <path d="M16.5 12c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
        </>
      )}
    </svg>
  )

  const LanguageButton = () => (
    <Button
      onClick={() => setLanguage(language === "en" ? "zh" : "en")}
      className="bg-white/90 hover:bg-white text-black px-3 py-2 rounded-lg shadow-lg border border-gray-300 font-medium"
      size="sm"
    >
      {language === "en" ? "中文" : "English"}
    </Button>
  )

  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletError("Please install MetaMask or OKX Wallet")
      return
    }

    setIsConnecting(true)
    setWalletError("")

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (accounts.length === 0) {
        throw new Error("No accounts found")
      }

      // Check if we're on X Layer Mainnet (Chain ID: 196)
      const chainId = await window.ethereum.request({ method: "eth_chainId" })

      if (chainId !== "0xc4") {
        // 196 in hex
        // Try to switch to X Layer Mainnet
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xc4" }],
          })
        } catch (switchError: any) {
          // If the chain hasn't been added to MetaMask, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0xc4",
                  chainName: "X Layer Mainnet",
                  nativeCurrency: {
                    name: "OKB",
                    symbol: "OKB",
                    decimals: 18,
                  },
                  rpcUrls: ["https://rpc.xlayer.tech"],
                  blockExplorerUrls: ["https://www.oklink.com/xlayer"],
                },
              ],
            })
          } else {
            throw switchError
          }
        }
      }

      setWalletAddress(accounts[0])
      localStorage.setItem("walletAddress", accounts[0])
    } catch (error: any) {
      console.error("Wallet connection error:", error)
      setWalletError(error.message || "Failed to connect wallet")
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress("")
    localStorage.removeItem("walletAddress")
    setWalletError("")
  }

  const handleMint = async () => {
    if (!walletAddress) {
      setWalletError("Please connect your wallet first")
      return
    }

    const amount = Number.parseFloat(okbAmount)
    if (isNaN(amount) || amount < 0.1 || amount > 3) {
      setWalletError(t("invalidAmount"))
      return
    }

    setIsMinting(true)
    setWalletError("")

    try {
      const amountWei = (amount * 1e18).toString()

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletAddress,
            to: "0x74354b1e26e165743452fe07b91e4e104d2da7e3",
            value: `0x${Number.parseInt(amountWei).toString(16)}`,
          },
        ],
      })

      console.log("Transaction sent:", txHash)
      alert(t("mintSuccess"))
    } catch (error: any) {
      console.error("Mint error:", error)
      setWalletError(error.message || t("mintError"))
    } finally {
      setIsMinting(false)
    }
  }

  // Check for existing wallet connection on load
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: "eth_chainId" })
            if (chainId === "0xc4") {
              // X Layer Mainnet
              setWalletAddress(accounts[0])
            }
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error)
        }
      }
    }

    if (isClient) {
      checkWalletConnection()
    }
  }, [isClient])

  if (!isClient) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-yellow-400 to-orange-600">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce">🐎</div>
          <p className="text-white text-xl font-bold">{t("loading")}</p>
        </div>
      </div>
    )
  }

  if (isPortrait && wantsToPlayOnMobile) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{
          backgroundImage: "url(/images/background.jpeg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="bg-black/80 backdrop-blur-sm rounded-lg p-8 text-center space-y-6 max-w-sm mx-4">
          <div className="text-6xl">📱</div>
          <h2 className="text-2xl font-bold text-white">{t("rotatePhone")}</h2>
          <p className="text-white text-lg">{t("rotateMessage")}</p>
          <div className="text-4xl animate-bounce">🔄</div>
          <Button onClick={backToMenu} className="bg-white/90 hover:bg-white text-black px-4 py-2 rounded-lg">
            {t("mainMenu")}
          </Button>
        </div>
        <LanguageButton />
        <Button
          onClick={toggleMusic}
          className="fixed top-4 right-4 z-50 bg-white/90 hover:bg-white text-black p-3 rounded-full shadow-lg border border-gray-300"
          size="sm"
        >
          <MusicIcon isPlaying={isMusicPlaying} />
        </Button>
        <audio ref={audioRef} src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/soundtrackpaseo-vWb1mVceGLjwjeEpXarGvG2guOAA1X.mp3" />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{
        backgroundImage: "url(/images/background.jpeg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="fixed top-4 left-4 z-50 flex items-center space-x-2">
        <LanguageButton />

        {/* Twitter X Icon */}
        <a
          href="https://x.com/heroxdotfun"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/90 hover:bg-white text-black p-1.5 rounded-full shadow-lg border border-gray-300 transition-all duration-200 hover:scale-105"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>

        {/* Telegram Icon */}
        <a
          href="https://telegram.org"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/90 hover:bg-white text-black p-1.5 rounded-full shadow-lg border border-gray-300 transition-all duration-200 hover:scale-105"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
        </a>

        {/* Music Button */}
        <Button
          onClick={toggleMusic}
          className="bg-white/90 hover:bg-white text-black p-3 rounded-full shadow-lg border border-gray-300 transition-all duration-200 hover:scale-105"
          size="sm"
        >
          <MusicIcon isPlaying={isMusicPlaying} />
        </Button>
      </div>

      <div className="fixed top-4 right-4 z-50">
        {walletAddress ? (
          <div className="bg-gradient-to-r from-amber-50/95 to-orange-50/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-amber-200/50">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-amber-800">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
              </div>
              <Button
                onClick={disconnectWallet}
                size="sm"
                variant="outline"
                className="text-xs px-2 py-1 h-auto bg-transparent border-amber-300 text-amber-700 hover:bg-amber-100/50"
              >
                {t("disconnect")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={connectWallet}
            disabled={isConnecting}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-all duration-200 hover:scale-105 border border-amber-500/30"
          >
            {isConnecting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{t("connectingWallet")}</span>
              </div>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
                  <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1M16 10v4M12 10v4M8 10v4" />
                </svg>
                {t("connectWallet")}
              </>
            )}
          </Button>
        )}
        {walletError && (
          <div className="mt-2 bg-red-50/95 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm backdrop-blur-sm">
            {walletError}
          </div>
        )}
      </div>

      <audio ref={audioRef} src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/soundtrackpaseo-vWb1mVceGLjwjeEpXarGvG2guOAA1X.mp3" />
      {gameState === "menu" && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-6xl space-y-8">
            <div className="flex justify-center mb-8 mt-16 md:mt-8">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/%E6%9C%AA%E5%91%BD%E5%90%8D%E7%9A%84%E8%AE%BE%E8%AE%A1%20%289%29-BIbmw4hVY6lYpvUanYJP3roifv7yPs.png"
                alt="HeroX Logo"
                className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain"
              />
            </div>

            {/* HeroX Presale Section */}
            <HeroXPresale
              walletAddress={walletAddress}
              isConnecting={isConnecting}
              connectWallet={connectWallet}
              handleMint={handleMint}
              isMinting={isMinting}
              okbAmount={okbAmount}
              setOkbAmount={setOkbAmount}
            />

            {/* Hero Section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-orange-500/20 to-red-600/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-gradient-to-br from-amber-50/95 via-orange-50/90 to-red-50/95 backdrop-blur-sm rounded-2xl p-8 border border-amber-200/50 shadow-2xl">
                <div className="grid md:grid-cols-3 gap-6 items-center">
                  {/* Left decorative element */}
                  <div className="hidden md:flex justify-center">
                    <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-4 shadow-lg animate-bounce">
                      <div className="text-4xl">🤠</div>
                    </div>
                  </div>

                  {/* Center content */}
                  <div className="space-y-4 text-center">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-amber-800 via-orange-700 to-red-700 bg-clip-text text-transparent leading-tight animate-pulse">
                      {t("heroTitle")}
                    </h1>
                    <p className="text-amber-900/80 text-lg md:text-xl font-medium leading-relaxed">
                      {t("heroSubtitle")}
                    </p>
                    <Button
                      onClick={startGame}
                      size="xl"
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-12 py-6 text-2xl font-bold rounded-2xl shadow-xl transform hover:scale-110 transition-all duration-200 animate-pulse"
                    >
                      {t("heroPlayButton")} 🚀
                    </Button>
                  </div>

                  {/* Right decorative element */}
                  <div className="hidden md:flex justify-center">
                    <div
                      className="bg-gradient-to-br from-orange-400 to-red-500 rounded-xl p-4 shadow-lg animate-bounce"
                      style={{ animationDelay: "0.5s" }}
                    >
                      <div className="text-4xl">💰</div>
                    </div>
                  </div>
                </div>

                {/* Bottom decorative stats */}
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-amber-200/50">
                  <div className="text-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                    <div className="bg-amber-100 rounded-lg p-3 hover:scale-105 transition-transform duration-200">
                      <div className="text-2xl mb-1 animate-pulse">⚡</div>
                      <div className="text-sm font-semibold text-amber-800">Fast-Paced</div>
                    </div>
                  </div>
                  <div className="text-center animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
                    <div className="bg-orange-100 rounded-lg p-3 hover:scale-105 transition-transform duration-200">
                      <div className="text-2xl mb-1 animate-pulse">🏆</div>
                      <div className="text-sm font-semibold text-orange-800">Competitive</div>
                    </div>
                  </div>
                  <div className="text-center animate-fade-in-up" style={{ animationDelay: "0.6s" }}>
                    <div className="bg-red-100 rounded-lg p-3 hover:scale-105 transition-transform duration-200">
                      <div className="text-2xl mb-1 animate-pulse">💎</div>
                      <div className="text-sm font-semibold text-red-800">Rewarding</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* New How to Play section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-red-500/20 to-amber-600/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-gradient-to-br from-orange-50/95 via-red-50/90 to-amber-50/95 backdrop-blur-sm rounded-2xl p-8 border border-orange-200/50 shadow-2xl">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-800 via-red-700 to-amber-700 bg-clip-text text-transparent mb-4 animate-fade-in">
                    {t("gameplayTitle")}
                  </h2>
                  <p className="text-orange-900/80 text-xl font-semibold">{t("gameplaySubtitle")}</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Rule 1 */}
                  <div
                    className="bg-gradient-to-br from-red-100 to-orange-100 rounded-xl p-6 border border-red-200/50 shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: "0.1s" }}
                  >
                    <div className="text-center space-y-3">
                      <div className="bg-red-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto animate-spin-slow">
                        <span className="text-3xl">🌵</span>
                      </div>
                      <p className="text-red-800 font-semibold text-sm leading-relaxed">{t("gameplayRule1")}</p>
                    </div>
                  </div>

                  {/* Rule 2 */}
                  <div
                    className="bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl p-6 border border-amber-200/50 shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: "0.2s" }}
                  >
                    <div className="text-center space-y-3">
                      <div className="bg-amber-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto animate-bounce">
                        <span className="text-3xl">🧉</span>
                      </div>
                      <p className="text-amber-800 font-semibold text-sm leading-relaxed">{t("gameplayRule2")}</p>
                    </div>
                  </div>

                  {/* Rule 3 */}
                  <div
                    className="bg-gradient-to-br from-orange-100 to-red-100 rounded-xl p-6 border border-orange-200/50 shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: "0.3s" }}
                  >
                    <div className="text-center space-y-3">
                      <div className="bg-orange-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto animate-pulse">
                        <span className="text-3xl">⏱️</span>
                      </div>
                      <p className="text-orange-800 font-semibold text-sm leading-relaxed">{t("gameplayRule3")}</p>
                    </div>
                  </div>

                  {/* Goal */}
                  <div
                    className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl p-6 border border-yellow-200/50 shadow-lg hover:scale-105 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: "0.4s" }}
                  >
                    <div className="text-center space-y-3">
                      <div className="bg-yellow-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto animate-bounce">
                        <span className="text-3xl">🏆</span>
                      </div>
                      <p className="text-yellow-800 font-semibold text-sm leading-relaxed">{t("gameplayGoal")}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom decorative elements */}
                <div className="flex justify-center space-x-4">
                  <div className="bg-gradient-to-r from-red-400 to-orange-400 rounded-lg px-6 py-3 shadow-md">
                    <span className="text-white font-bold text-sm">🎮 Easy Controls</span>
                  </div>
                  <div className="bg-gradient-to-r from-orange-400 to-red-400 rounded-lg px-6 py-3 shadow-md">
                    <span className="text-white font-bold text-sm">🚀 Endless Fun</span>
                  </div>
                  <div className="bg-gradient-to-r from-amber-400 to-yellow-400 rounded-lg px-6 py-3 shadow-md">
                    <span className="text-white font-bold text-sm">💰 Earn Rewards</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-purple-600/20 via-blue-500/20 to-indigo-600/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-gradient-to-b from-slate-900/95 via-gray-800/90 to-slate-900/95 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
                {/* Header with neon effect */}
                <div className="text-center mb-8">
                  <div className="inline-block relative">
                    <h2 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-4 relative z-10 animate-pulse">
                      {t("leaderboardTitle")}
                    </h2>
                    <div className="absolute inset-0 text-4xl md:text-5xl font-bold text-cyan-400/20 blur-sm">
                      {t("leaderboardTitle")}
                    </div>
                  </div>
                  <p className="text-slate-300 text-xl font-medium">{t("leaderboardSubtitle")}</p>
                </div>

                {/* Leaderboard table */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-600/50 mb-8">
                  <div className="space-y-4">
                    {/* Header row */}
                    <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-600/50">
                      <div className="text-cyan-400 font-bold text-lg">Rank</div>
                      <div className="text-cyan-400 font-bold text-lg">Player</div>
                      <div className="text-cyan-400 font-bold text-lg text-right">Score</div>
                    </div>

                    {/* Top 3 players with special styling */}
                    <div
                      className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-lg p-4 border border-yellow-500/30 animate-fade-in-up hover:scale-102 transition-all duration-300"
                      style={{ animationDelay: "0.1s" }}
                    >
                      <div className="grid grid-cols-3 gap-4 items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-3xl animate-bounce">🥇</span>
                          <span className="text-yellow-400 font-bold text-xl">#1</span>
                        </div>
                        <div className="text-white font-semibold text-lg">A</div>
                        <div className="text-yellow-400 font-mono font-bold text-xl text-right animate-pulse">
                          15,420
                        </div>
                      </div>
                    </div>

                    <div
                      className="bg-gradient-to-r from-gray-400/20 to-slate-400/20 rounded-lg p-4 border border-gray-400/30 animate-fade-in-up hover:scale-102 transition-all duration-300"
                      style={{ animationDelay: "0.2s" }}
                    >
                      <div className="grid grid-cols-3 gap-4 items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-3xl animate-bounce">🥈</span>
                          <span className="text-gray-400 font-bold text-xl">#2</span>
                        </div>
                        <div className="text-white font-semibold text-lg">B</div>
                        <div className="text-gray-400 font-mono font-bold text-xl text-right animate-pulse">12,890</div>
                      </div>
                    </div>

                    <div
                      className="bg-gradient-to-r from-orange-600/20 to-amber-600/20 rounded-lg p-4 border border-orange-600/30 animate-fade-in-up hover:scale-102 transition-all duration-300"
                      style={{ animationDelay: "0.3s" }}
                    >
                      <div className="grid grid-cols-3 gap-4 items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-3xl animate-bounce">🥉</span>
                          <span className="text-orange-400 font-bold text-xl">#3</span>
                        </div>
                        <div className="text-white font-semibold text-lg">C</div>
                        <div className="text-orange-400 font-mono font-bold text-xl text-right animate-pulse">
                          11,250
                        </div>
                      </div>
                    </div>

                    {/* Regular players */}
                    {[
                      { rank: 4, name: "SpeedRunner", score: 9840 },
                      { rank: 5, name: "HeroXFan", score: 8760 },
                      { rank: 6, name: "GauchoMaster", score: 7650 },
                      { rank: 7, name: "TokenHunter", score: 6890 },
                      { rank: 8, name: "JumpKing", score: 5420 },
                    ].map((player, index) => (
                      <div
                        key={player.rank}
                        className="grid grid-cols-3 gap-4 items-center py-3 border-b border-slate-700/30 last:border-b-0 animate-fade-in-up hover:bg-slate-700/30 transition-all duration-200"
                        style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                      >
                        <div className="text-slate-400 font-bold text-lg">#{player.rank}</div>
                        <div className="text-slate-300 font-medium">{player.name}</div>
                        <div className="text-slate-300 font-mono text-right">{player.score.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rewards info */}
                <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl p-6 border border-emerald-500/30">
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-emerald-400 mb-4">🏆 Rewards for Top Players</h4>
                    <p className="text-slate-300 text-lg mb-6">
                      Top scorers earn $HeroX tokens based on their leaderboard position!
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/30">
                        <div className="text-3xl mb-2">🥇</div>
                        <div className="text-yellow-400 font-bold">1st Place</div>
                        <div className="text-white font-mono">1000 $HeroX</div>
                      </div>
                      <div className="bg-gray-400/20 rounded-lg p-4 border border-gray-400/30">
                        <div className="text-3xl mb-2">🥈</div>
                        <div className="text-gray-400 font-bold">2nd Place</div>
                        <div className="text-white font-mono">500 $HeroX</div>
                      </div>
                      <div className="bg-orange-600/20 rounded-lg p-4 border border-orange-600/30">
                        <div className="text-3xl mb-2">🥉</div>
                        <div className="text-orange-400 font-bold">3rd Place</div>
                        <div className="text-white font-mono">250 $HeroX</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Token section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-cyan-600/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-gradient-to-br from-emerald-50/95 via-teal-50/90 to-cyan-50/95 backdrop-blur-sm rounded-2xl p-8 border border-emerald-200/50 shadow-2xl">
                {/* Header with crypto-style design */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center space-x-3 mb-4">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full p-3">
                      <span className="text-3xl">💎</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-800 via-teal-700 to-cyan-700 bg-clip-text text-transparent">
                      {t("tokenTitle")}
                    </h2>
                    <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full p-3">
                      <span className="text-3xl">🪙</span>
                    </div>
                  </div>
                  <p className="text-emerald-900/80 text-xl font-semibold">{t("tokenSubtitle")}</p>
                </div>

                {/* Main content in financial dashboard style */}
                <div className="grid lg:grid-cols-2 gap-8 mb-8">
                  {/* Left side - Token info cards */}
                  <div className="space-y-6">
                    {/* Token ticker card */}
                    <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl p-6 border border-emerald-300/50 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-emerald-800 mb-2">{t("tokenTicker")}</h3>
                          <p className="text-emerald-700 font-medium">{t("tokenChain")}</p>
                        </div>
                        <div className="bg-emerald-500 rounded-full p-4">
                          <span className="text-4xl">🚀</span>
                        </div>
                      </div>
                    </div>

                    {/* Total supply card */}
                    <div className="bg-gradient-to-r from-teal-100 to-cyan-100 rounded-xl p-6 border border-teal-300/50 shadow-lg">
                      <div className="text-center">
                        <h4 className="text-lg font-bold text-teal-800 mb-2">{t("tokenTotalSupply")}</h4>
                        <p className="text-3xl font-mono font-bold text-teal-700">{t("tokenSupplyAmount")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Distribution chart style */}
                  <div className="space-y-6">
                    {/* Distribution section */}
                    <div className="bg-gradient-to-br from-cyan-100 to-emerald-100 rounded-xl p-6 border border-cyan-300/50 shadow-lg">
                      <h4 className="text-xl font-bold text-cyan-800 mb-4 text-center">
                        {t("tokenDistributionTitle")}
                      </h4>
                      <div className="space-y-4">
                        {/* Team allocation */}
                        <div className="flex items-center justify-between bg-white/60 rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-gradient-to-r from-orange-400 to-red-400 rounded-full"></div>
                            <span className="font-semibold text-gray-800">{t("tokenTeamPercent")}</span>
                          </div>
                          <div className="w-32 bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-orange-400 to-red-400 h-3 rounded-full"
                              style={{ width: "15%" }}
                            ></div>
                          </div>
                        </div>

                        {/* Liquidity allocation */}
                        <div className="flex items-center justify-between bg-white/60 rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full"></div>
                            <span className="font-semibold text-gray-800">{t("tokenLiquidityPercent")}</span>
                          </div>
                          <div className="w-32 bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-emerald-400 to-teal-400 h-3 rounded-full"
                              style={{ width: "85%" }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Utility section with feature cards */}
                <div className="mb-8">
                  <h4 className="text-2xl font-bold text-center text-emerald-800 mb-6">{t("tokenUtilityTitle")}</h4>
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Rewards utility */}
                    <div className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-xl p-6 border border-yellow-300/50 shadow-lg text-center">
                      <div className="bg-yellow-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🏆</span>
                      </div>
                      <h5 className="font-bold text-yellow-800 mb-2">{t("tokenUtilityRewards")}</h5>
                      <p className="text-yellow-700 text-sm">Earn tokens by achieving high scores</p>
                    </div>

                    {/* Expansions utility */}
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-6 border border-purple-300/50 shadow-lg text-center">
                      <div className="bg-purple-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🎮</span>
                      </div>
                      <h5 className="font-bold text-purple-800 mb-2">{t("tokenUtilityExpansions")}</h5>
                      <p className="text-purple-700 text-sm">Access new games and features</p>
                    </div>

                    {/* Governance utility */}
                    <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-6 border border-blue-300/50 shadow-lg text-center">
                      <div className="bg-blue-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🗳️</span>
                      </div>
                      <h5 className="font-bold text-blue-800 mb-2">{t("tokenUtilityGovernance")}</h5>
                      <p className="text-blue-700 text-sm">Vote on game development decisions</p>
                    </div>
                  </div>
                </div>

                {/* Bottom CTA with financial theme */}
                <div className="text-center">
                  <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl p-8 border border-emerald-500/30">
                    <div className="flex justify-center space-x-4 mb-4">
                      <div className="bg-emerald-500 rounded-lg px-4 py-2">
                        <span className="text-white font-bold text-sm">💰 Earn</span>
                      </div>
                      <div className="bg-teal-500 rounded-lg px-4 py-2">
                        <span className="text-white font-bold text-sm">🔄 Trade</span>
                      </div>
                      <div className="bg-cyan-500 rounded-lg px-4 py-2">
                        <span className="text-white font-bold text-sm">🏛️ Govern</span>
                      </div>
                    </div>
                    <p className="text-emerald-800 text-xl font-bold mb-6">{t("tokenEarnMore")}</p>
                    <Button
                      onClick={startGame}
                      size="lg"
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-4 text-xl font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      Start Earning $HeroX 💎
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Roadmap section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-cyan-600/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-gradient-to-br from-emerald-50/95 via-teal-50/90 to-cyan-50/95 backdrop-blur-sm rounded-2xl p-8 border border-emerald-200/50 shadow-2xl">
                {/* Premium header with timeline aesthetic */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center space-x-4 mb-6">
                    <div className="bg-gradient-to-r from-violet-500 to-purple-500 rounded-full p-4 shadow-lg">
                      <span className="text-4xl">🗺️</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-violet-800 via-purple-700 to-pink-700 bg-clip-text text-transparent">
                      {t("roadmapTitle")}
                    </h2>
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-4 shadow-lg">
                      <span className="text-4xl">🚀</span>
                    </div>
                  </div>
                  <p className="text-violet-900/80 text-xl font-semibold">{t("roadmapSubtitle")}</p>
                </div>

                {/* Timeline layout with premium styling */}
                <div className="grid lg:grid-cols-2 gap-12">
                  {/* Game Roadmap - Left side */}
                  <div className="relative">
                    {/* Vertical timeline line */}
                    <div className="absolute left-8 top-16 bottom-0 w-1 bg-gradient-to-b from-blue-400 via-indigo-500 to-purple-600 rounded-full"></div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 border border-blue-200/50 shadow-xl">
                      <div className="flex items-center space-x-4 mb-8">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full p-3">
                          <span className="text-2xl">🎮</span>
                        </div>
                        <h3 className="text-2xl font-bold text-blue-800">{t("gameRoadmapTitle")}</h3>
                      </div>

                      <div className="space-y-8">
                        {/* Phase 1 */}
                        <div className="relative flex items-start space-x-6">
                          <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full w-16 h-16 flex items-center justify-center shadow-lg z-10">
                            <span className="text-white font-bold text-lg">1</span>
                          </div>
                          <div className="bg-white/80 rounded-xl p-6 flex-1 shadow-lg border border-green-200/50">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-2xl">✅</span>
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                                COMPLETED
                              </span>
                            </div>
                            <p className="text-gray-800 font-medium leading-relaxed">{t("gamePhase1")}</p>
                          </div>
                        </div>

                        {/* Phase 2 */}
                        <div className="relative flex items-start space-x-6">
                          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-16 h-16 flex items-center justify-center shadow-lg z-10">
                            <span className="text-white font-bold text-lg">2</span>
                          </div>
                          <div className="bg-white/80 rounded-xl p-6 flex-1 shadow-lg border border-yellow-200/50">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-2xl">🔄</span>
                              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                                IN PROGRESS
                              </span>
                            </div>
                            <p className="text-gray-800 font-medium leading-relaxed">{t("gamePhase2")}</p>
                          </div>
                        </div>

                        {/* Phase 3 */}
                        <div className="relative flex items-start space-x-6">
                          <div className="bg-gradient-to-r from-purple-400 to-pink-500 rounded-full w-16 h-16 flex items-center justify-center shadow-lg z-10">
                            <span className="text-white font-bold text-lg">3</span>
                          </div>
                          <div className="bg-white/80 rounded-xl p-6 flex-1 shadow-lg border border-purple-200/50">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-2xl">⏳</span>
                              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
                                PLANNED
                              </span>
                            </div>
                            <p className="text-gray-800 font-medium leading-relaxed">{t("gamePhase3")}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Token Roadmap - Right side */}
                  <div className="relative">
                    {/* Vertical timeline line */}
                    <div className="absolute left-8 top-16 bottom-0 w-1 bg-gradient-to-b from-emerald-400 via-teal-500 to-cyan-600 rounded-full"></div>

                    <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-2xl p-8 border border-emerald-200/50 shadow-xl">
                      <div className="flex items-center space-x-4 mb-8">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full p-3">
                          <span className="text-2xl">💰</span>
                        </div>
                        <h3 className="text-2xl font-bold text-emerald-800">{t("tokenRoadmapTitle")}</h3>
                      </div>

                      <div className="space-y-8">
                        {/* Phase 1 */}
                        <div className="relative flex items-start space-x-6">
                          <div className="bg-gradient-to-r from-green-400 to-emerald-500 rounded-full w-16 h-16 flex items-center justify-center shadow-lg z-10">
                            <span className="text-white font-bold text-lg">1</span>
                          </div>
                          <div className="bg-white/80 rounded-xl p-6 flex-1 shadow-lg border border-green-200/50">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-2xl">✅</span>
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                                COMPLETED
                              </span>
                            </div>
                            <p className="text-gray-800 font-medium leading-relaxed">{t("tokenPhase1")}</p>
                          </div>
                        </div>

                        {/* Phase 2 */}
                        <div className="relative flex items-start space-x-6">
                          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-16 h-16 flex items-center justify-center shadow-lg z-10">
                            <span className="text-white font-bold text-lg">2</span>
                          </div>
                          <div className="bg-white/80 rounded-xl p-6 flex-1 shadow-lg border border-yellow-200/50">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-2xl">🔄</span>
                              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                                IN PROGRESS
                              </span>
                            </div>
                            <p className="text-gray-800 font-medium leading-relaxed">{t("tokenPhase2")}</p>
                          </div>
                        </div>

                        {/* Phase 3 */}
                        <div className="relative flex items-start space-x-6">
                          <div className="bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full w-16 h-16 flex items-center justify-center shadow-lg z-10">
                            <span className="text-white font-bold text-lg">3</span>
                          </div>
                          <div className="bg-white/80 rounded-xl p-6 flex-1 shadow-lg border border-blue-200/50">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-2xl">⏳</span>
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                PLANNED
                              </span>
                            </div>
                            <p className="text-gray-800 font-medium leading-relaxed">{t("tokenPhase3")}</p>
                          </div>
                        </div>

                        {/* Phase 4 */}
                        <div className="relative flex items-start space-x-6">
                          <div className="bg-gradient-to-r from-purple-400 to-pink-500 rounded-full w-16 h-16 flex items-center justify-center shadow-lg z-10">
                            <span className="text-white font-bold text-lg">4</span>
                          </div>
                          <div className="bg-white/80 rounded-xl p-6 flex-1 shadow-lg border border-purple-200/50">
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-2xl">🔮</span>
                              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
                                FUTURE
                              </span>
                            </div>
                            <p className="text-gray-800 font-medium leading-relaxed">{t("tokenPhase4")}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom CTA with a futuristic touch */}
                <div className="text-center">
                  <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-xl p-8 border border-violet-500/30">
                    <div className="flex justify-center space-x-4 mb-4">
                      <div className="bg-violet-500 rounded-lg px-4 py-2">
                        <span className="text-white font-bold text-sm">🎮 Play</span>
                      </div>
                      <div className="bg-purple-500 rounded-lg px-4 py-2">
                        <span className="text-white font-bold text-sm">💰 Earn</span>
                      </div>
                      <div className="bg-pink-500 rounded-lg px-4 py-2">
                        <span className="text-white font-bold text-sm">💎 Collect</span>
                      </div>
                    </div>
                    <p className="text-violet-800 text-xl font-bold mb-6">{t("roadmapJoinUs")}</p>
                    <Button
                      onClick={startGame}
                      size="lg"
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-8 py-4 text-xl font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                      {t("roadmapStartJourney")} 🚀
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto px-4 mb-8">
              {/* How to Play Card */}
              <Card className="bg-gradient-to-br from-amber-900/95 via-orange-900/90 to-red-900/95 backdrop-blur-sm rounded-lg p-8 text-white shadow-2xl border border-amber-700/50">
                <h2 className="text-2xl font-bold mb-6 text-amber-100">How to Play?</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">💻</span>
                    <span className="text-amber-100">
                      <strong>Desktop:</strong> SPACE to jump, ↓ for fast descent
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📱</span>
                    <span className="text-amber-100">
                      <strong>Mobile:</strong> Tap screen to jump
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">⭐</span>
                    <span className="text-amber-100">
                      <strong>Double jump available</strong>
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🧉</span>
                    <span className="text-amber-100">
                      <strong>Collect items for +100 points</strong>
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🌵</span>
                    <span className="text-amber-100">
                      <strong>avoidCacti</strong>
                    </span>
                  </div>
                </div>
                <Button
                  onClick={startGame}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-xl shadow-lg transition-all duration-200 hover:scale-105"
                >
                  🎮 play
                </Button>
              </Card>

              {/* High Scores Card */}
              <Card className="bg-gradient-to-br from-amber-50/95 via-orange-50/90 to-red-50/95 backdrop-blur-sm rounded-lg p-8 shadow-2xl border border-amber-200/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-amber-900">🏆 {t("highScores")}</h2>
                  <span className="text-2xl">🏆</span>
                </div>
                <div className="space-y-4">
                  {highScores.length === 0 ? (
                    <div className="text-center space-y-4">
                      <p className="text-amber-800 text-lg font-semibold">{t("firstToPlay")}</p>
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-2xl">🏅</span>
                        <p className="text-amber-700 font-medium">{t("newRecord")}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {highScores.map((highScore, index) => (
                        <div key={index} className="flex justify-between items-center bg-white/50 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">
                              {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅"}
                            </span>
                            <span className="text-amber-800 font-medium">#{index + 1}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-amber-900 font-bold">{highScore.score}</div>
                            <div className="text-amber-700 text-sm">{highScore.date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Footer section */}
            <footer className="text-center p-8">
              <div className="text-white space-y-1">
                <p>
                  &copy; {new Date().getFullYear()} HeroX. A fun cowboy runner on XlayerChain — play, score, and get
                  rewarded.
                </p>
                <p>Contact us: contact@herox.fun</p>
              </div>
            </footer>
          </div>
        </div>
      )}

      {gameState === "playing" && (
        <div
          className="absolute top-0 left-0 w-full h-full"
          onTouchStart={handleTouchStart}
          style={{ touchAction: "none" }}
        >
          <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} />
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white text-xl font-bold px-4 py-2 rounded-full shadow-lg">
            {t("score")} : {score}
          </div>
        </div>
      )}

      {gameState === "gameOver" && (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="bg-white/90 backdrop-blur-sm rounded-lg p-8 text-center space-y-6 max-w-sm mx-4">
            <div className="text-5xl animate-pulse">💀</div>
            <h2 className="text-3xl font-bold">{t("gameOverTitle")}</h2>
            <p className="text-lg">
              {t("finalScore")} : <span className="font-semibold">{score}</span>
            </p>
            <div>
              <h3 className="text-xl font-semibold mb-2">{t("highScores")}</h3>
              {highScores.length === 0 ? (
                <p>{t("noScoresYet")}</p>
              ) : (
                <ul className="space-y-2">
                  {highScores.map((s, i) => (
                    <li key={i} className="flex justify-between items-center">
                      <span>
                        {s.date}: {t("score")}
                      </span>
                      <span className="font-semibold">{s.score}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex space-x-4">
              <Button onClick={startGame} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                {t("playAgain")}
              </Button>
              <Button onClick={backToMenu} className="bg-gray-200 hover:bg-gray-300 text-black px-4 py-2 rounded-lg">
                {t("mainMenu")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
