import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Bot, CheckCircle2, CloudOff, LoaderCircle, Sparkles, UserRound } from 'lucide-react'
import { StartupPageState } from '../components/StartupPageState'
import { Badge, Button, PageHeader } from '../components/ui'
import type { ConversationMessage, Startup, StartupUpdate } from '../types'
import { aiService } from '../services/aiService'
import { useToast } from '../context/ToastContext'

const suggestions = [
  'Can I reduce my BOM cost?',
  'What team do I need before launch?',
  'What is my biggest risk?',
  'Change my selling price to ₹50,000',
]

type SaveState = 'idle' | 'saving' | 'error'

function Copilot({ startup, save }: { startup: Startup; save: (update: StartupUpdate) => Promise<void> }) {
  const [messages, setMessages] = useState(startup.conversations)
  const [input, setInput] = useState('')
  const [responding, setResponding] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const scrollArea = useRef<HTMLDivElement>(null)
  const respondingRef = useRef(false)
  const saveRevision = useRef(0)
  const { toast } = useToast()

  useEffect(() => {
    const container = scrollArea.current
    if (container) container.scrollTop = container.scrollHeight
  }, [messages, responding])

  const persistInBackground = (nextMessages: ConversationMessage[], update?: Partial<Startup>) => {
    const revision = ++saveRevision.current
    setSaveState('saving')

    const startupUpdate: StartupUpdate = { ...(update ?? {}), conversations: nextMessages }
    void save(startupUpdate)
      .then(() => {
        if (revision !== saveRevision.current) return
        setSaveState('idle')
        if (update) toast('Copilot updated structured startup data')
      })
      .catch(() => {
        if (revision !== saveRevision.current) return
        setSaveState('error')
        toast('The answer is visible, but it could not be saved. Check your connection.')
      })
  }

  const submit = async (event?: FormEvent, suggestedText?: string) => {
    event?.preventDefault()
    const content = (suggestedText ?? input).trim()
    if (!content || respondingRef.current) return

    respondingRef.current = true
    setResponding(true)

    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    const pendingMessages = [...messages, userMessage]
    setMessages(pendingMessages)
    setInput('')

    try {
      const result = await aiService.updateStartupFromConversation(startup, content)
      const assistantMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.reply,
        createdAt: new Date().toISOString(),
      }
      const completedMessages = [...pendingMessages, assistantMessage]

      // Render the answer first. Firestore persistence must never block the chat UI.
      setMessages(completedMessages)
      respondingRef.current = false
      setResponding(false)
      persistInBackground(completedMessages, result.update)
    } catch {
      const errorMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I could not complete that request. Your existing startup data was not changed.',
        createdAt: new Date().toISOString(),
      }
      const failedMessages = [...pendingMessages, errorMessage]
      setMessages(failedMessages)
      respondingRef.current = false
      setResponding(false)
      persistInBackground(failedMessages)
    }
  }

  return <div className="mx-auto max-w-5xl">
    <PageHeader
      eyebrow="AI workspace"
      title="Startup Copilot"
      description={`Ask about ${startup.name}. The copilot reasons over the structured data in this workspace.`}
      actions={<Badge tone="blue">Demo AI mode</Badge>}
    />

    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <div className="card flex h-[calc(100vh-230px)] min-h-[560px] flex-col overflow-hidden">
        <div ref={scrollArea} aria-live="polite" className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
          {messages.length === 0 && <div className="py-20 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50"><Bot className="h-6 w-6 text-brand-700" /></span>
            <h2 className="mt-4 font-semibold">Ask a planning question</h2>
            <p className="mt-2 text-sm text-slate-500">I can inspect product, BOM, finance, team, risks, and roadmap data.</p>
          </div>}

          {messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
            {message.role === 'assistant' && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-white"><Sparkles className="h-3.5 w-3.5" /></span>}
            <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{message.content}</div>
            {message.role === 'user' && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100"><UserRound className="h-4 w-4 text-brand-700" /></span>}
          </div>)}

          {responding && <div className="flex gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white"><Sparkles className="h-3.5 w-3.5" /></span>
            <span className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">Thinking over your startup data…</span>
          </div>}
        </div>

        <form onSubmit={(event) => void submit(event)} className="border-t bg-white p-4">
          <div className="mb-2 flex min-h-5 items-center justify-end text-xs text-slate-400" aria-live="polite">
            {saveState === 'saving' && <span className="flex items-center gap-1.5"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Saving conversation…</span>}
            {saveState === 'idle' && messages.length > 0 && <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />Saved</span>}
            {saveState === 'error' && <span className="flex items-center gap-1.5 text-red-600"><CloudOff className="h-3.5 w-3.5" />Not saved</span>}
          </div>
          <div className="flex gap-2 rounded-2xl border bg-slate-50 p-2 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              placeholder="Ask about your startup…"
              disabled={responding}
            />
            <Button className="h-10 w-10 !p-0" disabled={!input.trim() || responding} aria-label="Send">
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Try asking</p>
          <div className="mt-3 space-y-2">
            {suggestions.map((suggestion) => <button
              key={suggestion}
              type="button"
              disabled={responding}
              onClick={() => void submit(undefined, suggestion)}
              className="w-full rounded-xl border p-3 text-left text-xs leading-5 text-slate-600 hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >{suggestion}</button>)}
          </div>
        </div>
        <div className="rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">AI output is a planning aid. Review changes and verify high-impact decisions.</div>
      </aside>
    </div>
  </div>
}

export function CopilotPage() {
  return <StartupPageState>{(state) => <Copilot {...state} />}</StartupPageState>
}
