import type { InboxEmail } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Mail, AlertCircle, Tag, Archive, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailCardProps {
  email: InboxEmail
  onMarkRead: (id: string, read: boolean) => void
  onDelete: (id: string) => void
}

const CATEGORY_COLORS: Record<InboxEmail['importance'], string> = {
  critico: 'bg-rose-500',
  normal: 'bg-blue-500',
}

export function EmailCard({ email, onMarkRead, onDelete }: EmailCardProps) {
  return (
    <Card
      className={cn(
        'p-4 transition-all hover:bg-zinc-800/50 relative',
        !email.read && 'border-l-2 border-rose-500'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', CATEGORY_COLORS[email.importance])}>
          {email.importance === 'critico' ? (
            <AlertCircle className="h-4 w-4 text-zinc-900" />
          ) : (
            <Mail className="h-4 w-4 text-zinc-900" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {!email.read && (
                <span className="h-2 w-2 rounded-full bg-rose-400 flex-shrink-0" />
              )}
              <span className="font-medium text-sm text-zinc-300 truncate">{email.from}</span>
              <span className="text-xs text-zinc-500">
                {new Date(email.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {email.importance === 'critico' && (
              <span className="chip bg-rose-500/15 text-rose-300 border-rose-500/30 text-[10px]">
                Crítico
              </span>
            )}
          </div>

          {/* Subject */}
          <h3
            className={cn(
              'font-medium text-sm truncate',
              !email.read ? 'text-zinc-100' : 'text-zinc-300'
            )}
          >
            {email.subject}
          </h3>

          {/* Preview */}
          <p className="text-xs text-zinc-400 line-clamp-2">{email.preview}</p>

          {/* Tags */}
          {email.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {email.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="chip bg-zinc-800 text-zinc-400 text-[10px]">
                  <Tag className="h-2.5 w-2.5 mr-0.5" />
                  {tag}
                </span>
              ))}
              {email.tags.length > 3 && (
                <span className="chip bg-zinc-800 text-zinc-500 text-[10px]">
                  +{email.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-zinc-800">
        {!email.read ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkRead(email.id, true)}
            className="text-xs"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Marcar como lido
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkRead(email.id, false)}
            className="text-xs"
          >
            <Mail className="h-3.5 w-3.5 mr-1" />
            Marcar como não lido
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(email.id)}
          className="text-xs text-rose-400 hover:bg-rose-500/10"
        >
          <Archive className="h-3.5 w-3.5 mr-1" />
          Arquivar
        </Button>
      </div>
    </Card>
  )
}