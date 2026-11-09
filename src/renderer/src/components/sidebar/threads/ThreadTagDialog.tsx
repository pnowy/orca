import React, { useId, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { useAppStore } from '@/store'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/utils'
import {
  THREAD_TAG_COLORS,
  findThreadTagByName,
  normalizeThreadTagName,
  type ThreadTagDialogRequest
} from '../../../../../shared/threads/thread-tags'
import { createThreadTag, editThreadTag, nextThreadTagColor } from './thread-tag-actions'

function ThreadTagForm({
  request,
  onClose
}: {
  request: ThreadTagDialogRequest
  onClose: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const tags = useAppStore((s) => s.threadTags)
  const editing =
    request.mode === 'rename' ? tags.tags.find((tag) => tag.id === request.tagId) : undefined
  const [name, setName] = useState(editing?.name ?? '')
  const [color, setColor] = useState(() => editing?.color ?? nextThreadTagColor())
  const trimmed = normalizeThreadTagName(name)
  const clash = findThreadTagByName(tags, trimmed)
  // Creating with an existing name reuses that tag; renaming onto another tag's name is blocked.
  const blocked =
    !trimmed || (request.mode === 'rename' && clash !== undefined && clash.id !== editing?.id)

  const submit = (event: React.SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (blocked) {
      return
    }
    if (request.mode === 'rename') {
      editThreadTag(request.tagId, { name: trimmed, color })
    } else {
      createThreadTag(trimmed, color, request.assign)
    }
    onClose()
  }

  return (
    <DialogContent
      className="max-w-sm sm:max-w-sm"
      onOpenAutoFocus={(event) => {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {request.mode === 'rename'
            ? t('components.sidebar.threads.tags.renameTitle', 'Edit tag')
            : t('components.sidebar.threads.tags.createTitle', 'New tag')}
        </DialogTitle>
      </DialogHeader>
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1">
          <Label htmlFor={inputId}>{t('components.sidebar.threads.tags.name', 'Name')}</Label>
          <Input
            id={inputId}
            ref={inputRef}
            value={name}
            maxLength={40}
            placeholder={t('components.sidebar.threads.tags.placeholder', 'e.g. work')}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5" role="radiogroup">
          {THREAD_TAG_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              role="radio"
              aria-checked={swatch === color}
              aria-label={swatch}
              className={cn(
                'inline-flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-ring',
                swatch === color && 'ring-1 ring-ring ring-offset-1 ring-offset-background'
              )}
              style={{ backgroundColor: swatch }}
              onClick={() => setColor(swatch)}
            >
              {swatch === color ? <Check className="size-3 text-white" /> : null}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t('components.sidebar.threads.tags.cancel', 'Cancel')}
          </Button>
          <Button type="submit" size="sm" disabled={blocked}>
            {request.mode === 'rename'
              ? t('components.sidebar.threads.tags.save', 'Save')
              : t('components.sidebar.threads.tags.create', 'Create')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

/** Create/rename dialog driven by `threadTagDialog`, so menus can open it after they close. */
export function ThreadTagDialog(): React.JSX.Element {
  const request = useAppStore((s) => s.threadTagDialog)
  const setRequest = useAppStore((s) => s.setThreadTagDialog)
  const close = (): void => setRequest(null)
  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && close()}>
      {request ? (
        <ThreadTagForm
          key={request.mode === 'rename' ? request.tagId : 'create'}
          request={request}
          onClose={close}
        />
      ) : null}
    </Dialog>
  )
}
