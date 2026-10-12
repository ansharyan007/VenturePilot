import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Check, Lightbulb, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, PageHeader, Select, Textarea } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { createStartup } from '../services/firestoreService'
import { createStartupDraft } from '../data/demoStartup'

const categories = [
  'Laptop', 'Desktop', 'Smartphone', 'Tablet', 'Processor', 'GPU', 'Motherboard',
  'IoT', 'Wearable', 'Networking', 'Consumer electronics', 'Industrial electronics',
  'Semiconductor', 'Other',
]

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const indianUnionTerritories = [
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
]

const initial = {
  founderName: '',
  name: '',
  country: 'India',
  region: '',
  founderCount: 1,
  experience: '',
  budget: 1000000,
  idea: '',
  category: '',
  description: '',
  targetCustomer: '',
  targetMarket: '',
  geographicMarket: 'India',
  sellingPrice: '',
  launchDuration: '',
  launchUnit: 'months',
}

const normalizePositiveInteger = (value: string) => value.replace(/\D/g, '').replace(/^0+/, '')
const isPositiveInteger = (value: string) => /^[1-9]\d*$/.test(value) && Number.isFinite(Number(value))

export function CreateStartupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form, value: string | number) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const continueNext = (event: FormEvent) => {
    event.preventDefault()
    if (!form.founderName.trim() || !form.name.trim()) {
      setError('Founder name and startup name are required.')
      return
    }
    if (!form.region) {
      setError('Select a state or union territory.')
      return
    }
    setError('')
    setStep(2)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return

    if (!form.idea.trim() || !form.targetCustomer.trim() || !form.category) {
      setError('Startup idea, product category, and target customer are required.')
      return
    }
    if (!isPositiveInteger(form.sellingPrice)) {
      setError('Expected selling price must be a positive whole number.')
      return
    }
    if (!isPositiveInteger(form.launchDuration)) {
      setError('Launch duration must be a positive whole number.')
      return
    }

    const sellingPrice = Number(form.sellingPrice)
    const launchDuration = Number(form.launchDuration)
    const launchUnit = launchDuration === 1 ? form.launchUnit.slice(0, -1) : form.launchUnit

    setLoading(true)
    setError('')
    try {
      const startupId = await createStartup(user.uid, createStartupDraft({
        founderName: form.founderName,
        name: form.name,
        country: form.country,
        region: form.region,
        founderCount: form.founderCount,
        experience: form.experience,
        budget: form.budget,
        idea: form.idea,
        category: form.category,
        description: form.description,
        targetCustomer: form.targetCustomer,
        targetMarket: form.targetMarket,
        geographicMarket: form.geographicMarket,
        sellingPrice,
        launchTimeline: `${launchDuration} ${launchUnit}`,
      }))
      navigate(`/startup/${startupId}?generate=1`)
    } catch {
      setError('Could not save your startup. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return <div className="mx-auto max-w-4xl">
    <PageHeader eyebrow="New venture" title="Create your startup" description="Give BuildMyIdea enough context to build a useful first planning workspace." />

    <div className="mb-7 flex items-center">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${step >= 1 ? 'bg-brand-600 text-white' : 'bg-slate-200'}`}>
          {step > 1 ? <Check className="h-4 w-4" /> : 1}
        </span>
        <span className="hidden text-sm font-semibold sm:block">Founder</span>
      </div>
      <div className="mx-4 h-px flex-1 bg-slate-200">
        <div className={`h-full bg-brand-500 transition-all ${step === 2 ? 'w-full' : 'w-0'}`} />
      </div>
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${step >= 2 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>
        <span className="hidden text-sm font-semibold sm:block">Startup idea</span>
      </div>
    </div>

    <div className="card p-5 sm:p-8">
      {step === 1 ? <form onSubmit={continueNext}>
        <div className="mb-7 flex items-start gap-4">
          <span className="rounded-xl bg-brand-50 p-3"><UserRound className="h-5 w-5 text-brand-700" /></span>
          <div><h2 className="text-xl font-semibold">Founder context</h2><p className="mt-1 text-sm text-slate-500">This helps calibrate capital and execution assumptions.</p></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Founder name" value={form.founderName} onChange={(event) => set('founderName', event.target.value)} required />
          <Field label="Startup name" value={form.name} onChange={(event) => set('name', event.target.value)} required />
          <Field label="Country" value={form.country} onChange={(event) => set('country', event.target.value)} />
          <Select label="State / region" value={form.region} onChange={(event) => set('region', event.target.value)} required>
            <option value="" disabled>Select a state or union territory</option>
            <optgroup label="States">{indianStates.map((state) => <option key={state} value={state}>{state}</option>)}</optgroup>
            <optgroup label="Union territories">{indianUnionTerritories.map((territory) => <option key={territory} value={territory}>{territory}</option>)}</optgroup>
          </Select>
          <Field label="Number of founders" type="number" min="1" value={form.founderCount} onChange={(event) => set('founderCount', +event.target.value)} />
          <Field label="Available budget (₹)" type="number" min="0" value={form.budget} onChange={(event) => set('budget', +event.target.value)} />
          <div className="sm:col-span-2"><Textarea label="Relevant experience" value={form.experience} onChange={(event) => set('experience', event.target.value)} placeholder="Hardware, product, sales, manufacturing, domain experience…" /></div>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-7 flex justify-end"><Button>Continue <ArrowRight className="h-4 w-4" /></Button></div>
      </form> : <form onSubmit={submit}>
        <div className="mb-7 flex items-start gap-4">
          <span className="rounded-xl bg-amber-50 p-3"><Lightbulb className="h-5 w-5 text-amber-600" /></span>
          <div><h2 className="text-xl font-semibold">Describe the opportunity</h2><p className="mt-1 text-sm text-slate-500">Plain language is perfect. You can refine every field later.</p></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><Textarea label="Startup idea" value={form.idea} onChange={(event) => set('idea', event.target.value)} placeholder="Describe the product, the problem it solves, and who needs it…" required /></div>
          <Select label="Product category" value={form.category} onChange={(event) => set('category', event.target.value)} required><option value="" disabled>Select a product category</option>{categories.map((category) => <option key={category}>{category}</option>)}</Select>
          <Field
            label="Expected selling price (₹)"
            type="text"
            inputMode="numeric"
            pattern="[1-9][0-9]*"
            placeholder="Enter a whole number"
            value={form.sellingPrice}
            onChange={(event) => set('sellingPrice', normalizePositiveInteger(event.target.value))}
            hint="Positive whole numbers only; no maximum value is imposed."
            required
          />
          <div className="sm:col-span-2"><Textarea label="Product description" value={form.description} onChange={(event) => set('description', event.target.value)} /></div>
          <Field label="Target customer" value={form.targetCustomer} onChange={(event) => set('targetCustomer', event.target.value)} placeholder="Who specifically buys or uses this?" required />
          <Field label="Target market" value={form.targetMarket} onChange={(event) => set('targetMarket', event.target.value)} placeholder="Higher education" />
          <Field label="Geographic market" value={form.geographicMarket} onChange={(event) => set('geographicMarket', event.target.value)} />
          <div className="grid grid-cols-[1fr_140px] gap-3">
            <Field
              label="Expected launch time"
              type="text"
              inputMode="numeric"
              pattern="[1-9][0-9]*"
              placeholder="9"
              value={form.launchDuration}
              onChange={(event) => set('launchDuration', normalizePositiveInteger(event.target.value))}
              required
            />
            <Select label="Unit" value={form.launchUnit} onChange={(event) => set('launchUnit', event.target.value)}>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </Select>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-7 flex justify-between">
          <Button type="button" variant="secondary" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" />Back</Button>
          <Button loading={loading}>Create planning workspace <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </form>}
    </div>
  </div>
}
