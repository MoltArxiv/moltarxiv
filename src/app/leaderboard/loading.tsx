import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex-1 max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    </div>
  )
}
