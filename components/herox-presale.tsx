"use client"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"

interface HeroXPresaleProps {
  walletAddress: string
  isConnecting: boolean
  walletError: string
  okbAmount: string
  isMinting: boolean
  setOkbAmount: (amount: string) => void
  setWalletError: (error: string) => void
  handleMint: () => void
  connectWallet: () => void
}

export default function HeroXPresale({
  walletAddress,
  isConnecting,
  walletError,
  okbAmount,
  isMinting,
  setOkbAmount,
  setWalletError,
  handleMint,
  connectWallet,
}: HeroXPresaleProps) {
  const { t } = useLanguage()

  // ======== 预售时间点（北京时间）========
  // 开始：2025-09-07 03:20
  const startTsRef = useRef<number>(new Date("2025-09-07T12:00:00+08:00").getTime())
  // [NEW] 截止：2025-09-07 13:25
  const endTsRef   = useRef<number>(new Date("2025-09-08T15:00:00+08:00").getTime())

  // [CHG] 拆成两个独立的剩余时间
  const [timeLeftToStartMs, setTimeLeftToStartMs] = useState<number>(0)
  const [timeLeftToEndMs, setTimeLeftToEndMs]     = useState<number>(0)

  const pad = (n: number) => n.toString().padStart(2, "0")
  const splitTime = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000))
    const days = Math.floor(total / 86400)
    const hours = Math.floor((total % 86400) / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    return { days, hours, minutes, seconds }
  }

  useEffect(() => {
    // [CHG] 同时刷新“距开始”和“距截止”
    const tick = () => {
      const now = Date.now()
      setTimeLeftToStartMs(startTsRef.current - now)
      setTimeLeftToEndMs(endTsRef.current - now)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // [CHG] 增加截止状态
  const presaleStarted = timeLeftToStartMs <= 0
  const presaleEnded   = timeLeftToEndMs   <= 0

  // ======== 本地提示框（不依赖 setWalletError）========
  const [notStartedOpen, setNotStartedOpen] = useState(false)
  const [endedOpen, setEndedOpen] = useState(false) // [NEW] 截止提示

  useEffect(() => {
    if (!notStartedOpen) return
    const timer = setTimeout(() => setNotStartedOpen(false), 2500)
    return () => clearTimeout(timer)
  }, [notStartedOpen])

  useEffect(() => {
    if (!endedOpen) return
    const timer = setTimeout(() => setEndedOpen(false), 2500)
    return () => clearTimeout(timer)
  }, [endedOpen])

  // 点击逻辑：未连 -> 连接；未开始 -> 提示；已截止 -> 提示；开始且未截止 -> 真正 mint
  const onMintClick = () => {
    if (!walletAddress) {
      connectWallet()
      return
    }
    if (!presaleStarted) {
      setNotStartedOpen(true)
      return
    }
    if (presaleEnded) {
      setEndedOpen(true) // [NEW] 截止后提示
      return
    }
    if (typeof setWalletError === "function") setWalletError("") // 安全清理
    handleMint()
  }

  // 缩小版倒计时卡片
  const Unit = ({ value, label }: { value: string | number; label: string }) => (
    <div className="bg-white/90 rounded-lg px-3 py-2 shadow border border-orange-200/60 text-center">
      <div className="text-xl md:text-2xl font-extrabold text-orange-900">{value}</div>
      <div className="mt-1 text-xs md:text-sm tracking-wide text-orange-700">{label}</div>
    </div>
  )

  const start = splitTime(timeLeftToStartMs)
  const end   = splitTime(timeLeftToEndMs)

  return (
    <div className="relative">
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          backgroundImage: "url('/images/herox-presale-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-transparent to-black/0 rounded-2xl"></div>

      <div className="relative rounded-2xl p-8 shadow-2xl border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-4 mb-6">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-800 via-red-700 to-orange-800 bg-clip-text text-transparent">
              {t("presaleTitle")}
            </h2>
          </div>
          <p className="text-orange-900/90 text-xl font-semibold">{t("presaleSubtitle")}</p>

          {/* ======== 倒计时区域 ======== */}
          <div className="mt-6">
            {/* 未开始：显示“距开始” */}
            {!presaleStarted && (
              <>
                <p className="text-center text-orange-900 font-semibold text-lg md:text-xl">
                  {t("presaleStartsIn") || "Presale starts in:"}
                </p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 max-w-2xl mx-auto">
                  <Unit value={start.days} label={t("days") || "Days"} />
                  <Unit value={pad(start.hours)} label={t("hours") || "Hours"} />
                  <Unit value={pad(start.minutes)} label={t("minutes") || "Minutes"} />
                  <Unit value={pad(start.seconds)} label={t("seconds") || "Seconds"} />
                </div>
              </>
            )}

            {/* 已开始且未截止：显示“距截止” */}
            {presaleStarted && !presaleEnded && (
              <>
                <p className="text-center text-orange-900 font-semibold text-lg md:text-xl">
                  {t("presaleEndsIn") || "Presale ends in:"}
                </p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 max-w-2xl mx-auto">
                  <Unit value={end.days} label={t("days") || "Days"} />
                  <Unit value={pad(end.hours)} label={t("hours") || "Hours"} />
                  <Unit value={pad(end.minutes)} label={t("minutes") || "Minutes"} />
                  <Unit value={pad(end.seconds)} label={t("seconds") || "Seconds"} />
                </div>
              </>
            )}

            {/* 已截止：显示“已结束” */}
            {presaleEnded && (
              <div className="mt-3 text-center text-red-600 font-bold text-xl">
                {t("presaleEnded") || "Presale ended"}
              </div>
            )}
          </div>
          {/* ======== /倒计时区域 ======== */}
        </div>

        {/* Presale interface */}
        <div className="max-w-md mx-auto">
          <div className="bg-white/95 rounded-xl p-6 shadow-lg border border-orange-200/50 mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-lg font-bold text-orange-800 mb-3">{t("okbAmount")}</label>
                <input
                  type="number"
                  min="0.1"
                  max="3"
                  step="0.01"
                  value={okbAmount}
                  onChange={(e) => setOkbAmount(e.target.value)}
                  disabled={!walletAddress}
                  className="w-full px-4 py-3 text-xl font-mono text-center border border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="1.0"
                />
              </div>
              <div className="flex justify-between text-sm text-orange-600 font-medium">
                <span>{t("minimumOkb")}</span>
                <span>{t("maximumOkb")}</span>
              </div>
            </div>
          </div>

          <Button
            onClick={onMintClick}
            disabled={isMinting || (!walletAddress && isConnecting)}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-xl font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isMinting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{t("minting")}</span>
              </div>
            ) : walletAddress ? (
              <div className="flex items-center justify-center space-x-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" />
                </svg>
                <span>{t("mint")}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" />
                </svg>
                <span>{t("connectWalletFirst")}</span>
              </div>
            )}
          </Button>

          {walletError && (
            <p className="text-center text-red-600 text-sm mt-3 bg-red-50/70 rounded-md px-3 py-2">
              {walletError}
            </p>
          )}
        </div>
      </div>

      {/* ======== Toast：未开始 ======== */}
      {notStartedOpen && (
        <div role="dialog" aria-live="assertive" className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50">
          <div className="bg-orange-600 text-white rounded-lg shadow-lg px-4 py-3 text-sm md:text-base">
            {t("presaleNotStarted") || "Presale has not started yet."}
          </div>
        </div>
      )}

      {/* ======== [NEW] Toast：已截止 ======== */}
      {endedOpen && (
        <div role="dialog" aria-live="assertive" className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50">
          <div className="bg-red-600 text-white rounded-lg shadow-lg px-4 py-3 text-sm md:text-base">
            {t("presaleEndedToast") || "Presale has ended."}
          </div>
        </div>
      )}
    </div>
  )
}
