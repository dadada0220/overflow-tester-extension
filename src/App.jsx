import { useState } from "react"
import { Switch } from "./components/ui/switch"
import { Label } from "./components/ui/label"
import { Button } from "./components/ui/button"
import { Separator } from "./components/ui/separator"
import { Type, LayoutList, Play, AlertCircle, Ban } from "lucide-react"

export default function App() {
  const [textEnabled, setTextEnabled] = useState(true)
  const [textMultiplier, setTextMultiplier] = useState(3)
  const [elemEnabled, setElemEnabled] = useState(true)
  const [elemMultiplier, setElemMultiplier] = useState(2)
  const [excludeSelectors, setExcludeSelectors] = useState("")
  const [status, setStatus] = useState(null)

  const handleRun = async () => {
    if (!textEnabled && !elemEnabled) {
      setStatus({ type: "warn", msg: "少なくとも1つをONにしてください" })
      return
    }

    const tMult = Math.max(2, parseInt(textMultiplier) || 3)
    const eMult = Math.max(2, parseInt(elemMultiplier) || 3)

    // カンマ区切りで分割・トリム・空文字除去
    const excludeList = excludeSelectors
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: runOverflowTest,
        args: [{ textEnabled, textMultiplier: tMult, elemEnabled, elemMultiplier: eMult, excludeList }],
      })
      setStatus({ type: "ok", msg: "実行しました" })
    } catch (e) {
      setStatus({ type: "error", msg: "このページでは実行できません" })
    }
    setTimeout(() => setStatus(null), 2500)
  }

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 pb-1">
        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">OT</span>
        </div>
        <span className="text-sm font-semibold tracking-tight">overflow-tester</span>
      </div>

      <Separator />

      {/* Text expansion */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Type size={13} className="text-muted-foreground" />
            <Label className="text-xs font-medium cursor-pointer" htmlFor="text-switch">
              テキスト膨張
            </Label>
          </div>
          <Switch
            id="text-switch"
            checked={textEnabled}
            onCheckedChange={setTextEnabled}
          />
        </div>
        <div className={`flex items-center gap-2 transition-opacity ${textEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
          <span className="text-xs text-muted-foreground w-8">倍率</span>
          <input
            type="number"
            min={2}
            max={20}
            value={textMultiplier}
            onChange={e => setTextMultiplier(e.target.value)}
            className="w-14 h-7 rounded-md border border-input bg-background px-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">倍</span>
        </div>
      </div>

      <Separator />

      {/* Element repeat */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <LayoutList size={13} className="text-muted-foreground" />
            <Label className="text-xs font-medium cursor-pointer" htmlFor="elem-switch">
              要素複製
            </Label>
          </div>
          <Switch
            id="elem-switch"
            checked={elemEnabled}
            onCheckedChange={setElemEnabled}
          />
        </div>
        <div className={`flex items-center gap-2 transition-opacity ${elemEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
          <span className="text-xs text-muted-foreground w-8">倍率</span>
          <input
            type="number"
            min={2}
            max={20}
            value={elemMultiplier}
            onChange={e => setElemMultiplier(e.target.value)}
            className="w-14 h-7 rounded-md border border-input bg-background px-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">倍</span>
        </div>
      </div>

      <Separator />

      {/* Exclude selectors */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Ban size={13} className="text-muted-foreground" />
          <Label className="text-xs font-medium">除外セレクタ</Label>
        </div>
        <textarea
          value={excludeSelectors}
          onChange={e => setExcludeSelectors(e.target.value)}
          placeholder="header, #about, .parent-wrap"
          rows={2}
          className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
          style={{ minHeight: "3rem" }}
        />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          複数要素の指定は半角カンマ（,）で区切ります
        </p>
      </div>

      <Separator />

      {/* Run button */}
      <Button className="w-full h-8 text-xs gap-1.5" onClick={handleRun}>
        <Play size={12} />
        Run
      </Button>

      {/* Status */}
      {status && (
        <div className={`flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 ${
          status.type === "ok"
            ? "bg-green-50 text-green-700"
            : status.type === "warn"
            ? "bg-yellow-50 text-yellow-700"
            : "bg-red-50 text-red-700"
        }`}>
          <AlertCircle size={11} />
          {status.msg}
        </div>
      )}

      {/* Footer note */}
      <p className="text-[10px] text-muted-foreground text-center">
        元に戻すにはページをリロード
      </p>
    </div>
  )
}

// This function is injected into the page
function runOverflowTest({ textEnabled, textMultiplier, elemEnabled, elemMultiplier, excludeList }) {
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "HEAD", "TITLE", "META", "LINK"])

  // 除外対象のElementセットを構築
  const excludedEls = new Set()
  if (excludeList && excludeList.length > 0) {
    excludeList.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          excludedEls.add(el)
        })
      } catch (e) {
        // 無効なセレクタは無視
      }
    })
  }

  // 指定要素または祖先が除外対象かチェック
  function isExcluded(el) {
    let current = el
    while (current) {
      if (excludedEls.has(current)) return true
      current = current.parentElement
    }
    return false
  }

  // --- Text expansion ---
  if (textEnabled) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = node.textContent.trim()
        if (!text) return NodeFilter.FILTER_REJECT
        let el = node.parentElement
        while (el) {
          if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT
          el = el.parentElement
        }
        return NodeFilter.FILTER_ACCEPT
      }
    })
    const nodes = []
    let n
    while ((n = walker.nextNode())) nodes.push(n)
    nodes.forEach(node => {
      if (node.parentElement && isExcluded(node.parentElement)) return
      const original = node.textContent
      node.textContent = original.repeat(textMultiplier)
    })
  }

  // --- Element duplication (all groups) ---
  if (elemEnabled) {
    const allParents = document.body.querySelectorAll("*")
    const groups = []

    allParents.forEach(parent => {
      if (SKIP_TAGS.has(parent.tagName)) return
      if (isExcluded(parent)) return

      const children = Array.from(parent.children).filter(c => !isExcluded(c))
      if (children.length < 2) return

      let bestGroup = null
      let bestScore = 0

      // Group by tag
      const byTag = {}
      children.forEach(child => {
        const key = child.tagName
        if (!byTag[key]) byTag[key] = []
        byTag[key].push(child)
      })
      Object.values(byTag).forEach(group => {
        if (group.length >= 2 && group.length > bestScore) {
          bestScore = group.length
          bestGroup = group
        }
      })

      // Group by class (first class name)
      const byClass = {}
      children.forEach(child => {
        const cls = child.classList[0]
        if (!cls) return
        if (!byClass[cls]) byClass[cls] = []
        byClass[cls].push(child)
      })
      Object.values(byClass).forEach(group => {
        if (group.length >= 2 && group.length > bestScore) {
          bestScore = group.length
          bestGroup = group
        }
      })

      if (bestGroup) {
        groups.push({ parent, group: bestGroup })
      }
    })

    // DOMスナップショット後に一括クローン（処理中のDOM変更が再収集に影響しないよう）
    groups.forEach(({ parent, group }) => {
      const cloneCount = group.length * (elemMultiplier - 1)
      const template = group[group.length - 1]
      for (let i = 0; i < cloneCount; i++) {
        parent.appendChild(template.cloneNode(true))
      }
    })
  }
}
